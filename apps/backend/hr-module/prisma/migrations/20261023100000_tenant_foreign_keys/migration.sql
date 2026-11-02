-- Database-enforced tenant isolation for relationships between company-owned
-- tables. Each child row may only reference a parent row of the same company.
--
-- Run scripts/check-tenant-integrity.mjs first: every count must be 0. If any
-- existing row violates a rule, this migration fails and rolls back as a whole;
-- no row is rewritten or deleted to make it pass.
--
-- The existing single-column foreign keys are kept unchanged. The composite
-- keys below are added alongside them, so delete behaviour is preserved
-- (payslips and salary structure components still cascade with their parent).

BEGIN;

-- 1. Composite keys on parent tables, required as foreign key targets.
CREATE UNIQUE INDEX shifts_id_company_id_key ON public.shifts USING btree (id, company_id);
CREATE UNIQUE INDEX leave_types_id_company_id_key ON public.leave_types USING btree (id, company_id);
CREATE UNIQUE INDEX salary_structures_id_company_id_key ON public.salary_structures USING btree (id, company_id);
CREATE UNIQUE INDEX salary_components_id_company_id_key ON public.salary_components USING btree (id, company_id);
CREATE UNIQUE INDEX payroll_runs_id_company_id_key ON public.payroll_runs USING btree (id, company_id);
CREATE UNIQUE INDEX biometric_devices_id_company_id_key ON public.biometric_devices USING btree (id, company_id);
CREATE UNIQUE INDEX employee_advances_id_company_id_key ON public.employee_advances USING btree (id, company_id);
CREATE UNIQUE INDEX employee_documents_id_company_id_key ON public.employee_documents USING btree (id, company_id);

-- 2. salary_structure_components had no company column. It is derived from the
--    owning structure; the composite keys below then require the component to
--    belong to the same company.
ALTER TABLE public.salary_structure_components ADD COLUMN company_id bigint;
UPDATE public.salary_structure_components sc
   SET company_id = s.company_id
  FROM public.salary_structures s
 WHERE s.id = sc.structure_id;
ALTER TABLE public.salary_structure_components ALTER COLUMN company_id SET NOT NULL;

-- 3. Same-company foreign keys.
ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT attendance_records_shift_company_fkey FOREIGN KEY (shift_id, company_id) REFERENCES public.shifts(id, company_id);

ALTER TABLE public.attendance_regularizations
    ADD CONSTRAINT attendance_regularizations_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id);

ALTER TABLE public.employee_advances
    ADD CONSTRAINT employee_advances_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id);

ALTER TABLE public.employee_document_events
    ADD CONSTRAINT employee_document_events_document_company_fkey FOREIGN KEY (document_id, company_id) REFERENCES public.employee_documents(id, company_id),
    ADD CONSTRAINT employee_document_events_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id);

ALTER TABLE public.employee_salary_assignments
    ADD CONSTRAINT employee_salary_assignments_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT employee_salary_assignments_structure_company_fkey FOREIGN KEY (structure_id, company_id) REFERENCES public.salary_structures(id, company_id);

ALTER TABLE public.leave_balances
    ADD CONSTRAINT leave_balances_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT leave_balances_leave_type_company_fkey FOREIGN KEY (leave_type_id, company_id) REFERENCES public.leave_types(id, company_id);

ALTER TABLE public.leave_requests
    ADD CONSTRAINT leave_requests_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT leave_requests_leave_type_company_fkey FOREIGN KEY (leave_type_id, company_id) REFERENCES public.leave_types(id, company_id);

ALTER TABLE public.payroll_advance_recoveries
    ADD CONSTRAINT payroll_advance_recoveries_advance_company_fkey FOREIGN KEY (advance_id, company_id) REFERENCES public.employee_advances(id, company_id),
    ADD CONSTRAINT payroll_advance_recoveries_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT payroll_advance_recoveries_run_company_fkey FOREIGN KEY (payroll_run_id, company_id) REFERENCES public.payroll_runs(id, company_id);

ALTER TABLE public.payslips
    ADD CONSTRAINT payslips_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT payslips_run_company_fkey FOREIGN KEY (payroll_run_id, company_id) REFERENCES public.payroll_runs(id, company_id) ON DELETE CASCADE;

ALTER TABLE public.raw_punches
    ADD CONSTRAINT raw_punches_device_company_fkey FOREIGN KEY (device_id, company_id) REFERENCES public.biometric_devices(id, company_id),
    ADD CONSTRAINT raw_punches_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id);

ALTER TABLE public.rosters
    ADD CONSTRAINT rosters_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
    ADD CONSTRAINT rosters_shift_company_fkey FOREIGN KEY (shift_id, company_id) REFERENCES public.shifts(id, company_id);

ALTER TABLE public.salary_structure_components
    ADD CONSTRAINT salary_structure_components_structure_company_fkey FOREIGN KEY (structure_id, company_id) REFERENCES public.salary_structures(id, company_id) ON DELETE CASCADE,
    ADD CONSTRAINT salary_structure_components_component_company_fkey FOREIGN KEY (component_id, company_id) REFERENCES public.salary_components(id, company_id);

ALTER TABLE public.approval_audit_log
    ADD CONSTRAINT approval_audit_log_employee_company_fkey FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id);

-- 4. A login linked to an employee, or granted approval delegation, must hold a
--    membership (of any status) in that same company.
ALTER TABLE public.employees
    ADD CONSTRAINT employees_membership_fkey FOREIGN KEY (company_id, user_id) REFERENCES public.company_memberships(company_id, user_id);

ALTER TABLE public.approval_delegates
    ADD CONSTRAINT approval_delegates_membership_fkey FOREIGN KEY (company_id, user_id) REFERENCES public.company_memberships(company_id, user_id);

COMMIT;
