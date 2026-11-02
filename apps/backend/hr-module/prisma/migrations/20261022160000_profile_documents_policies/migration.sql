-- Additive changes for the 360-degree employee profile, secure employee
-- documents, designation-department links, delegated approvals and the
-- company HR/payroll policy. Only new nullable columns, new tables and new
-- indexes are created; no existing column, row or constraint is changed.

BEGIN;

-- 1. Employee profile fields (all optional; entered by HR).
ALTER TABLE public.employees
    ADD COLUMN date_of_joining date,
    ADD COLUMN date_of_birth date,
    ADD COLUMN gender character varying(20),
    ADD COLUMN employment_type character varying(30),
    ADD COLUMN work_location character varying(200),
    ADD COLUMN reporting_manager_id bigint;

ALTER TABLE public.employees
    ADD CONSTRAINT employees_gender_check CHECK (gender IS NULL OR (gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Other'::character varying, 'Prefer not to say'::character varying])::text[])),
    ADD CONSTRAINT employees_employment_type_check CHECK (employment_type IS NULL OR (employment_type)::text = ANY ((ARRAY['Full-time'::character varying, 'Part-time'::character varying, 'Contract'::character varying, 'Intern'::character varying, 'Consultant'::character varying])::text[])),
    ADD CONSTRAINT employees_reporting_manager_not_self CHECK (reporting_manager_id IS NULL OR reporting_manager_id <> id);

-- Composite key so child tables can enforce same-company references.
CREATE UNIQUE INDEX employees_id_company_id_key ON public.employees USING btree (id, company_id);

ALTER TABLE public.employees
    ADD CONSTRAINT employees_reporting_manager_fkey FOREIGN KEY (reporting_manager_id, company_id) REFERENCES public.employees(id, company_id);

CREATE INDEX idx_employees_reporting_manager ON public.employees USING btree (reporting_manager_id);

-- 2. Addresses (one current and one permanent per employee).
CREATE TABLE public.employee_addresses (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    address_type character varying(20) NOT NULL,
    line1 character varying(200) NOT NULL,
    line2 character varying(200),
    city character varying(100) NOT NULL,
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_addresses_pkey PRIMARY KEY (id),
    CONSTRAINT employee_addresses_type_check CHECK (((address_type)::text = ANY ((ARRAY['Current'::character varying, 'Permanent'::character varying])::text[]))),
    CONSTRAINT employee_addresses_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX employee_addresses_employee_type_key ON public.employee_addresses USING btree (employee_id, address_type);

-- 3. Emergency contacts.
CREATE TABLE public.employee_emergency_contacts (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    name character varying(200) NOT NULL,
    relationship character varying(50) NOT NULL,
    phone character varying(30) NOT NULL,
    alternate_phone character varying(30),
    email character varying(255),
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_emergency_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT employee_emergency_contacts_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id) ON DELETE CASCADE
);
CREATE INDEX idx_emergency_contacts_employee ON public.employee_emergency_contacts USING btree (employee_id);

-- 4. Bank accounts used for salary credit.
CREATE TABLE public.employee_bank_accounts (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    account_holder_name character varying(200) NOT NULL,
    bank_name character varying(150) NOT NULL,
    branch character varying(150),
    account_number character varying(34) NOT NULL,
    ifsc_code character varying(11) NOT NULL,
    account_type character varying(20),
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_bank_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT employee_bank_accounts_type_check CHECK (account_type IS NULL OR (account_type)::text = ANY ((ARRAY['Savings'::character varying, 'Current'::character varying, 'Salary'::character varying])::text[])),
    CONSTRAINT employee_bank_accounts_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX employee_bank_accounts_employee_number_key ON public.employee_bank_accounts USING btree (employee_id, account_number);
CREATE UNIQUE INDEX employee_bank_accounts_one_primary_key ON public.employee_bank_accounts USING btree (employee_id) WHERE is_primary;

-- 5. Employment history: system events (recorded when HR changes department,
--    designation or status) and manual entries (earlier positions).
CREATE TABLE public.employee_employment_history (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    event_type character varying(30) NOT NULL,
    effective_date date NOT NULL,
    department character varying(150),
    designation character varying(150),
    previous_department character varying(150),
    previous_designation character varying(150),
    previous_status character varying(20),
    new_status character varying(20),
    organization character varying(200),
    notes text,
    source character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    recorded_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_employment_history_pkey PRIMARY KEY (id),
    CONSTRAINT employee_employment_history_event_check CHECK (((event_type)::text = ANY ((ARRAY['Joined'::character varying, 'Promotion'::character varying, 'Transfer'::character varying, 'Role Change'::character varying, 'Status Change'::character varying, 'Previous Employment'::character varying, 'Other'::character varying])::text[]))),
    CONSTRAINT employee_employment_history_source_check CHECK (((source)::text = ANY ((ARRAY['system'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT employee_employment_history_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id) ON DELETE CASCADE,
    CONSTRAINT employee_employment_history_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id)
);
CREATE INDEX idx_employment_history_employee ON public.employee_employment_history USING btree (employee_id, effective_date);

-- 6. Employee documents. Files live in private server storage addressed by
--    storage_key; rows are soft-deleted so the audit trail survives.
CREATE TABLE public.employee_documents (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    category character varying(40) NOT NULL,
    title character varying(200) NOT NULL,
    original_filename character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes integer NOT NULL,
    sha256 character(64) NOT NULL,
    storage_key character varying(200) NOT NULL,
    verification_status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    verification_note text,
    verified_by bigint,
    verified_at timestamp with time zone,
    uploaded_by bigint NOT NULL,
    deleted_by bigint,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_documents_pkey PRIMARY KEY (id),
    CONSTRAINT employee_documents_category_check CHECK (((category)::text = ANY ((ARRAY['Identity'::character varying, 'Address Proof'::character varying, 'Education'::character varying, 'Employment'::character varying, 'Payroll'::character varying, 'Photo'::character varying, 'Other'::character varying])::text[]))),
    CONSTRAINT employee_documents_status_check CHECK (((verification_status)::text = ANY ((ARRAY['Pending'::character varying, 'Verified'::character varying, 'Rejected'::character varying])::text[]))),
    CONSTRAINT employee_documents_size_check CHECK ((size_bytes > 0)),
    CONSTRAINT employee_documents_employee_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    CONSTRAINT employee_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id),
    CONSTRAINT employee_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id),
    CONSTRAINT employee_documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id)
);
CREATE UNIQUE INDEX employee_documents_storage_key_key ON public.employee_documents USING btree (storage_key);
CREATE INDEX idx_employee_documents_employee ON public.employee_documents USING btree (company_id, employee_id) WHERE deleted_at IS NULL;

CREATE TABLE public.employee_document_events (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    document_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    action character varying(20) NOT NULL,
    actor_user_id bigint NOT NULL,
    ip_address character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_document_events_pkey PRIMARY KEY (id),
    CONSTRAINT employee_document_events_action_check CHECK (((action)::text = ANY ((ARRAY['upload'::character varying, 'view'::character varying, 'download'::character varying, 'verify'::character varying, 'reject'::character varying, 'delete'::character varying])::text[]))),
    CONSTRAINT employee_document_events_document_fkey FOREIGN KEY (document_id) REFERENCES public.employee_documents(id),
    CONSTRAINT employee_document_events_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id)
);
CREATE INDEX idx_document_events_document ON public.employee_document_events USING btree (document_id, created_at);

-- 7. Departments a designation is used in (same company enforced by FK).
CREATE TABLE public.designation_departments (
    company_id bigint NOT NULL,
    designation_id bigint NOT NULL,
    department_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT designation_departments_pkey PRIMARY KEY (designation_id, department_id),
    CONSTRAINT designation_departments_designation_fkey FOREIGN KEY (designation_id, company_id) REFERENCES public.designations(id, company_id) ON DELETE CASCADE,
    CONSTRAINT designation_departments_department_fkey FOREIGN KEY (department_id, company_id) REFERENCES public.departments(id, company_id) ON DELETE CASCADE
);
CREATE INDEX idx_designation_departments_department ON public.designation_departments USING btree (department_id);

-- 8. Delegated approvers: members a company admin authorises to review
--    leave, regularization and advance requests raised by the company's
--    admins/HR managers. Grants are revoked, never deleted.
CREATE TABLE public.approval_delegates (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    user_id bigint NOT NULL,
    granted_by bigint NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text,
    revoked_by bigint,
    revoked_at timestamp with time zone,
    CONSTRAINT approval_delegates_pkey PRIMARY KEY (id),
    CONSTRAINT approval_delegates_not_self_granted CHECK (user_id <> granted_by),
    CONSTRAINT approval_delegates_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT approval_delegates_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT approval_delegates_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id),
    CONSTRAINT approval_delegates_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id)
);
CREATE UNIQUE INDEX approval_delegates_active_key ON public.approval_delegates USING btree (company_id, user_id) WHERE revoked_at IS NULL;

CREATE TABLE public.approval_audit_log (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    entity_type character varying(30) NOT NULL,
    entity_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    action character varying(20) NOT NULL,
    actor_user_id bigint NOT NULL,
    authority character varying(20) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT approval_audit_log_entity_check CHECK (((entity_type)::text = ANY ((ARRAY['leave_request'::character varying, 'regularization'::character varying, 'advance'::character varying])::text[]))),
    CONSTRAINT approval_audit_log_authority_check CHECK (((authority)::text = ANY ((ARRAY['manager'::character varying, 'delegate'::character varying])::text[]))),
    CONSTRAINT approval_audit_log_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT approval_audit_log_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id)
);
CREATE INDEX idx_approval_audit_entity ON public.approval_audit_log USING btree (company_id, entity_type, entity_id);

-- 9. Company HR/payroll policy. Every rule starts unset (NULL); payroll can
--    only be finalized after an admin approves a complete policy. The
--    approved values are kept in approved_snapshot, so later draft edits do
--    not change payroll until they are approved again.
CREATE TABLE public.company_policies (
    company_id bigint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'Draft'::character varying NOT NULL,
    lop_mode character varying(30),
    lop_day_basis character varying(20),
    lop_fixed_days smallint,
    net_pay_rounding character varying(20),
    pf_treatment character varying(30),
    esic_treatment character varying(30),
    professional_tax_treatment character varying(30),
    tds_treatment character varying(30),
    overtime_pay_treatment character varying(30),
    leave_day_counting character varying(40),
    night_shift_window_minutes smallint,
    notes text,
    approved_snapshot jsonb,
    updated_by bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by bigint,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT company_policies_pkey PRIMARY KEY (company_id),
    CONSTRAINT company_policies_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Approved'::character varying])::text[]))),
    CONSTRAINT company_policies_lop_mode_check CHECK (lop_mode IS NULL OR (lop_mode)::text = ANY ((ARRAY['none'::character varying, 'unpaid_leave'::character varying, 'unpaid_leave_and_absence'::character varying])::text[])),
    CONSTRAINT company_policies_lop_basis_check CHECK (lop_day_basis IS NULL OR (lop_day_basis)::text = ANY ((ARRAY['calendar_days'::character varying, 'fixed_days'::character varying])::text[])),
    CONSTRAINT company_policies_lop_fixed_days_check CHECK (lop_fixed_days IS NULL OR (lop_fixed_days >= 1 AND lop_fixed_days <= 31)),
    CONSTRAINT company_policies_rounding_check CHECK (net_pay_rounding IS NULL OR (net_pay_rounding)::text = ANY ((ARRAY['none'::character varying, 'nearest_rupee'::character varying, 'round_up_rupee'::character varying])::text[])),
    CONSTRAINT company_policies_statutory_check CHECK (
        (pf_treatment IS NULL OR (pf_treatment)::text = ANY ((ARRAY['configured_components'::character varying, 'not_applicable'::character varying])::text[])) AND
        (esic_treatment IS NULL OR (esic_treatment)::text = ANY ((ARRAY['configured_components'::character varying, 'not_applicable'::character varying])::text[])) AND
        (professional_tax_treatment IS NULL OR (professional_tax_treatment)::text = ANY ((ARRAY['configured_components'::character varying, 'not_applicable'::character varying])::text[])) AND
        (tds_treatment IS NULL OR (tds_treatment)::text = ANY ((ARRAY['configured_components'::character varying, 'not_applicable'::character varying])::text[]))),
    CONSTRAINT company_policies_overtime_check CHECK (overtime_pay_treatment IS NULL OR (overtime_pay_treatment)::text = ANY ((ARRAY['not_paid'::character varying, 'configured_components'::character varying])::text[])),
    CONSTRAINT company_policies_leave_counting_check CHECK (leave_day_counting IS NULL OR (leave_day_counting)::text = ANY ((ARRAY['calendar_days'::character varying, 'exclude_weekly_offs_and_holidays'::character varying])::text[])),
    CONSTRAINT company_policies_night_window_check CHECK (night_shift_window_minutes IS NULL OR (night_shift_window_minutes >= 0 AND night_shift_window_minutes <= 720)),
    CONSTRAINT company_policies_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT company_policies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id),
    CONSTRAINT company_policies_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id)
);

-- 10. Which approved policy version a payroll run was processed with.
ALTER TABLE public.payroll_runs
    ADD COLUMN policy_version integer,
    ADD COLUMN is_provisional boolean DEFAULT false NOT NULL;

COMMIT;
