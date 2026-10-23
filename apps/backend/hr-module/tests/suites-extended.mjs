// End-to-end suites for the company policy, payroll/attendance/leave rules,
// delegated approvals, designation departments, the employee profile and
// employee documents. All data is synthetic (see fixtures.mjs).

import { expect, expectStatus } from "./assert.mjs";

const q = (companyId) => `?companyId=${encodeURIComponent(companyId)}`;

/** Company-chosen settings used by the tests; they are test choices, not recommendations. */
const COMPLETE_POLICY = {
  lopMode: "none",
  netPayRounding: "none",
  pfTreatment: "configured_components",
  esicTreatment: "not_applicable",
  professionalTaxTreatment: "not_applicable",
  tdsTreatment: "configured_components",
  overtimePayTreatment: "not_paid",
  leaveDayCounting: "calendar_days",
};

async function savePolicy(admin, cid, settings) {
  const r = await admin.request("PUT", `/api/policy${q(cid)}`, { body: { companyId: cid, ...settings } });
  expectStatus(r, 200, "save policy");
  return r.data.policy.version;
}

async function approvePolicy(admin, cid, version) {
  const r = await admin.post("/api/policy/approve", { companyId: cid, version });
  expectStatus(r, 200, `approve policy v${version}`);
  return r;
}

export async function designationDepartments(t, { fixtures, state }) {
  const api = state.adminA;
  const cid = fixtures.companyA;

  await t.check("designation is linked to departments of the same company", async () => {
    const r = await api.post("/api/designations", {
      companyId: cid,
      designationName: "E2E Tech Lead",
      departmentIds: [state.deptId],
    });
    expectStatus(r, 201);
    state.desgLeadId = String(r.data.designation.id);
    const links = r.data.designation.departments;
    expect(links.length === 1 && String(links[0].id) === state.deptId, JSON.stringify(links));
  });
  await t.check("another company's department cannot be linked (400)", async () => {
    const b = await state.adminB.post("/api/departments", { companyId: fixtures.companyB, departmentName: "E2E B Dept" });
    expectStatus(b, 201);
    state.deptBId = String(b.data.department.id);
    expectStatus(
      await api.post("/api/designations", { companyId: cid, designationName: "E2E Foreign Link", departmentIds: [state.deptBId] }),
      400
    );
    expectStatus(await api.patch(`/api/designations/${state.desgLeadId}${q(cid)}`, { departmentIds: [state.deptBId] }), 400);
  });
  await t.check("invalid department IDs are rejected (400)", async () => {
    expectStatus(await api.patch(`/api/designations/${state.desgLeadId}${q(cid)}`, { departmentIds: ["abc"] }), 400);
    expectStatus(await api.patch(`/api/designations/${state.desgLeadId}${q(cid)}`, { departmentIds: "1" }), 400);
  });
  await t.check("PATCH replaces the links and the list returns them", async () => {
    const r = await api.patch(`/api/designations/${state.desgLeadId}${q(cid)}`, {
      departmentIds: [state.deptId, state.dept2Id],
    });
    expectStatus(r, 200);
    expect(r.data.designation.departments.length === 2, JSON.stringify(r.data.designation.departments));
    const list = await api.get(`/api/designations${q(cid)}`);
    const row = list.data.designations.find((d) => String(d.id) === state.desgLeadId);
    expect(row && row.departments.length === 2, JSON.stringify(row));
  });
  await t.check("employee role cannot change designation links (403)", async () => {
    const r = await state.employeeA.patch(`/api/designations/${state.desgLeadId}${q(cid)}`, { departmentIds: [] });
    expectStatus(r, 403);
  });
}

export async function policySuite(t, { fixtures, state }) {
  const admin = state.adminA;
  const cid = fixtures.companyA;

  await t.check("policy starts unset and lists every missing decision", async () => {
    const r = await admin.get(`/api/policy${q(cid)}`);
    expectStatus(r, 200);
    expect(r.data.policy.version === 0 && r.data.policy.approved_snapshot === null, JSON.stringify(r.data.policy));
    expect(r.data.missing.length === 8, JSON.stringify(r.data.missing));
  });
  await t.check("employees cannot read the policy; HR managers cannot change or approve it", async () => {
    expectStatus(await state.employeeA.get(`/api/policy${q(cid)}`), 403);
    expectStatus(await state.hrA.get(`/api/policy${q(cid)}`), 200);
    expectStatus(await state.hrA.request("PUT", `/api/policy${q(cid)}`, { body: { companyId: cid, lopMode: "none" } }), 403);
    expectStatus(await state.hrA.post("/api/policy/approve", { companyId: cid, version: 1 }), 403);
    expectStatus(await state.adminB.get(`/api/policy${q(cid)}`), 403);
  });
  await t.check("invalid policy values are rejected (400)", async () => {
    const put = (body) => admin.request("PUT", `/api/policy${q(cid)}`, { body: { companyId: cid, ...body } });
    expectStatus(await put({ lopMode: "half" }), 400);
    expectStatus(await put({ lopFixedDays: 40 }), 400);
    expectStatus(await put({ nightShiftWindowMinutes: -5 }), 400);
  });
  await t.check("an incomplete policy cannot be approved (400 with missing list)", async () => {
    const version = await savePolicy(admin, cid, { lopMode: "unpaid_leave" });
    const r = await admin.post("/api/policy/approve", { companyId: cid, version });
    expectStatus(r, 400);
    expect(r.data.missing.includes("LOP day basis"), JSON.stringify(r.data.missing));
  });
  await t.check("a stale version cannot be approved (409)", async () => {
    const before = (await admin.get(`/api/policy${q(cid)}`)).data.policy.version;
    const version = await savePolicy(admin, cid, COMPLETE_POLICY);
    expect(version === before + 1, `version ${version}`);
    expectStatus(await admin.post("/api/policy/approve", { companyId: cid, version: before }), 409);
  });
  await t.check("the complete policy is approved and its snapshot stored", async () => {
    const version = (await admin.get(`/api/policy${q(cid)}`)).data.policy.version;
    const r = await approvePolicy(admin, cid, version);
    expect(r.data.policy.status === "Approved" && r.data.missing.length === 0, JSON.stringify(r.data));
    expect(r.data.policy.approved_snapshot.version === version, JSON.stringify(r.data.policy.approved_snapshot));
    expectStatus(await admin.post("/api/policy/approve", { companyId: cid, version }), 409);
  });
}

export async function policyRulesSuite(t, { fixtures, state }) {
  const admin = state.adminA;
  const cid = fixtures.companyA;
  const runPath = (id) => `/api/payroll/runs/${id}${q(cid)}`;
  const slipFor = async (runId, employeeId) => {
    const r = await admin.get(runPath(runId));
    expectStatus(r, 200);
    return r.data.payslips.find((p) => String(p.employee_id) === employeeId);
  };

  await t.check("setup: end the negative-net assignment and add an unpaid leave type", async () => {
    const list = await admin.get(`/api/payroll/assignments${q(cid)}&employeeId=${state.employee2Id}`);
    expectStatus(list, 200);
    const negative = list.data.assignments.find((a) => a.structure_name === "E2E Negative Net");
    expectStatus(await admin.patch(`/api/payroll/assignments/${negative.id}${q(cid)}`, { effectiveTo: "2099-07-31" }), 200);
    const r = await admin.post("/api/leave/types", { companyId: cid, name: "E2E Unpaid Leave", daysPerYear: 0, isPaid: false });
    expectStatus(r, 201);
    state.unpaidTypeId = String(r.data.leaveType.id);
  });
  await t.check("LOP from unpaid leave and absences prorates earnings; net pay rounded", async () => {
    let version = await savePolicy(admin, cid, {
      lopMode: "unpaid_leave_and_absence",
      lopDayBasis: "calendar_days",
      netPayRounding: "nearest_rupee",
    });
    await approvePolicy(admin, cid, version);
    state.policyVersion = version;

    let r = await state.employeeA.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-11-02",
      toDate: "2099-11-03",
      reason: "Automated LOP test",
    });
    expectStatus(r, 201);
    expectStatus(await state.hrA.patch(`/api/leave/requests/${r.data.request.id}${q(cid)}`, { action: "approve" }), 200);
    const mark = (date, status) =>
      admin.post("/api/attendance/records", { companyId: cid, employeeId: state.employeeId, date, status });
    expectStatus(await mark("2099-11-02", "Absent"), 201); // already unpaid leave: not counted twice
    expectStatus(await mark("2099-11-10", "Absent"), 201);
    expectStatus(await mark("2099-11-11", "Half Day"), 201);

    r = await admin.post("/api/payroll/runs", { companyId: cid, year: 2099, month: 11 });
    expectStatus(r, 201);
    state.runNov = String(r.data.run.id);
    r = await admin.patch(runPath(state.runNov), { action: "process" });
    expectStatus(r, 200);
    expect(r.data.provisional === false && r.data.policyVersion === version, JSON.stringify(r.data));
    const slip = await slipFor(state.runNov, state.employeeId);
    const lop = slip.calculation_detail.lop;
    expect(lop && lop.lopDays === 3.5 && lop.basisDays === 30 && lop.paidDays === 26.5, JSON.stringify(lop));
    expect(lop.unpaidLeaveDates.length === 2 && lop.absenceDates.length === 2, JSON.stringify(lop));
    // 45000 monthly gross prorated by 26.5/30 = 39750 (component-level rounding may add a paisa).
    expect(Math.abs(slip.gross_pay - 39750) <= 0.05, `gross ${slip.gross_pay}`);
    expect(Number.isInteger(slip.net_salary) && slip.net_salary === 36183, `net ${slip.net_salary}`);
    expect(slip.calculation_detail.netPayRounding.mode === "nearest_rupee", JSON.stringify(slip.calculation_detail.netPayRounding));
  });
  await t.check("draft policy edits do not change payroll until approved", async () => {
    const version = await savePolicy(admin, cid, { notes: "E2E draft change" });
    const r = await admin.patch(runPath(state.runNov), { action: "process" });
    expectStatus(r, 200);
    expect(r.data.policyVersion === state.policyVersion, `processed with ${r.data.policyVersion}`);
    state.draftVersion = version;
  });
  await t.check("a run processed under an older approved version must be reprocessed (409)", async () => {
    await approvePolicy(admin, cid, state.draftVersion);
    const r = await admin.patch(runPath(state.runNov), { action: "finalize" });
    expectStatus(r, 409);
    expectStatus(await admin.patch(runPath(state.runNov), { action: "process" }), 200);
    const done = await admin.patch(runPath(state.runNov), { action: "finalize" });
    expectStatus(done, 200);
    expect(done.data.run.policy_version === state.draftVersion && done.data.run.is_provisional === false, JSON.stringify(done.data.run));
  });
  await t.check("leave counting can exclude weekly offs and holidays", async () => {
    const version = await savePolicy(admin, cid, { leaveDayCounting: "exclude_weekly_offs_and_holidays" });
    await approvePolicy(admin, cid, version);
    expectStatus(
      await admin.post("/api/leave/holidays", { companyId: cid, name: "E2E December Holiday", date: "2099-12-01", type: "Company" }),
      201
    );
    // 2099-12-01 (Tue, holiday) to 2099-12-07 (Mon); 2099-12-06 is the rostered Sunday off.
    let r = await state.employeeA.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-12-01",
      toDate: "2099-12-07",
    });
    expectStatus(r, 201);
    expect(r.data.request.days === 5, `days ${r.data.request.days}`);
    const reasons = r.data.dayCounting.excluded.map((x) => `${x.date}:${x.reason}`).sort();
    expect(reasons.join() === "2099-12-01:Holiday,2099-12-06:Weekly off", reasons.join());
    expectStatus(await state.employeeA.patch(`/api/leave/requests/${r.data.request.id}${q(cid)}`, { action: "cancel" }), 200);
    r = await state.employeeA.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-12-06",
      toDate: "2099-12-06",
    });
    expectStatus(r, 400);
  });
  await t.check("night shift: without a policy window punches stay on calendar dates", async () => {
    let r = await admin.post("/api/attendance/shifts", { companyId: cid, name: "E2E Night Shift", startTime: "22:00", endTime: "06:00" });
    expectStatus(r, 201);
    state.nightShiftId = String(r.data.shift.id);
    r = await admin.post("/api/attendance/rosters", {
      companyId: cid,
      employeeId: state.employee2Id,
      shiftId: state.nightShiftId,
      effectiveFrom: "2099-09-01",
      effectiveTo: "2099-09-30",
    });
    expectStatus(r, 201);
    r = await admin.post("/api/attendance/punches", {
      companyId: cid,
      punches: [
        { deviceUserId: "E2E-004", punchTime: "2099-09-10T22:05", punchType: "In" },
        { deviceUserId: "E2E-004", punchTime: "2099-09-11T06:10", punchType: "Out" },
      ],
    });
    expectStatus(r, 201);
    r = await admin.post("/api/attendance/punches/process", { companyId: cid, date: "2099-09-10" });
    expectStatus(r, 200);
    expect(r.data.nightShiftPaired === 0 && r.data.notes.length === 1, JSON.stringify(r.data));
    const list = await admin.get(`/api/attendance/records${q(cid)}&date=2099-09-10&employeeId=${state.employee2Id}`);
    const rec = list.data.records[0];
    expect(rec && rec.check_in_time === "22:05" && !rec.check_out_time, JSON.stringify(rec));
  });
  await t.check("night shift: an approved window pairs punches across midnight", async () => {
    const version = await savePolicy(admin, cid, { nightShiftWindowMinutes: 120 });
    await approvePolicy(admin, cid, version);
    let r = await admin.post("/api/attendance/punches/process", { companyId: cid, date: "2099-09-10" });
    expectStatus(r, 200);
    expect(r.data.nightShiftPaired === 1, JSON.stringify(r.data));
    const list = await admin.get(`/api/attendance/records${q(cid)}&date=2099-09-10&employeeId=${state.employee2Id}`);
    const rec = list.data.records[0];
    expect(rec && rec.check_in_time === "22:05" && rec.check_out_time === "06:10" && rec.working_minutes === 485, JSON.stringify(rec));
    r = await admin.post("/api/attendance/punches/process", { companyId: cid, date: "2099-09-11" });
    expectStatus(r, 200);
    const next = await admin.get(`/api/attendance/records${q(cid)}&date=2099-09-11&employeeId=${state.employee2Id}`);
    expect(next.data.count === 0, `morning punch created a record on 2099-09-11: ${JSON.stringify(next.data.records)}`);
  });
  await t.check("night shift: a window that overlaps the next shift is refused (400)", async () => {
    let version = await savePolicy(admin, cid, { nightShiftWindowMinutes: 600 });
    await approvePolicy(admin, cid, version);
    const r = await admin.post("/api/attendance/punches/process", { companyId: cid, date: "2099-09-10" });
    expectStatus(r, 400);
    version = await savePolicy(admin, cid, { nightShiftWindowMinutes: 120 });
    await approvePolicy(admin, cid, version);
  });
}

export async function carryForwardSuite(t, { fixtures, state }) {
  const admin = state.adminA;
  const cid = fixtures.companyA;
  const carry = (body, client = admin) => client.post("/api/leave/carry-forward", { companyId: cid, ...body });

  await t.check("setup: carry-forward leave type and leave used in 2098", async () => {
    let r = await admin.post("/api/leave/types", {
      companyId: cid,
      name: "E2E Earned Leave",
      daysPerYear: 10,
      isPaid: true,
      carryForward: true,
      maxCarryForwardDays: 5,
    });
    expectStatus(r, 201);
    state.earnedTypeId = String(r.data.leaveType.id);
    r = await state.employeeA.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: state.earnedTypeId,
      fromDate: "2098-03-03",
      toDate: "2098-03-04",
    });
    expectStatus(r, 201);
    expectStatus(await state.hrA.patch(`/api/leave/requests/${r.data.request.id}${q(cid)}`, { action: "approve" }), 200);
  });
  await t.check("preview computes unused days capped at the type's maximum without saving", async () => {
    const r = await carry({ fromYear: 2098 });
    expectStatus(r, 200);
    const mine = r.data.results.find((x) => x.employeeId === state.employeeId && x.leaveTypeId === state.earnedTypeId);
    const other = r.data.results.find((x) => x.employeeId === state.employee2Id && x.leaveTypeId === state.earnedTypeId);
    expect(r.data.applied === false && mine.unused === 8 && mine.carryForward === 5, JSON.stringify(mine));
    expect(other.unused === 10 && other.carryForward === 5, JSON.stringify(other));
    expect(!r.data.results.some((x) => x.leaveTypeId === state.leaveTypeId), "non carry-forward type included");
    const b = await admin.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employeeId}`);
    const row = b.data.balances.find((x) => String(x.leave_type_id) === state.earnedTypeId);
    expect(row.carry_forward === 0, JSON.stringify(row));
  });
  await t.check("applying writes next year's carry-forward and is idempotent", async () => {
    expectStatus(await carry({ fromYear: 2098, apply: true }), 200);
    expectStatus(await carry({ fromYear: 2098, apply: true }), 200);
    const b = await admin.get(`/api/leave/balances${q(cid)}&year=2099&employeeId=${state.employeeId}`);
    const row = b.data.balances.find((x) => String(x.leave_type_id) === state.earnedTypeId);
    expect(row.carry_forward === 5 && row.allocated === 10 && row.available === 15, JSON.stringify(row));
  });
  await t.check("only company admins can carry forward; invalid year rejected", async () => {
    expectStatus(await carry({ fromYear: 2098 }, state.hrA), 403);
    expectStatus(await carry({ fromYear: 2098 }, state.employeeA), 403);
    expectStatus(await carry({ fromYear: "abc" }), 400);
    expectStatus(await state.adminB.post("/api/leave/carry-forward", { companyId: cid, fromYear: 2098 }), 403);
  });
}

export async function delegationSuite(t, { fixtures, state, pool }) {
  const admin = state.adminA;
  const cid = fixtures.companyA;
  const delegate = state.employeeA;
  const { employeeA, adminA, adminB } = fixtures.users;
  const audit = async (entityType, entityId) =>
    (
      await pool.query(
        `SELECT action, authority, actor_user_id::text AS actor FROM approval_audit_log
         WHERE entity_type = $1 AND entity_id = $2 ORDER BY id`,
        [entityType, entityId]
      )
    ).rows;

  await t.check("setup: requests raised by the HR manager and by an unlinked employee", async () => {
    let r = await state.hrA.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: state.leaveTypeId,
      fromDate: "2099-10-05",
      toDate: "2099-10-05",
    });
    expectStatus(r, 201);
    state.hrLeaveId = String(r.data.request.id);
    r = await admin.post("/api/employees", {
      companyId: cid,
      employeeCode: "E2E-005",
      name: "E2E Third Employee",
      department: "E2E Platform Engineering",
      designation: "E2E Engineer",
      email: "e2e.third@elva-test.invalid",
    });
    expectStatus(r, 201);
    state.employee3Id = String(r.data.employee.id);
    r = await admin.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee3Id,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-10-06",
      toDate: "2099-10-06",
    });
    expectStatus(r, 201);
    state.thirdLeaveId = String(r.data.request.id);
  });
  await t.check("without a delegation an employee cannot review (403)", async () => {
    expectStatus(await delegate.patch(`/api/leave/requests/${state.hrLeaveId}${q(cid)}`, { action: "approve" }), 403);
    const pending = await delegate.get(`/api/approvals/pending${q(cid)}`);
    expect(pending.data.authority === null && pending.data.leaveRequests.length === 0, JSON.stringify(pending.data));
  });
  await t.check("delegation rules: admin only, no self-grant, member of the company, reason required", async () => {
    const add = (client, body) => client.post("/api/approvals/delegates", { companyId: cid, reason: "Automated test", ...body });
    expectStatus(await add(admin, { userId: adminA.userId }), 400);
    expectStatus(await add(state.hrA, { userId: employeeA.userId }), 403);
    expectStatus(await add(delegate, { userId: employeeA.userId }), 403);
    expectStatus(await add(admin, { userId: adminB.userId }), 400);
    expectStatus(await add(admin, { userId: employeeA.userId, reason: "" }), 400);
    const r = await add(admin, { userId: employeeA.userId, reason: "Second approver for the sole admin (automated test)" });
    expectStatus(r, 201);
    state.delegationId = String(r.data.delegate.id);
    expectStatus(await add(admin, { userId: employeeA.userId }), 409);
  });
  await t.check("/api/auth/me and the pending list reflect the delegation", async () => {
    const me = await delegate.get("/api/auth/me");
    expect(me.data.memberships.find((m) => String(m.companyId) === cid).isApprovalDelegate === true, "flag missing");
    const pending = await delegate.get(`/api/approvals/pending${q(cid)}`);
    expectStatus(pending, 200);
    const ids = pending.data.leaveRequests.map((x) => String(x.id));
    expect(pending.data.authority === "delegate" && ids.includes(state.hrLeaveId), JSON.stringify(ids));
    expect(!ids.includes(state.thirdLeaveId), "delegate sees requests outside their scope");
    const managerView = await admin.get(`/api/approvals/pending${q(cid)}`);
    const managerIds = managerView.data.leaveRequests.map((x) => String(x.id));
    expect(managerIds.includes(state.hrLeaveId) && managerIds.includes(state.thirdLeaveId), JSON.stringify(managerIds));
  });
  await t.check("delegate approves the HR manager's leave; audit records the delegate authority", async () => {
    const r = await delegate.patch(`/api/leave/requests/${state.hrLeaveId}${q(cid)}`, { action: "approve" });
    expectStatus(r, 200);
    const rows = await audit("leave_request", state.hrLeaveId);
    expect(rows.length === 1 && rows[0].authority === "delegate" && rows[0].actor === employeeA.userId, JSON.stringify(rows));
  });
  await t.check("delegate cannot review requests of ordinary employees or their own (403)", async () => {
    expectStatus(await delegate.patch(`/api/leave/requests/${state.thirdLeaveId}${q(cid)}`, { action: "approve" }), 403);
    const own = await delegate.post("/api/leave/requests", {
      companyId: cid,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-10-12",
      toDate: "2099-10-12",
    });
    expectStatus(own, 201);
    expectStatus(await delegate.patch(`/api/leave/requests/${own.data.request.id}${q(cid)}`, { action: "approve" }), 403);
    expectStatus(await admin.patch(`/api/leave/requests/${own.data.request.id}${q(cid)}`, { action: "reject", reviewNote: "Test" }), 200);
    const r = await admin.patch(`/api/leave/requests/${state.thirdLeaveId}${q(cid)}`, { action: "approve" });
    expectStatus(r, 200);
    const rows = await audit("leave_request", state.thirdLeaveId);
    expect(rows.length === 1 && rows[0].authority === "manager", JSON.stringify(rows));
  });
  await t.check("delegate reviews the HR manager's regularization and advance; cannot close advances", async () => {
    let r = await state.hrA.post("/api/attendance/regularizations", {
      companyId: cid,
      employeeId: state.employee2Id,
      date: "2020-02-03",
      checkIn: "09:00",
      checkOut: "17:00",
      reason: "Automated delegation test",
    });
    expectStatus(r, 201);
    const regId = String(r.data.regularization.id);
    expectStatus(await delegate.patch(`/api/attendance/regularizations/${regId}${q(cid)}`, { action: "approve" }), 200);
    expect((await audit("regularization", regId))[0]?.authority === "delegate", "regularization audit missing");

    r = await state.hrA.post("/api/payroll/advances", { companyId: cid, employeeId: state.employee2Id, amount: 500 });
    expectStatus(r, 201);
    const advId = String(r.data.advance.id);
    expectStatus(await delegate.patch(`/api/payroll/advances/${advId}${q(cid)}`, { action: "approve", emiAmount: 100 }), 200);
    expect((await audit("advance", advId))[0]?.authority === "delegate", "advance audit missing");
    expectStatus(await delegate.patch(`/api/payroll/advances/${advId}${q(cid)}`, { action: "close" }), 403);
    expectStatus(await admin.patch(`/api/payroll/advances/${advId}${q(cid)}`, { action: "close" }), 200);
  });
  await t.check("the HR manager still cannot approve their own request", async () => {
    const r = await state.hrA.post("/api/leave/requests", {
      companyId: cid,
      employeeId: state.employee2Id,
      leaveTypeId: state.unpaidTypeId,
      fromDate: "2099-10-13",
      toDate: "2099-10-13",
    });
    expectStatus(r, 201);
    state.hrLeave2Id = String(r.data.request.id);
    expectStatus(await state.hrA.patch(`/api/leave/requests/${state.hrLeave2Id}${q(cid)}`, { action: "approve" }), 403);
  });
  await t.check("revoking the delegation removes the authority; the grant stays listed", async () => {
    expectStatus(await state.hrA.delete(`/api/approvals/delegates/${state.delegationId}${q(cid)}`), 403);
    expectStatus(await state.adminB.delete(`/api/approvals/delegates/${state.delegationId}${q(fixtures.companyB)}`), 404);
    expectStatus(await admin.delete(`/api/approvals/delegates/${state.delegationId}${q(cid)}`), 200);
    expectStatus(await admin.delete(`/api/approvals/delegates/${state.delegationId}${q(cid)}`), 404);
    expectStatus(await delegate.patch(`/api/leave/requests/${state.hrLeave2Id}${q(cid)}`, { action: "approve" }), 403);
    const list = await admin.get(`/api/approvals/delegates${q(cid)}`);
    const row = list.data.delegates.find((d) => String(d.id) === state.delegationId);
    expect(row && row.revoked_at && row.granted_by_name === "E2E Admin A", JSON.stringify(row));
    expectStatus(await state.hrA.get(`/api/approvals/delegates${q(cid)}`), 403);
    expectStatus(await state.adminB.get(`/api/approvals/pending${q(cid)}`), 403);
  });
  await t.check("company admins cannot use the platform-admin company approval endpoints", async () => {
    expectStatus(await admin.get("/api/admin/companies/pending"), 403);
    expectStatus(await state.employeeA.get("/api/admin/companies/pending"), 403);
    const r = await admin.patch(`/api/companies/${fixtures.companyB}/approval`, { decision: "approve" });
    expectStatus(r, 403);
    expect(r.data.message === "Platform administrator access required.", JSON.stringify(r.data));
  });
}

export async function profileSuite(t, { fixtures, state }) {
  const admin = state.adminA;
  const emp = state.employeeA;
  const cid = fixtures.companyA;
  const employeePath = (id, suffix = "") => `/api/employees/${id}${suffix}${q(cid)}`;

  await t.check("profile fields are saved and validated", async () => {
    const r = await admin.patch(employeePath(state.employeeId), {
      dateOfJoining: "2098-01-15",
      dateOfBirth: "1990-05-20",
      gender: "Female",
      employmentType: "Full-time",
      workLocation: "E2E Site",
      reportingManagerId: state.employee2Id,
    });
    expectStatus(r, 200);
    const e = r.data.employee;
    expect(
      e.date_of_joining === "2098-01-15" && e.date_of_birth === "1990-05-20" && e.employment_type === "Full-time" &&
        String(e.reporting_manager_id) === state.employee2Id,
      JSON.stringify(e)
    );
    const bad = (body) => admin.patch(employeePath(state.employeeId), body);
    expectStatus(await bad({ gender: "Unknown" }), 400);
    expectStatus(await bad({ employmentType: "Freelance" }), 400);
    expectStatus(await bad({ dateOfBirth: "2999-01-01" }), 400);
    expectStatus(await bad({ dateOfJoining: "1980-01-01" }), 400);
    expectStatus(await bad({ dateOfJoining: "2098-02-30" }), 400);
  });
  await t.check("reporting manager must be another employee of the company without cycles", async () => {
    expectStatus(await admin.patch(employeePath(state.employeeId), { reportingManagerId: state.employeeId }), 400);
    expectStatus(await admin.patch(employeePath(state.employee2Id), { reportingManagerId: state.employeeId }), 400);
    expectStatus(await admin.patch(employeePath(state.employeeId), { reportingManagerId: "999999999" }), 400);
  });
  await t.check("department/designation and status changes are written to history", async () => {
    expectStatus(await admin.patch(employeePath(state.employeeId), { designation: "E2E Tech Lead" }), 200);
    // The record is linked to employeeA's login: deactivation suspends that
    // access, and reactivating the record does not restore it on its own.
    const off = await admin.patch(employeePath(state.employeeId), { status: "Inactive" });
    expectStatus(off, 200);
    expect(off.data.accessSuspended === true, "linked access was not suspended");
    expectStatus(await admin.patch(employeePath(state.employeeId), { status: "Active" }), 200);
    expectStatus(await emp.get(employeePath(state.employeeId)), 403, "access restored without explicit reactivation");
    const restore = await admin.patch(`/api/members/${fixtures.users.employeeA.userId}${q(cid)}`, { status: "active" });
    expectStatus(restore, 200);
    expectStatus(await emp.get(employeePath(state.employeeId)), 200, "explicit reactivation");
    const r = await admin.get(employeePath(state.employeeId, "/history"));
    expectStatus(r, 200);
    const system = r.data.history.filter((h) => h.source === "system");
    const role = system.find((h) => h.event_type === "Role Change");
    expect(role && role.previous_designation === "E2E Engineer" && role.designation === "E2E Tech Lead", JSON.stringify(system));
    state.systemHistoryId = String(role.id);
    const statusChanges = system.filter((h) => h.event_type === "Status Change" && h.designation === "E2E Tech Lead");
    const transitions = statusChanges.map((h) => `${h.previous_status}>${h.new_status}`).sort().join();
    expect(transitions === "Active>Inactive,Inactive>Active", JSON.stringify(statusChanges));
  });
  await t.check("manual history entries; system entries are read-only", async () => {
    let r = await admin.post(employeePath(state.employeeId, "/history"), {
      eventType: "Previous Employment",
      effectiveDate: "2090-01-01",
      organization: "E2E Prior Company",
      designation: "E2E Analyst",
    });
    expectStatus(r, 201);
    const id = String(r.data.entry.id);
    expectStatus(await admin.patch(employeePath(state.employeeId, `/history/${id}`), { notes: "Verified by test" }), 200);
    expectStatus(await admin.patch(employeePath(state.employeeId, `/history/${state.systemHistoryId}`), { notes: "x" }), 409);
    expectStatus(await admin.delete(employeePath(state.employeeId, `/history/${state.systemHistoryId}`)), 409);
    expectStatus(await admin.post(employeePath(state.employeeId, "/history"), { eventType: "Fired", effectiveDate: "2090-01-01" }), 400);
    expectStatus(await emp.post(employeePath(state.employeeId, "/history"), { eventType: "Other", effectiveDate: "2090-01-01" }), 403);
  });
  await t.check("employees maintain their own addresses and emergency contacts", async () => {
    const address = { addressType: "Current", line1: "1 E2E Test Street", city: "E2E City", postalCode: "560001" };
    let r = await emp.post(employeePath(state.employeeId, "/addresses"), address);
    expectStatus(r, 201);
    const addressId = String(r.data.address.id);
    expectStatus(await emp.post(employeePath(state.employeeId, "/addresses"), address), 409);
    expectStatus(await emp.post(employeePath(state.employeeId, "/addresses"), { ...address, addressType: "Permanent", city: "" }), 400);
    expectStatus(await emp.post(employeePath(state.employee2Id, "/addresses"), { ...address, addressType: "Permanent" }), 404);
    r = await emp.patch(employeePath(state.employeeId, `/addresses/${addressId}`), { city: "E2E Town" });
    expectStatus(r, 200);
    expect(r.data.address.city === "E2E Town", JSON.stringify(r.data.address));

    const contact = { name: "E2E Contact One", relationship: "Sibling", phone: "+91 90000 22222", isPrimary: true };
    expectStatus(await emp.post(employeePath(state.employeeId, "/emergency-contacts"), contact), 201);
    expectStatus(await emp.post(employeePath(state.employeeId, "/emergency-contacts"), { ...contact, name: "E2E Contact Two" }), 201);
    expectStatus(await emp.post(employeePath(state.employeeId, "/emergency-contacts"), { ...contact, phone: "abc" }), 400);
    r = await emp.get(employeePath(state.employeeId, "/emergency-contacts"));
    const primary = r.data.contacts.filter((c) => c.is_primary);
    expect(r.data.contacts.length === 2 && primary.length === 1 && primary[0].name === "E2E Contact Two", JSON.stringify(r.data.contacts));
  });
  await t.check("bank accounts: HR only, validated, masked for the employee", async () => {
    const account = {
      accountHolderName: "E2E Employee A",
      bankName: "E2E Test Bank",
      accountNumber: "000123456789",
      ifscCode: "abcd0123456",
      accountType: "Salary",
      isPrimary: true,
    };
    expectStatus(await emp.post(employeePath(state.employeeId, "/bank-accounts"), account), 403);
    expectStatus(await admin.post(employeePath(state.employeeId, "/bank-accounts"), { ...account, ifscCode: "ABC123" }), 400);
    const r = await admin.post(employeePath(state.employeeId, "/bank-accounts"), account);
    expectStatus(r, 201);
    expect(r.data.bankAccount.account_number === "000123456789" && r.data.bankAccount.ifsc_code === "ABCD0123456", JSON.stringify(r.data.bankAccount));
    expectStatus(await admin.post(employeePath(state.employeeId, "/bank-accounts"), account), 409);
    const own = await emp.get(employeePath(state.employeeId, "/bank-accounts"));
    expectStatus(own, 200);
    expect(own.data.bankAccounts[0].account_number === "XXXX6789", JSON.stringify(own.data.bankAccounts[0]));
  });
  await t.check("full profile for HR, self view for the employee, directory view for colleagues", async () => {
    let r = await admin.get(employeePath(state.employeeId, "/profile"));
    expectStatus(r, 200);
    const p = r.data;
    expect(p.access === "manager" && String(p.reportingManager?.id) === state.employee2Id, JSON.stringify(p.reportingManager));
    expect(p.addresses.length === 1 && p.contacts.length === 2 && p.bankAccounts[0].account_number === "000123456789", "sections missing");
    expect(p.history.length >= 4 && p.login?.email === fixtures.users.employeeA.email, JSON.stringify(p.login));

    r = await emp.get(employeePath(state.employeeId, "/profile"));
    expectStatus(r, 200);
    expect(r.data.access === "self" && r.data.bankAccounts[0].account_number === "XXXX6789" && r.data.login === null, "self view wrong");

    r = await emp.get(employeePath(state.employee2Id, "/profile"));
    expectStatus(r, 200);
    expect(r.data.access === "directory" && !("addresses" in r.data) && !("email" in r.data.employee), JSON.stringify(r.data));

    r = await admin.get(employeePath(state.employee2Id, "/profile"));
    expect(r.data.directReports.some((x) => String(x.id) === state.employeeId), "direct report missing");
  });
  await t.check("profile and sections are isolated per company", async () => {
    const b = fixtures.companyB;
    expectStatus(await state.adminB.get(`/api/employees/${state.employeeId}/profile${q(b)}`), 404);
    expectStatus(await state.adminB.get(`/api/employees/${state.employeeId}/profile${q(cid)}`), 403);
    expectStatus(await state.adminB.get(`/api/employees/${state.employeeId}/bank-accounts${q(b)}`), 404);
    expectStatus(await emp.get(employeePath(state.employee2Id, "/bank-accounts")), 404);
  });
  await t.check("salary tab: current assignment breakdown for HR and the employee only", async () => {
    let r = await admin.post("/api/payroll/assignments", {
      companyId: cid,
      employeeId: state.employee3Id,
      structureId: state.structureId,
      ctcAnnual: 600000,
      effectiveFrom: "2020-01-01",
    });
    expectStatus(r, 201);
    r = await admin.get(employeePath(state.employee3Id, "/salary"));
    expectStatus(r, 200);
    const b = r.data.breakdown;
    expect(r.data.current?.structure_name === "E2E Standard", JSON.stringify(r.data.current));
    expect(b.gross === 45000 && b.totalDeductions === 3800 && b.net === 41200 && b.employer === 1800 && b.monthlyCtc === 50000, JSON.stringify(b));
    expect(b.earnings.length === 3 && b.deductions.length === 2, JSON.stringify(b));
    expectStatus(await emp.get(employeePath(state.employee3Id, "/salary")), 404);
    r = await emp.get(employeePath(state.employeeId, "/salary"));
    expectStatus(r, 200);
    expect(r.data.current === null && r.data.assignments.length === 1, JSON.stringify(r.data));
  });
}

const PDF = Buffer.from("%PDF-1.4\n% E2E synthetic test file\n%%EOF\n");
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("E2E synthetic image")]);

function documentForm({ bytes = PDF, name = "e2e-identity.pdf", type = "application/pdf", category = "Identity", title = "E2E Identity Proof" } = {}) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  if (category !== null) form.append("category", category);
  if (title !== null) form.append("title", title);
  return form;
}

export async function documentsSuite(t, { fixtures, state, pool }) {
  const admin = state.adminA;
  const emp = state.employeeA;
  const cid = fixtures.companyA;
  const docs = (id, suffix = "") => `/api/employees/${id}/documents${suffix}${q(cid)}`;

  await t.check("employee uploads their own PDF; it starts as Pending", async () => {
    const r = await emp.upload(docs(state.employeeId), documentForm());
    expectStatus(r, 201);
    const d = r.data.document;
    expect(d.verification_status === "Pending" && d.mime_type === "application/pdf" && d.size_bytes === PDF.length, JSON.stringify(d));
    state.documentId = String(d.id);
  });
  await t.check("content, category, title and size are validated", async () => {
    const list = await emp.get(docs(state.employeeId));
    const max = list.data.maxBytes;
    expectStatus(await emp.upload(docs(state.employeeId), documentForm({ bytes: Buffer.from("plain text, not a PDF") })), 415);
    expectStatus(await emp.upload(docs(state.employeeId), documentForm({ category: "Photo" })), 415);
    expectStatus(await emp.upload(docs(state.employeeId), documentForm({ category: "Secret" })), 400);
    expectStatus(await emp.upload(docs(state.employeeId), documentForm({ title: "" })), 400);
    const big = Buffer.concat([PDF, Buffer.alloc(max)]);
    expectStatus(await emp.upload(docs(state.employeeId), documentForm({ bytes: big })), 413);
  });
  await t.check("uploads need an allowed Origin and access to the employee", async () => {
    expectStatus(await emp.upload(docs(state.employeeId), documentForm(), { origin: null }), 403);
    expectStatus(await emp.upload(docs(state.employee2Id), documentForm()), 404);
    expectStatus(await state.adminB.upload(`/api/employees/${state.employeeId}/documents${q(fixtures.companyB)}`, documentForm()), 404);
  });
  await t.check("profile photo must be an image and is exposed on the profile", async () => {
    const r = await emp.upload(
      docs(state.employeeId),
      documentForm({ bytes: PNG, name: "e2e-photo.png", type: "image/png", category: "Photo", title: "E2E Photo" })
    );
    expectStatus(r, 201);
    const profile = await emp.get(`/api/employees/${state.employeeId}/profile${q(cid)}`);
    expect(profile.data.photoDocumentId === String(r.data.document.id), JSON.stringify(profile.data.photoDocumentId));
  });
  await t.check("download and view return the exact bytes with safe headers", async () => {
    let r = await emp.request("GET", `${docs(state.employeeId, `/${state.documentId}`)}&download=1`, { raw: true });
    expect(r.status === 200 && r.bytes.equals(PDF), `status ${r.status}`);
    expect(r.headers.get("content-type") === "application/pdf", r.headers.get("content-type"));
    expect(r.headers.get("x-content-type-options") === "nosniff", "nosniff missing");
    expect((r.headers.get("cache-control") || "").includes("no-store"), "no-store missing");
    expect((r.headers.get("content-disposition") || "").startsWith("attachment;"), r.headers.get("content-disposition"));
    r = await admin.request("GET", docs(state.employeeId, `/${state.documentId}`), { raw: true });
    expect(r.status === 200 && (r.headers.get("content-disposition") || "").startsWith("inline;"), "inline view failed");
  });
  await t.check("other employees and other companies cannot list or read documents", async () => {
    expectStatus(await emp.get(docs(state.employee2Id)), 404);
    expectStatus(await state.adminB.get(`/api/employees/${state.employeeId}/documents${q(fixtures.companyB)}`), 404);
    expectStatus(await state.adminB.get(docs(state.employeeId)), 403);
    const r = await state.adminB.request("GET", `/api/employees/${state.employeeId}/documents/${state.documentId}${q(fixtures.companyB)}`, { raw: true });
    expect(r.status === 404, `status ${r.status}`);
  });
  await t.check("verification: managers only, never their own documents, rejection needs a reason", async () => {
    expectStatus(await emp.patch(docs(state.employeeId, `/${state.documentId}`), { action: "verify" }), 403);
    expectStatus(await state.hrA.patch(docs(state.employeeId, `/${state.documentId}`), { action: "reject" }), 400);
    const r = await state.hrA.patch(docs(state.employeeId, `/${state.documentId}`), { action: "verify" });
    expectStatus(r, 200);
    expect(r.data.document.verification_status === "Verified" && r.data.document.verified_by_name === "E2E HR Manager A", JSON.stringify(r.data.document));
    const own = await state.hrA.upload(docs(state.employee2Id), documentForm({ title: "E2E HR Own Document" }));
    expectStatus(own, 201);
    expectStatus(await state.hrA.patch(docs(state.employee2Id, `/${own.data.document.id}`), { action: "verify" }), 403);
    expectStatus(await admin.patch(docs(state.employee2Id, `/${own.data.document.id}`), { action: "reject", note: "Test rejection" }), 200);
  });
  await t.check("every upload, view, download and verification is audited", async () => {
    const rows = await pool.query("SELECT action FROM employee_document_events WHERE document_id = $1 ORDER BY id", [state.documentId]);
    const actions = rows.rows.map((r) => r.action).join(",");
    expect(actions === "upload,download,view,verify", actions);
  });
  await t.check("removal is manager-only and keeps the record for audit", async () => {
    expectStatus(await emp.delete(docs(state.employeeId, `/${state.documentId}`)), 403);
    expectStatus(await admin.delete(docs(state.employeeId, `/${state.documentId}`)), 200);
    const r = await emp.request("GET", docs(state.employeeId, `/${state.documentId}`), { raw: true });
    expect(r.status === 404, `status ${r.status}`);
    const list = await emp.get(docs(state.employeeId));
    expect(!list.data.documents.some((d) => String(d.id) === state.documentId), "deleted document listed");
    const row = await pool.query("SELECT deleted_at, deleted_by FROM employee_documents WHERE id = $1", [state.documentId]);
    expect(row.rows[0].deleted_at && String(row.rows[0].deleted_by) === fixtures.users.adminA.userId, JSON.stringify(row.rows[0]));
  });
}

export async function multiCompanySuite(t, { ApiClient, fixtures }) {
  const user = fixtures.users.multi;
  const client = new ApiClient("multi");
  await client.login(user);
  const a = fixtures.companyA;
  const b = fixtures.companyB;

  await t.check("a user with two memberships sees both companies and their roles", async () => {
    const me = await client.get("/api/auth/me");
    expectStatus(me, 200);
    const roles = Object.fromEntries(me.data.memberships.map((m) => [String(m.companyId), m.role]));
    expect(Object.keys(roles).length === 2 && roles[a] === "employee" && roles[b] === "hr_manager", JSON.stringify(roles));
  });
  await t.check("the HR manager role applies only in company B", async () => {
    expectStatus(await client.post("/api/departments", { companyId: b, departmentName: "E2E Multi Dept" }), 201);
    expectStatus(await client.get(`/api/members${q(b)}`), 200);
    expectStatus(await client.post("/api/departments", { companyId: a, departmentName: "E2E Multi Dept" }), 403);
    expectStatus(await client.get(`/api/members${q(a)}`), 403);
    const list = await client.get(`/api/employees${q(a)}`);
    expect(list.data.employees.every((e) => !("email" in e)), "employee view in A leaked contact details");
  });
}

export async function provisionalPayrollSuite(t, { fixtures, state }) {
  const admin = state.adminB;
  const b = fixtures.companyB;

  await t.check("without an approved policy a run is provisional and cannot be finalized", async () => {
    expectStatus(await admin.post("/api/designations", { companyId: b, designationName: "E2E B Role" }), 201);
    let r = await admin.post("/api/employees", {
      companyId: b,
      employeeCode: "E2E-B-001",
      name: "E2E B Employee",
      department: "E2E B Dept",
      designation: "E2E B Role",
      email: "e2e.b-employee@elva-test.invalid",
    });
    expectStatus(r, 201);
    const employeeId = String(r.data.employee.id);
    r = await admin.post("/api/payroll/components", { companyId: b, name: "E2E B Pay", componentType: "Earning", calculationType: "Fixed" });
    expectStatus(r, 201);
    const componentId = String(r.data.component.id);
    r = await admin.post("/api/payroll/structures", { companyId: b, name: "E2E B Structure" });
    expectStatus(r, 201);
    const structureId = String(r.data.structure.id);
    r = await admin.request("PUT", `/api/payroll/structures/${structureId}/components${q(b)}`, {
      body: { components: [{ componentId, amount: 10000 }] },
    });
    expectStatus(r, 200);
    r = await admin.post("/api/payroll/assignments", { companyId: b, employeeId, structureId, ctcAnnual: 120000, effectiveFrom: "2099-01-01" });
    expectStatus(r, 201);
    r = await admin.post("/api/payroll/runs", { companyId: b, year: 2099, month: 2 });
    expectStatus(r, 201);
    const runId = String(r.data.run.id);
    r = await admin.patch(`/api/payroll/runs/${runId}${q(b)}`, { action: "process" });
    expectStatus(r, 200);
    expect(r.data.provisional === true && r.data.policyVersion === null, JSON.stringify(r.data));
    expect(r.data.warnings.some((w) => w.startsWith("Provisional")), JSON.stringify(r.data.warnings));
    const run = await admin.get(`/api/payroll/runs/${runId}${q(b)}`);
    expect(run.data.run.is_provisional === true && run.data.payslips[0].calculation_detail.provisional === true, "not marked provisional");
    r = await admin.patch(`/api/payroll/runs/${runId}${q(b)}`, { action: "finalize" });
    expectStatus(r, 409);
    expectStatus(await admin.patch(`/api/payroll/runs/${runId}${q(b)}`, { action: "cancel" }), 200);
    state.provisionalChecked = true;
  });
  await t.check("company A's approved policy is not visible to or used by company B", async () => {
    const r = await admin.get(`/api/policy${q(b)}`);
    expectStatus(r, 200);
    expect(r.data.policy.version === 0 && r.data.policy.approved_snapshot === null, JSON.stringify(r.data.policy));
  });
}
