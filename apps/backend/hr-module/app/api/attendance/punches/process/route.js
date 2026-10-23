
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  isValidDate,
  ok,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { TIMEZONE, resolveShift, upsertAttendance } from "@/lib/attendance";
import { isNightShift, pairPunches, validateNightWindow } from "@/lib/rules/punch-pairing.mjs";
import { approvedPolicy } from "@/lib/policy";

/**
 * POST /api/attendance/punches/process  { companyId, date }  (managers)
 * Builds attendance for the local date from matched raw punches: the first
 * punch is check-in, the last (if different) is check-out. Records that were
 * regularized are left unchanged.
 * Night shifts (end at or before start) are paired across midnight only when
 * the approved company policy sets a night-shift punch window; otherwise
 * punches are grouped by calendar date and such shifts are reported.
 */
export async function POST(request) {
  await connection();

  let client;
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;

    const access = await requireCompanyAccess(request, {
      companyId: parsed.body.companyId ?? "",
      roles: MANAGER_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const date = trimmed(parsed.body.date);
    if (!isValidDate(date)) return fail(400, "Enter a valid date (YYYY-MM-DD).");

    const policy = await approvedPolicy(access.companyId);
    const nightWindow = policy?.night_shift_window_minutes ?? null;

    client = await pool.connect();
    await client.query("BEGIN");

    // Punches from the previous day to the day after, in local wall-clock time.
    const punches = await client.query(
      `SELECT p.employee_id, to_char(p.punch_time AT TIME ZONE $3::text, 'YYYY-MM-DD HH24:MI') AS local
       FROM raw_punches p
       JOIN employees e ON e.id = p.employee_id AND e.company_id = p.company_id
       WHERE p.company_id = $1 AND p.employee_id IS NOT NULL
         AND p.punch_time >= (($2::date - 1)::timestamp AT TIME ZONE $3::text)
         AND p.punch_time < (($2::date + 2)::timestamp AT TIME ZONE $3::text)
       ORDER BY p.employee_id, p.punch_time`,
      [access.companyId, date, TIMEZONE]
    );
    const byEmployee = new Map();
    for (const row of punches.rows) {
      const key = String(row.employee_id);
      if (!byEmployee.has(key)) byEmployee.set(key, []);
      byEmployee.get(key).push({ local: row.local });
    }

    const regularized = await client.query(
      `SELECT employee_id FROM attendance_records
       WHERE company_id = $1 AND attendance_date = $2::date AND is_regularized`,
      [access.companyId, date]
    );
    const regularizedIds = new Set(regularized.rows.map((r) => String(r.employee_id)));

    let processed = 0;
    let skipped = 0;
    let nightShiftPaired = 0;
    const unpairedNightShifts = [];
    const errors = [];

    for (const [employeeId, list] of byEmployee) {
      if (regularizedIds.has(employeeId)) {
        if (list.some((p) => p.local.startsWith(date))) skipped += 1;
        continue;
      }
      const shift = await resolveShift(client, { companyId: access.companyId, employeeId, date });
      if (isNightShift(shift) && nightWindow !== null) {
        const windowError = validateNightWindow(shift, nightWindow);
        if (windowError) {
          errors.push(windowError);
          continue;
        }
      } else if (isNightShift(shift)) {
        unpairedNightShifts.push(employeeId);
      }

      const pair = pairPunches(date, list, { shift, nightWindowMinutes: nightWindow });
      if (!pair.checkIn) continue;

      await upsertAttendance(client, {
        companyId: access.companyId,
        employeeId,
        date,
        checkIn: pair.checkIn,
        checkOut: pair.checkOut,
        checkInDate: pair.checkInDate,
        checkOutDate: pair.checkOutDate,
      });
      processed += 1;
      if (pair.mode === "night_shift_window") nightShiftPaired += 1;
    }

    if (errors.length) {
      await client.query("ROLLBACK");
      return fail(400, "Punches could not be processed. Adjust the night-shift window in the company policy.", {
        errors: [...new Set(errors)],
      });
    }

    await client.query("COMMIT");
    const notes = unpairedNightShifts.length
      ? [
          `${unpairedNightShifts.length} employee(s) are rostered on a night shift, but no night-shift punch window is approved in the company policy; their punches were grouped by calendar date.`,
        ]
      : [];
    return ok({
      message: `Processed ${processed} employee(s); ${skipped} regularized record(s) kept.`,
      date,
      processed,
      skipped,
      nightShiftPaired,
      notes,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Process punches failed", error, "Unable to process punches.");
  } finally {
    client?.release();
  }
}
