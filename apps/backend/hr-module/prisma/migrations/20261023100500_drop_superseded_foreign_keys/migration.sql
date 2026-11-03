-- Removes the single-column foreign keys superseded by the same-company keys
-- added in 20261023100000_tenant_foreign_keys. Every company_id column is
-- NOT NULL, so each composite key enforces everything the old key did (the
-- parent row must exist) plus the same-company rule. Delete behaviour is kept:
-- payslips_run_company_fkey and salary_structure_components_structure_company_fkey
-- cascade exactly as the keys they replace. No rows are changed.

BEGIN;

ALTER TABLE public.attendance_records
    DROP CONSTRAINT attendance_records_employee_id_fkey,
    DROP CONSTRAINT attendance_records_shift_id_fkey;

ALTER TABLE public.attendance_regularizations
    DROP CONSTRAINT attendance_regularizations_employee_id_fkey;

ALTER TABLE public.employee_advances
    DROP CONSTRAINT employee_advances_employee_id_fkey;

ALTER TABLE public.employee_document_events
    DROP CONSTRAINT employee_document_events_document_fkey;

ALTER TABLE public.employee_salary_assignments
    DROP CONSTRAINT employee_salary_assignments_employee_id_fkey,
    DROP CONSTRAINT employee_salary_assignments_structure_id_fkey;

ALTER TABLE public.leave_balances
    DROP CONSTRAINT leave_balances_employee_id_fkey,
    DROP CONSTRAINT leave_balances_leave_type_id_fkey;

ALTER TABLE public.leave_requests
    DROP CONSTRAINT leave_requests_employee_id_fkey,
    DROP CONSTRAINT leave_requests_leave_type_id_fkey;

ALTER TABLE public.payroll_advance_recoveries
    DROP CONSTRAINT payroll_advance_recoveries_advance_id_fkey,
    DROP CONSTRAINT payroll_advance_recoveries_employee_id_fkey,
    DROP CONSTRAINT payroll_advance_recoveries_payroll_run_id_fkey;

ALTER TABLE public.payslips
    DROP CONSTRAINT payslips_employee_id_fkey,
    DROP CONSTRAINT payslips_payroll_run_id_fkey;

ALTER TABLE public.raw_punches
    DROP CONSTRAINT raw_punches_device_id_fkey,
    DROP CONSTRAINT raw_punches_employee_id_fkey;

ALTER TABLE public.rosters
    DROP CONSTRAINT rosters_employee_id_fkey,
    DROP CONSTRAINT rosters_shift_id_fkey;

ALTER TABLE public.salary_structure_components
    DROP CONSTRAINT salary_structure_components_component_id_fkey,
    DROP CONSTRAINT salary_structure_components_structure_id_fkey;

COMMIT;
