BEGIN;

CREATE TABLE public.payroll_run_idempotency (
    company_id bigint NOT NULL,
    user_id bigint NOT NULL,
    key_hash character(64) NOT NULL,
    request_hash character(64) NOT NULL,
    response_status smallint,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_run_idempotency_pkey PRIMARY KEY (company_id, user_id, key_hash),
    CONSTRAINT payroll_run_idempotency_company_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT payroll_run_idempotency_user_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT payroll_run_idempotency_response_check CHECK (
        (response_status IS NULL AND response_body IS NULL)
        OR (response_status BETWEEN 100 AND 599 AND response_body IS NOT NULL)
    )
);

CREATE INDEX payroll_run_idempotency_created_at_idx
    ON public.payroll_run_idempotency USING btree (created_at);

COMMIT;