-- Additive changes only: no rows are deleted or rewritten.

-- Advance requests may state a repayment period (1-3 months) instead of an amount;
-- the approver then sets the amount. Approved/active/closed advances must carry an amount.
ALTER TABLE public.employee_advances
    ADD COLUMN requested_months SMALLINT,
    ALTER COLUMN amount DROP NOT NULL,
    ALTER COLUMN balance DROP NOT NULL;

ALTER TABLE public.employee_advances
    ADD CONSTRAINT employee_advances_requested_months_check
        CHECK (requested_months IS NULL OR requested_months BETWEEN 1 AND 3),
    ADD CONSTRAINT employee_advances_amount_required_check
        CHECK (status IN ('Pending', 'Rejected') OR (amount IS NOT NULL AND balance IS NOT NULL)),
    ADD CONSTRAINT employee_advances_amount_or_months_check
        CHECK (amount IS NOT NULL OR requested_months IS NOT NULL);

-- Attendance statuses requested by HR: On Duty and Compensation (comp-off).
ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_status_check;
ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_status_check CHECK (((status)::text = ANY ((ARRAY[
        'Present'::character varying, 'Absent'::character varying, 'Late'::character varying,
        'Half Day'::character varying, 'On Leave'::character varying, 'Holiday'::character varying,
        'Missing Punch'::character varying, 'On Duty'::character varying, 'Compensation'::character varying
    ])::text[])));

-- Salary structures may be scoped to a department and designation from master data.
ALTER TABLE public.salary_structures
    ADD COLUMN department_id BIGINT,
    ADD COLUMN designation_id BIGINT;

ALTER TABLE public.salary_structures
    ADD CONSTRAINT salary_structures_department_company_fkey
        FOREIGN KEY (department_id, company_id) REFERENCES public.departments(id, company_id),
    ADD CONSTRAINT salary_structures_designation_company_fkey
        FOREIGN KEY (designation_id, company_id) REFERENCES public.designations(id, company_id);

CREATE INDEX idx_salary_structures_department ON public.salary_structures (department_id);
CREATE INDEX idx_salary_structures_designation ON public.salary_structures (designation_id);
