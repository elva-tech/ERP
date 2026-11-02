
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  MANAGER_ROLES,
  fail,
  isValidDate,
  ok,
  parseId,
  readJsonObject,
  requireCompanyAccess,
  serverError,
  trimmed,
} from "@/lib/api";
import { TIMEZONE } from "@/lib/attendance";

const PUNCH_TYPES = ["In", "Out", "Break", "Unknown"];
const MAX_BATCH = 2000;
const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;
const ZONED_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * GET /api/attendance/punches?companyId=X&date=YYYY-MM-DD[&employeeId=Y][&unmatched=1]
 * Raw device punches for a local date (managers only).
 */
export async function GET(request) {
  await connection();

  try {
    const access = await requireCompanyAccess(request, { roles: MANAGER_ROLES });
    if (access.error) return access.error;

    const params = new URL(request.url).searchParams;
    const date = params.get("date") || new Date().toISOString().slice(0, 10);
    if (!isValidDate(date)) return fail(400, "date must be YYYY-MM-DD.");

    const values = [access.companyId, date, TIMEZONE];
    const conditions = ["p.company_id = $1", "(p.punch_time AT TIME ZONE $3::text)::date = $2::date"];
    const employeeId = parseId(params.get("employeeId") || "");
    if (employeeId) {
      values.push(employeeId);
      conditions.push(`p.employee_id = $${values.length}`);
    }
    if (params.get("unmatched") === "1") conditions.push("p.employee_id IS NULL");

    const result = await pool.query(
      `SELECT p.id, p.employee_id, e.name AS employee_name, e.employee_code, p.device_id,
              d.device_name, d.location AS device_location, p.device_user_id, p.punch_type, p.punch_time,
              to_char(p.punch_time AT TIME ZONE $3::text, 'YYYY-MM-DD HH24:MI:SS') AS punch_local_time,
              to_char(p.created_at AT TIME ZONE $3::text, 'YYYY-MM-DD HH24:MI:SS') AS received_local_time
       FROM raw_punches p
       LEFT JOIN employees e ON e.id = p.employee_id
       LEFT JOIN biometric_devices d ON d.id = p.device_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY p.punch_time ASC
       LIMIT 5000`,
      values
    );
    return ok({ count: result.rowCount, date, timezone: TIMEZONE, punches: result.rows });
  } catch (error) {
    return serverError("List punches failed", error, "Unable to retrieve raw punches.");
  }
}

/**
 * POST /api/attendance/punches  (managers)
 * { companyId, punches: [{ punchTime, employeeId? | deviceUserId?, deviceId?, punchType? }] }
 * punchTime: ISO timestamp with offset, or local "YYYY-MM-DDTHH:MM[:SS]" (HRMS_TIMEZONE).
 * Punches are matched to employees by employeeId, else by employee_code = deviceUserId.
 * Unmatched punches are stored with employee_id NULL for later review.
 */
export async function POST(request) {
  await connection();

  let client;
  try {
    const parsed = await readJsonObject(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    const access = await requireCompanyAccess(request, {
      companyId: body.companyId ?? "",
      roles: MANAGER_ROLES,
      mutation: true,
    });
    if (access.error) return access.error;

    const punches = body.punches;
    if (!Array.isArray(punches) || punches.length === 0) return fail(400, "punches must be a non-empty array.");
    if (punches.length > MAX_BATCH) return fail(400, `At most ${MAX_BATCH} punches can be imported at once.`);

    const errors = [];
    const rows = punches.map((punch, index) => {
      const punchTime = trimmed(punch?.punchTime);
      const local = LOCAL_PATTERN.test(punchTime);
      if (!local && !(ZONED_PATTERN.test(punchTime) && !Number.isNaN(Date.parse(punchTime)))) {
        errors.push(`Row ${index + 1}: invalid punchTime.`);
      }
      const punchType = punch?.punchType ? trimmed(punch.punchType) : "Unknown";
      if (!PUNCH_TYPES.includes(punchType)) errors.push(`Row ${index + 1}: invalid punchType.`);
      const employeeId = punch?.employeeId ? parseId(punch.employeeId) : null;
      if (punch?.employeeId && !employeeId) errors.push(`Row ${index + 1}: invalid employeeId.`);
      const deviceId = punch?.deviceId ? parseId(punch.deviceId) : null;
      if (punch?.deviceId && !deviceId) errors.push(`Row ${index + 1}: invalid deviceId.`);
      const deviceUserId = trimmed(punch?.deviceUserId).slice(0, 100) || null;
      if (!employeeId && !deviceUserId) errors.push(`Row ${index + 1}: employeeId or deviceUserId is required.`);
      return { punchTime: punchTime.replace(" ", "T"), local, punchType, employeeId, deviceId, deviceUserId };
    });
    if (errors.length) return fail(400, "Some punches are invalid.", { errors: errors.slice(0, 50) });

    client = await pool.connect();
    await client.query("BEGIN");

    const [employees, devices] = await Promise.all([
      client.query("SELECT id::text, employee_code FROM employees WHERE company_id = $1", [access.companyId]),
      client.query("SELECT id::text FROM biometric_devices WHERE company_id = $1", [access.companyId]),
    ]);
    const employeeIds = new Set(employees.rows.map((e) => e.id));
    const byCode = new Map(employees.rows.map((e) => [e.employee_code.toLowerCase(), e.id]));
    const deviceIds = new Set(devices.rows.map((d) => d.id));

    let matched = 0;
    for (const [index, row] of rows.entries()) {
      if (row.employeeId && !employeeIds.has(row.employeeId)) {
        errors.push(`Row ${index + 1}: employee not found in this company.`);
      }
      if (row.deviceId && !deviceIds.has(row.deviceId)) {
        errors.push(`Row ${index + 1}: device not found in this company.`);
      }
      row.resolvedEmployee = row.employeeId || byCode.get(row.deviceUserId?.toLowerCase() ?? "") || null;
      if (row.resolvedEmployee) matched += 1;
    }
    if (errors.length) {
      await client.query("ROLLBACK");
      return fail(400, "Some punches reference unknown records.", { errors: errors.slice(0, 50) });
    }

    for (const row of rows) {
      await client.query(
        `INSERT INTO raw_punches (company_id, device_id, employee_id, punch_time, punch_type, device_user_id)
         VALUES ($1, $2, $3,
           CASE WHEN $7 THEN ($4::timestamp AT TIME ZONE $8::text) ELSE $4::timestamptz END,
           $5, $6)`,
        [
          access.companyId,
          row.deviceId,
          row.resolvedEmployee,
          row.punchTime,
          row.punchType,
          row.deviceUserId,
          row.local,
          TIMEZONE,
        ]
      );
    }

    const deviceList = [...new Set(rows.map((r) => r.deviceId).filter(Boolean))];
    if (deviceList.length) {
      await client.query(
        "UPDATE biometric_devices SET last_sync_at = NOW(), updated_at = NOW() WHERE company_id = $1 AND id = ANY($2::bigint[])",
        [access.companyId, deviceList]
      );
    }

    await client.query("COMMIT");
    return ok(
      {
        message: `Imported ${rows.length} punch(es); ${matched} matched to employees, ${rows.length - matched} unmatched.`,
        imported: rows.length,
        matched,
        unmatched: rows.length - matched,
      },
      201
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return serverError("Import punches failed", error, "Unable to import punches.");
  } finally {
    client?.release();
  }
}
