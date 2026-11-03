-- Additive changes for explicit employee identity links, advance recovery
-- reservations, login throttling and re-runnable cancelled payroll months.
-- No existing column, row or table is removed. The only constraint replaced
-- is the payroll month uniqueness, which is narrowed to non-cancelled runs.

BEGIN;

-- 1. Explicit, verified link between a login (users) and an employee record.
ALTER TABLE public.employees ADD COLUMN user_id bigint;

ALTER TABLE public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX employees_company_id_user_id_key ON public.employees USING btree (company_id, user_id);

-- 2. Advance EMI recoveries reserved by draft payroll runs.
--    Reserved  = held by a Draft run (released again on cancel / reprocess)
--    Recovered = deducted from the advance balance when the run was finalized
--    Released  = the run was cancelled; kept for audit
CREATE TABLE public.payroll_advance_recoveries (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    company_id bigint NOT NULL,
    payroll_run_id bigint NOT NULL,
    advance_id bigint NOT NULL,
    employee_id bigint NOT NULL,
    amount numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'Reserved'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_advance_recoveries_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_advance_recoveries_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payroll_advance_recoveries_status_check CHECK (((status)::text = ANY ((ARRAY['Reserved'::character varying, 'Recovered'::character varying, 'Released'::character varying])::text[]))),
    CONSTRAINT payroll_advance_recoveries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT payroll_advance_recoveries_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id),
    CONSTRAINT payroll_advance_recoveries_advance_id_fkey FOREIGN KEY (advance_id) REFERENCES public.employee_advances(id),
    CONSTRAINT payroll_advance_recoveries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);

CREATE UNIQUE INDEX payroll_advance_recoveries_payroll_run_id_advance_id_key
    ON public.payroll_advance_recoveries USING btree (payroll_run_id, advance_id);

CREATE INDEX idx_advance_recoveries_advance_status
    ON public.payroll_advance_recoveries USING btree (advance_id, status);

-- 3. Login attempts for brute-force throttling. The identifier is a SHA-256
--    hash of the normalised email, so typed emails are not stored in clear.
CREATE TABLE public.login_attempts (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    identifier_hash character(64) NOT NULL,
    ip_address character varying(64),
    succeeded boolean NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_login_attempts_identifier_time ON public.login_attempts USING btree (identifier_hash, attempted_at);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts USING btree (ip_address, attempted_at);
CREATE INDEX idx_login_attempts_time ON public.login_attempts USING btree (attempted_at);

-- 4. One active (non-cancelled) payroll run per company and month. Cancelled
--    runs stay in the table for audit and no longer block a re-run. The new
--    index is created before the old constraint is dropped.
CREATE UNIQUE INDEX payroll_runs_active_period_key
    ON public.payroll_runs USING btree (company_id, pay_period_year, pay_period_month)
    WHERE ((status)::text <> 'Cancelled'::text);

ALTER TABLE public.payroll_runs
    DROP CONSTRAINT payroll_runs_company_id_pay_period_year_pay_period_month_key;

COMMIT;
