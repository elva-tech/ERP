import { pool } from "@/lib/db";

/**
 * Wall-clock times entered in the UI (HH:MM) are interpreted in this zone.
 * Override with HRMS_TIMEZONE (IANA name) if a company operates elsewhere.
 */
export const TIMEZONE = process.env.HRMS_TIMEZONE || "Asia/Kolkata";

export const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "On Leave",
  "Holiday",
  "Missing Punch",
  "On Duty",
  "Compensation",
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = TIME_PATTERN.exec(value.trim().slice(0, 5));
  return match ? value.trim().slice(0, 5) : null;
}

function minutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Derives working/overtime minutes and a default status from punches and the
 * company-configured shift. Rules (based solely on shift settings):
 * - Check-out earlier than check-in is treated as the next day (night shift).
 * - Late when check-in is after shift start + grace minutes.
 * - Overtime = worked minutes beyond the shift's scheduled span, counted only
 *   when it reaches the shift's overtime threshold.
 * - Check-in without check-out => Missing Punch.
 */
export function deriveAttendance({ checkIn, checkOut, shift }) {
  if (!checkIn) return { status: "Absent", workingMinutes: null, overtimeMinutes: 0 };

  let workingMinutes = null;
  if (checkOut) {
    workingMinutes = minutes(checkOut) - minutes(checkIn);
    if (workingMinutes <= 0) workingMinutes += 24 * 60;
  }

  let late = false;
  let overtimeMinutes = 0;
  if (shift) {
    const start = minutes(shift.start_time.slice(0, 5));
    let span = minutes(shift.end_time.slice(0, 5)) - start;
    if (span <= 0) span += 24 * 60;

    let delay = minutes(checkIn) - start;
    if (delay < -12 * 60) delay += 24 * 60;
    late = delay > (shift.grace_minutes ?? 0);

    if (workingMinutes !== null) {
      const extra = workingMinutes - span;
      if (extra > 0 && extra >= (shift.overtime_threshold ?? 0)) overtimeMinutes = extra;
    }
  }

  const status = !checkOut ? "Missing Punch" : late ? "Late" : "Present";
  return { status, workingMinutes, overtimeMinutes };
}

/** Explicit shiftId, otherwise the roster effective on the date, otherwise none. */
export async function resolveShift(client, { companyId, employeeId, date, shiftId }) {
  if (shiftId) {
    const result = await client.query(
      `SELECT id, name, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time,
              grace_minutes, overtime_threshold
       FROM shifts WHERE id = $1 AND company_id = $2`,
      [shiftId, companyId]
    );
    return result.rows[0] ? result.rows[0] : undefined;
  }
  const result = await client.query(
    `SELECT s.id, s.name, to_char(s.start_time, 'HH24:MI') AS start_time, to_char(s.end_time, 'HH24:MI') AS end_time,
            s.grace_minutes, s.overtime_threshold
     FROM rosters r JOIN shifts s ON s.id = r.shift_id
     WHERE r.company_id = $1 AND r.employee_id = $2
       AND r.effective_from <= $3 AND (r.effective_to IS NULL OR r.effective_to >= $3)
     ORDER BY r.effective_from DESC, r.id DESC
     LIMIT 1`,
    [companyId, employeeId, date]
  );
  return result.rows[0] ?? null;
}

/** SQL expression converting a date + HH:MM parameter pair to timestamptz. */
export function localTimestamp(dateParam, timeParam, tzParam) {
  return `CASE WHEN ${timeParam}::text IS NULL THEN NULL
    ELSE ((${dateParam}::date + ${timeParam}::time) AT TIME ZONE ${tzParam}::text) END`;
}

export const ATTENDANCE_SELECT = `SELECT
  ar.id, ar.employee_id, e.name AS employee_name, e.employee_code, e.department, e.designation, e.work_location,
  to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
  to_char(ar.check_in AT TIME ZONE $TZ, 'HH24:MI') AS check_in_time,
  to_char(ar.check_out AT TIME ZONE $TZ, 'HH24:MI') AS check_out_time,
  ar.check_in, ar.check_out, ar.status, ar.working_minutes, ar.overtime_minutes,
  ar.overtime_status, ar.overtime_reason, ar.overtime_review_note, ar.overtime_reviewed_at,
  reviewer.full_name AS overtime_reviewed_by_name,
  ar.is_regularized, ar.shift_id, s.name AS shift_name,
  to_char(s.start_time, 'HH24:MI') AS shift_start, to_char(s.end_time, 'HH24:MI') AS shift_end,
  s.overtime_threshold, ar.updated_at
  FROM attendance_records ar
  JOIN employees e ON e.id = ar.employee_id
  LEFT JOIN shifts s ON s.id = ar.shift_id
  LEFT JOIN users reviewer ON reviewer.id = ar.overtime_reviewed_by`;

export const REGULARIZATION_SELECT = `SELECT
  r.id, r.employee_id, e.name AS employee_name, e.employee_code, e.department,
  to_char(r.attendance_date, 'YYYY-MM-DD') AS attendance_date,
  to_char(r.requested_check_in AT TIME ZONE $TZ, 'HH24:MI') AS requested_check_in_time,
  to_char(r.requested_check_out AT TIME ZONE $TZ, 'HH24:MI') AS requested_check_out_time,
  r.reason, r.status, r.review_note, r.reviewed_at, u.full_name AS reviewed_by_name,
  r.created_at, r.updated_at
  FROM attendance_regularizations r
  JOIN employees e ON e.id = r.employee_id
  LEFT JOIN users u ON u.id = r.reviewed_by`;

/**
 * Inserts or updates the attendance record for one employee/day inside the
 * given client's transaction. Returns the record id.
 */
export async function upsertAttendance(
  client,
  {
    companyId,
    employeeId,
    date,
    checkIn,
    checkOut,
    status,
    shiftId,
    regularized = false,
    checkInDate = null,
    checkOutDate = null,
  }
) {
  const shift = await resolveShift(client, { companyId, employeeId, date, shiftId });
  if (shift === undefined) return { error: "Shift not found in this company." };

  const derived = deriveAttendance({ checkIn, checkOut, shift });
  const finalStatus = status || derived.status;

  // Explicit punch dates (night-shift pairing) win; otherwise a check-out at or
  // before the check-in time is taken to be on the next day.
  const result = await client.query(
    `INSERT INTO attendance_records
       (company_id, employee_id, shift_id, attendance_date, check_in, check_out, status,
        working_minutes, overtime_minutes, is_regularized, overtime_status)
     VALUES ($1, $2, $3, $4::date,
       ${localTimestamp("COALESCE($12::date, $4::date)", "$5", "$11")},
       CASE WHEN $13::date IS NOT NULL THEN ${localTimestamp("$13", "$6", "$11")}
         ELSE ${localTimestamp("COALESCE($12::date, $4::date)", "$6", "$11")}
           + CASE WHEN $6::time <= $5::time THEN INTERVAL '1 day' ELSE INTERVAL '0' END END,
       $7, $8, $9, $10, CASE WHEN COALESCE($9, 0) > 0 THEN 'Pending' ELSE NULL END)
     ON CONFLICT (company_id, employee_id, attendance_date) DO UPDATE SET
       shift_id = EXCLUDED.shift_id, check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out,
       status = EXCLUDED.status, working_minutes = EXCLUDED.working_minutes,
       overtime_minutes = EXCLUDED.overtime_minutes,
       is_regularized = attendance_records.is_regularized OR EXCLUDED.is_regularized,
       overtime_status = CASE
         WHEN COALESCE(EXCLUDED.overtime_minutes, 0) = 0 THEN NULL
         WHEN attendance_records.overtime_minutes IS NOT DISTINCT FROM EXCLUDED.overtime_minutes
           THEN COALESCE(attendance_records.overtime_status, 'Pending')
         ELSE 'Pending'
       END,
       overtime_reviewed_by = CASE
         WHEN COALESCE(EXCLUDED.overtime_minutes, 0) > 0
           AND attendance_records.overtime_minutes IS NOT DISTINCT FROM EXCLUDED.overtime_minutes
           THEN attendance_records.overtime_reviewed_by
         ELSE NULL
       END,
       overtime_reviewed_at = CASE
         WHEN COALESCE(EXCLUDED.overtime_minutes, 0) > 0
           AND attendance_records.overtime_minutes IS NOT DISTINCT FROM EXCLUDED.overtime_minutes
           THEN attendance_records.overtime_reviewed_at
         ELSE NULL
       END,
       overtime_review_note = CASE
         WHEN COALESCE(EXCLUDED.overtime_minutes, 0) > 0
           AND attendance_records.overtime_minutes IS NOT DISTINCT FROM EXCLUDED.overtime_minutes
           THEN attendance_records.overtime_review_note
         ELSE NULL
       END,
       updated_at = NOW()
     RETURNING id`,
    [
      companyId,
      employeeId,
      shift?.id ?? null,
      date,
      checkIn,
      checkOut,
      finalStatus,
      derived.workingMinutes,
      derived.overtimeMinutes,
      regularized,
      TIMEZONE,
      checkInDate,
      checkOutDate,
    ]
  );
  return { id: result.rows[0].id };
}

export async function readAttendance(id) {
  const result = await pool.query(
    `${ATTENDANCE_SELECT.replaceAll("$TZ", "$2::text")} WHERE ar.id = $1`,
    [id, TIMEZONE]
  );
  return result.rows[0];
}
