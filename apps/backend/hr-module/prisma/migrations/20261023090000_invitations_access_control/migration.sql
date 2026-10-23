-- Company-bound invitations, membership audit trail and registration rate
-- limiting. Only new tables and indexes are created; no existing column, row
-- or constraint is changed.

BEGIN;

-- 1. Invitations. The token itself is never stored: only its SHA-256 hash.
--    Every invitation belongs to exactly one company, and acceptance can only
--    create a membership in that company.
CREATE TABLE public.company_invitations (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(30) NOT NULL,
    employee_id bigint,
    token_hash character(64) NOT NULL,
    invited_by bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by bigint,
    revoked_at timestamp with time zone,
    revoked_by bigint,
    CONSTRAINT company_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT company_invitations_role_check CHECK (((role)::text = ANY ((ARRAY['company_admin'::character varying, 'hr_manager'::character varying, 'employee'::character varying])::text[]))),
    CONSTRAINT company_invitations_email_check CHECK ((email)::text = lower((email)::text) AND position('@' in email) > 1),
    CONSTRAINT company_invitations_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT company_invitations_single_outcome_check CHECK (accepted_at IS NULL OR revoked_at IS NULL),
    CONSTRAINT company_invitations_accepted_check CHECK ((accepted_at IS NULL) = (accepted_by IS NULL)),
    CONSTRAINT company_invitations_revoked_check CHECK ((revoked_at IS NULL) = (revoked_by IS NULL)),
    CONSTRAINT company_invitations_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT company_invitations_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    CONSTRAINT company_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
    CONSTRAINT company_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id),
    CONSTRAINT company_invitations_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id)
);
CREATE UNIQUE INDEX company_invitations_token_hash_key ON public.company_invitations USING btree (token_hash);
CREATE UNIQUE INDEX company_invitations_id_company_id_key ON public.company_invitations USING btree (id, company_id);
-- At most one open invitation per email and per employee record in a company.
CREATE UNIQUE INDEX company_invitations_open_email_key ON public.company_invitations USING btree (company_id, email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX company_invitations_open_employee_key ON public.company_invitations USING btree (employee_id)
    WHERE employee_id IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_company_invitations_company ON public.company_invitations USING btree (company_id, created_at);

-- 2. Audit trail of access changes within a company.
CREATE TABLE public.membership_events (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    user_id bigint,
    invitation_id bigint,
    action character varying(30) NOT NULL,
    previous_role character varying(30),
    new_role character varying(30),
    actor_user_id bigint NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_events_pkey PRIMARY KEY (id),
    CONSTRAINT membership_events_action_check CHECK (((action)::text = ANY ((ARRAY['invited'::character varying, 'invitation_revoked'::character varying, 'invitation_accepted'::character varying, 'role_changed'::character varying, 'suspended'::character varying, 'reactivated'::character varying])::text[]))),
    CONSTRAINT membership_events_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT membership_events_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT membership_events_invitation_fkey FOREIGN KEY (invitation_id, company_id) REFERENCES public.company_invitations(id, company_id),
    CONSTRAINT membership_events_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id)
);
CREATE INDEX idx_membership_events_company ON public.membership_events USING btree (company_id, created_at);

-- 3. Company self-registration attempts, for database-backed rate limiting
--    shared by every app instance. Emails are stored only as SHA-256 hashes.
CREATE TABLE public.registration_attempts (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    email_hash character(64) NOT NULL,
    ip_address character varying(64),
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registration_attempts_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_registration_attempts_email_time ON public.registration_attempts USING btree (email_hash, attempted_at);
CREATE INDEX idx_registration_attempts_ip_time ON public.registration_attempts USING btree (ip_address, attempted_at);
CREATE INDEX idx_registration_attempts_time ON public.registration_attempts USING btree (attempted_at);

COMMIT;
