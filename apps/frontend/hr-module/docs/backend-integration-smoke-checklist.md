# HRMS backend integration smoke checklist

This checklist is for a test environment with the HR backend running and an authenticated company session. It is not a claim that the backend routes have been verified.

## Preconditions

- Obtain the supported HR backend startup instructions from the backend owner. The backend README in the supplied review bundle is only a placeholder.
- Configure `VITE_API_BASE_URL` to the test backend.
- Sign in with test accounts representing company admin, HR manager, approver/delegate, and employee roles.
- Use a non-production test tenant and synthetic test records.

## Required smoke-test sequence

1. Sign in through the frontend with an authorized test account. The prior Postman login returned `401 Unauthorized — Invalid email or password`; this checklist does not assume that credential issue is resolved.
2. Verify `GET /api/auth/me` returns the authenticated session and expected company memberships.
3. Load the employee directory and verify the response is limited to the active test company.
4. Load attendance records for a selected date and verify the response and filters.
5. Load leave balances and requests; submit only a synthetic test request if the test tenant is approved for writes.
6. Make a read-only payroll API request, such as listing runs or payslips. Do not create, process, finalize, or otherwise execute a payroll run as part of this smoke check.
7. Verify an unauthenticated protected request is rejected and the frontend returns to its authentication flow.
8. Attempt a cross-tenant read with a second authorized test account and verify that the first tenant's records are not returned.
9. Attempt a payroll operation that the current test role is not permitted to perform and verify the backend rejects it. Do not run payroll.
10. Expire or revoke the test session, verify protected requests are rejected, then log out and confirm the session is cleared.

Use only authorized test accounts and approved synthetic test data. These checks must not modify real employee, company, attendance, leave, or payroll records.

## Read-path checks

- Session: `GET /api/auth/me` returns the current authenticated member and memberships.
- Company lists: employees, departments, designations, and members are scoped to the selected `companyId`.
- Attendance: dashboard, records, punches, shifts, rosters, devices, and regularization endpoints return their documented envelopes.
- Leave: types, balances, requests, holidays, and approvals return the expected records and status fields.
- Payroll: structures, components, assignments, runs, run detail, payslips, advances, and statutory reports return the expected envelopes.
- Approvals: pending approval notifications match the records the current member is authorized to review.

## Write-path checks

- Employee create/update and login linking obey tenant membership and role rules.
- Attendance regularization create/review actions are audited and reject unauthorized actors.
- Leave request, approval, rejection, cancellation, and allocation changes are persisted and audited.
- Payroll run creation, processing, reprocessing, finalization, and cancellation obey backend policy and authorization rules.
- Payslip and document access is restricted to the intended employee/company roles.
- Approval delegation grant/revoke rules prevent self-approval and enforce company-admin authority.

## Cross-tenant and authorization checks

- Repeat representative reads and writes using a second company ID; no records from the first tenant may leak.
- Attempt manager/admin endpoints as an employee; the server must reject unauthorized requests even if a client hides the UI.
- Attempt direct API requests outside the UI to verify backend enforcement.

## Evidence to attach to PR

Record the backend commit/version, test environment, roles used, endpoints exercised, request IDs, and pass/fail results. Never attach real employee personal data, passwords, cookies, or tokens.

## API version decision

The repository contract currently describes `/api/v1/` as a proposal, not a ratified HR API. Confirm the actual HR backend routes and an owner-approved migration plan before changing the frontend's current `/api/...` paths.

## Payroll idempotency decision

`POST /api/payroll/runs` now accepts `Idempotency-Key`. Keys are scoped by authenticated user and company; matching retries replay the saved 201 response, while reuse with a different payload returns 409. The key is hashed at rest, and the idempotency row and payroll run are committed in one transaction. The database migration must be applied to an isolated test database before endpoint integration testing; no migration was applied during this review. No live idempotency request has been executed. The current design retains keys until the associated user or company is deleted, so the backend owner should define an archival policy before production use at scale.
