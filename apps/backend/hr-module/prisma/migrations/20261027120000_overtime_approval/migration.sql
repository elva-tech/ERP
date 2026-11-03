-- Additive: store an approval decision on attendance days that already have overtime minutes.

ALTER TABLE public.attendance_records
    ADD COLUMN overtime_status character varying(20),
    ADD COLUMN overtime_reason text,
    ADD COLUMN overtime_review_note text,
    ADD COLUMN overtime_reviewed_by bigint,
    ADD COLUMN overtime_reviewed_at timestamp with time zone;

ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_overtime_status_check
        CHECK (overtime_status IS NULL OR (overtime_status)::text = ANY (ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying]::text[])),
    ADD CONSTRAINT attendance_records_overtime_reviewer_fkey
        FOREIGN KEY (overtime_reviewed_by) REFERENCES public.users(id);

UPDATE public.attendance_records
SET overtime_status = 'Pending'
WHERE COALESCE(overtime_minutes, 0) > 0
  AND overtime_status IS NULL;

ALTER TABLE public.approval_audit_log DROP CONSTRAINT approval_audit_log_entity_check;
ALTER TABLE public.approval_audit_log
    ADD CONSTRAINT approval_audit_log_entity_check CHECK (((entity_type)::text = ANY ((ARRAY[
        'leave_request'::character varying,
        'regularization'::character varying,
        'advance'::character varying,
        'overtime'::character varying
    ])::text[])));
