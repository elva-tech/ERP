# ELVA TECH HR & Payroll ERP — Backend API

Next.js (App Router) API for the ELVA TECH HRMS: companies and memberships,
employees, departments/designations, attendance, leave and payroll.
The React frontend lives in `apps/frontend/hr-module`.

- Runtime database access: `pg` pool in `lib/db.js` (reads `DATABASE_URL`).
- Prisma 7 is used for the schema, migrations and the `/api/health/prisma` check.
  The client is generated into `lib/generated/prisma` (gitignored).

## Requirements

- Node.js 20+ and npm
- PostgreSQL 15+ (developed against 17)

## 1. Install

```powershell
cd apps/backend/hr-module
npm install
cd ../../frontend/hr-module
npm install
```

## 2. Environment

Backend: copy `.env.example` to `.env.local` and fill in real values.
Frontend: optional `.env.local` with `VITE_API_BASE_URL` (defaults to `http://localhost:3000`).

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | backend | PostgreSQL URL. URL-encode special characters in the password. |
| `ALLOWED_ORIGINS` | backend | Comma-separated frontend origins. Required in production; localhost:5173 is allowed automatically in development. |
| `HRMS_TIMEZONE` | backend | IANA zone for attendance dates (default `Asia/Kolkata`). |
| `LOGIN_MAX_FAILURES`, `LOGIN_MAX_FAILURES_PER_IP`, `LOGIN_WINDOW_MINUTES` | backend | Login rate limits (defaults 5, 20, 15). |
| `TRUST_PROXY_HEADERS` | backend | `true` only behind a proxy that sets `X-Forwarded-For`. |
| `DOCUMENT_STORAGE_DIR` | backend | Private directory for employee documents (default `storage/documents`, gitignored). Production: a durable, backed-up private volume. |
| `DOCUMENT_MAX_BYTES` | backend | Per-file upload limit (default 5 MB, hard cap 25 MB). |
| `VITE_API_BASE_URL` | frontend | Backend base URL. |

Never commit `.env`, `.env.local` or real credentials. Shell environment
variables take precedence over `.env.local` for both Next.js and the Prisma CLI.

## 3. Database setup and migrations

Migrations live in `prisma/migrations`:

- `0_init` — baseline of the schema that existed before Prisma Migrate was adopted
  (generated from the live database; originally created by `scripts/*.sql`).
- `20261022000000_identity_payroll_security` — additive: `employees.user_id`
  login link, `payroll_advance_recoveries`, `login_attempts`, and the
  one-active-payroll-run-per-month partial unique index.
- `20261022160000_profile_documents_policies` — additive: employee profile
  fields, addresses, emergency contacts, bank accounts, employment history,
  employee documents and their audit log, designation–department links,
  approval delegates and their audit log, the company payroll policy, and
  `payroll_runs.policy_version` / `is_provisional`.

The migration role must own the tables it alters or references. If some tables
were created by another role (for example `departments` and `designations`
created by `postgres`), deploy fails with `permission denied for table ...`.
Fix it once as a PostgreSQL superuser, then re-run `npm run db:deploy`:

```sql
GRANT REFERENCES ON public.departments, public.designations TO hrms_app;
```

If a deploy failed part-way, check that nothing was applied (each migration
runs in one transaction) and mark it rolled back before retrying:
`npx prisma migrate resolve --rolled-back <migration_name> --config prisma7.config.ts`.

### New, empty database

```powershell
npm run db:deploy      # prisma migrate deploy — applies every migration in order
npm run db:status
```

### Existing database that already has the HRMS tables (baseline once)

1. Back up first: `pg_dump -Fc -d hrms_db -f hrms_db_backup.dump`
2. Rehearse on a copy or a test database.
3. Mark the baseline as already applied (records it only, runs no SQL):
   `npx prisma migrate resolve --applied 0_init --config prisma7.config.ts`
4. Apply the remaining migrations: `npm run db:deploy`
5. Verify: `npm run db:status` reports "Database schema is up to date!"

### Rules for shared / real databases

- **Never** run `prisma migrate dev`, `prisma migrate reset` or `prisma db push`
  against `hrms_db` or any database holding real data. They can drop or rewrite data.
- Only use `prisma migrate deploy` (and `migrate resolve` for baselining).
- Schema changes must be additive migrations reviewed as SQL before deploying.
- The partial unique index `payroll_runs_active_period_key`
  (`WHERE status <> 'Cancelled'`) cannot be expressed in `schema.prisma`.
  It is created by migration SQL. Do not apply `prisma migrate diff` or
  `prisma db pull` output blindly — they will not reproduce it.

## 4. Run

```powershell
# backend (http://localhost:3000); prisma generate runs automatically first
cd apps/backend/hr-module
npm run dev

# frontend (http://localhost:5173)
cd apps/frontend/hr-module
npm run dev
```

`start-hrms.bat` at the repository root starts both in separate windows.

Production: `npm run build` then `npm start` (set `NODE_ENV=production` and
`ALLOWED_ORIGINS`; session cookies are `Secure` in production, so serve over HTTPS).

Health checks:

- `GET /api/health` — API is running
- `GET /api/health/db` — PostgreSQL reachable (reports database name)
- `GET /api/health/prisma` — Prisma client can query

## 5. Tests

`npm run test:unit` runs the pure calculation tests in `tests/unit`
(payroll/LOP/rounding, leave day counting, night-shift punch pairing, policy
completeness). They need no database.

`tests/api.e2e.mjs` is an HTTP end-to-end suite. It creates and deletes
synthetic companies, users and records, so it **refuses to run unless**:

- `DATABASE_URL` names a database whose name contains `test` as a word
  (e.g. `hrms_test`), and
- the backend at `BASE_URL` reports that same database at `/api/health/db`.

Recommended setup (never point it at `hrms_db`):

```powershell
# one-time: create hrms_test (as a PostgreSQL superuser) and migrate it
$env:DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/hrms_test"
npm run db:deploy

# start a separate backend for the test database
npm run build
$env:ALLOWED_ORIGINS = "http://localhost:5174"
$env:DOCUMENT_STORAGE_DIR = "$PWD/storage/test-documents"   # keep test uploads apart
npx next start -p 3001

# in another shell (same DATABASE_URL)
$env:BASE_URL = "http://localhost:3001"
$env:TEST_ORIGIN = "http://localhost:5174"
node tests/api.e2e.mjs            # run and clean up
node tests/api.e2e.mjs --keep     # keep fixtures for manual UI testing
node tests/api.e2e.mjs --cleanup  # remove kept fixtures
```

Cleanup also deletes the stored files of fixture documents; set the same
`DOCUMENT_STORAGE_DIR` in the test shell as on the test backend.

To click through the UI against the test backend, start the frontend with
`$env:VITE_API_BASE_URL = "http://localhost:3001"; npx vite --port 5174`.

Lint and build: `npm run lint` and `npm run build` in each app.

## 6. Linking logins to employees

Self-service (own leave, attendance, payslips, advances) requires an explicit
link between a user account and an employee record (`employees.user_id`).
Emails are never matched automatically. An administrator or HR manager sets the
link in **Employees → Edit → Linked Login**. A login can be linked to at most
one employee per company.

## 7. HR and payroll features

Roles: `company_admin` (admin), `hr_manager` (manager), `employee`. Every
endpoint takes `companyId` and is checked against the caller's membership.

### Employee profile

| Endpoint | Access |
| --- | --- |
| `GET /api/employees/{id}/profile` | Managers and the employee: full profile. Other members: directory fields only. |
| `GET/POST /api/employees/{id}/addresses`, `PATCH/DELETE .../addresses/{itemId}` | Managers and the employee. |
| `GET/POST /api/employees/{id}/emergency-contacts`, `PATCH/DELETE .../{itemId}` | Managers and the employee. |
| `GET/POST /api/employees/{id}/bank-accounts`, `PATCH/DELETE .../{itemId}` | Managers edit. The employee sees masked account numbers. |
| `GET/POST /api/employees/{id}/history`, `PATCH/DELETE .../{itemId}` | Managers. Designation, department and status changes are logged automatically as system entries, which cannot be edited. |
| `GET /api/employees/{id}/salary` | Managers and the employee: earnings, deductions, employer contributions and net pay from the active assignment. |

Bank account numbers are stored in plain text (masked in responses to the
employee). Encryption at rest is still to be decided.

### Employee documents

`GET/POST /api/employees/{id}/documents`, `GET .../documents/{docId}[?download=1]`,
`PATCH .../documents/{docId} { action: verify | reject, note }`, `DELETE ...`.

- PDF, PNG and JPEG only, detected from the file content (the declared type is
  ignored); `Photo` accepts PNG/JPEG only. Size limit `DOCUMENT_MAX_BYTES`.
- Files are stored under `DOCUMENT_STORAGE_DIR` with server-generated names and
  served only through the authenticated API (`Cache-Control: no-store`). There
  are no public URLs.
- Managers verify, reject and remove; nobody verifies their own documents.
  Upload, view, download, verify, reject and delete are written to
  `employee_document_events`.
- Production still needs a durable private volume with backups, and
  malware scanning if required by company policy.

### Payroll policy

`GET /api/policy` (managers), `PUT /api/policy` (admin, saves a new draft
version), `POST /api/policy/approve { companyId, version }` (admin).

The settings (loss-of-pay mode and day basis, net-pay rounding, PF/ESIC/PT/TDS
treatment, overtime pay, leave day counting, night-shift punch window) have
**no defaults** — the company must decide each one. Payroll runs use the last
approved version. Until a version is approved, runs are **provisional** and
cannot be finalized. A run can only be finalized when it was processed with the
currently approved version. Statutory rates and thresholds are not built in;
they come from the salary components the company configures.

### Delegated approvals

Admins and HR managers cannot approve their own leave, regularization or
advance requests. A company admin can grant approval authority to another
member (`GET/POST /api/approvals/delegates`, `DELETE .../{delegateId}` revokes).
Delegates review those requests through `GET /api/approvals/pending` and the
usual approve/reject endpoints. Every decision is recorded in
`approval_audit_log` with the authority used (`manager` or `delegate`).
Self-approval stays blocked for delegates too.

### Leave carry-forward

`POST /api/leave/carry-forward { companyId, fromYear, apply }` (admin). With
`apply: false` it previews; with `apply: true` it writes next year's
`carry_forward` for active, paid leave types marked carry-forward, capped by the
type's limit. Expiry of carried-forward days is not implemented.

### Platform administration

Self-registered companies wait for a platform administrator
(`users.platform_role = 'platform_admin'`, created once with
`node scripts/create-platform-admin.mjs` using the `DATABASE_URL`, `ADMIN_EMAIL`,
`ADMIN_NAME` and `ADMIN_PASSWORD` environment variables):
`GET /api/admin/companies/pending` and
`PATCH /api/companies/{companyId}/approval { decision }`. In the UI a platform
administrator gets a **Platform admin** view with the pending list.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Cannot find module '.../lib/generated/prisma'` | Run `npm run prisma:generate` (runs automatically before `dev`/`build`). |
| `/api/health/db` fails | Check `DATABASE_URL`, that PostgreSQL is running, and that special characters in the password are URL-encoded. |
| Login returns 403 | The browser origin is not allowed. Add it to `ALLOWED_ORIGINS` (required in production). |
| Login returns 429 | Too many failed attempts; wait for the window (`LOGIN_WINDOW_MINUTES`) to pass. |
| `column "user_id" does not exist` / `relation "login_attempts" does not exist` | The database is missing the latest migration. Follow the baseline steps above. |
| "Your login is not linked to an employee record in this company." | Link the login under Employees → Linked Login. |
| `npm run db:status` shows `0_init` not applied on an existing DB | Baseline it with `migrate resolve --applied 0_init` — do not deploy `0_init` onto existing tables. |
| E2E tests refuse to run | They only run on a `*_test` database served by the backend under test. |
| `relation "approval_delegates" does not exist` (login works but `/api/auth/me` fails) | `20261022160000_profile_documents_policies` is not applied. Run `npm run db:deploy`. |
| `db:deploy` fails with `permission denied for table designations` | Run the `GRANT REFERENCES` statement from section 3 as a superuser, `migrate resolve --rolled-back` the failed migration, then deploy again. |
| "Payroll is provisional" / finalize refused | Approve the payroll policy (Payroll → Payroll Policy), then reprocess the run. |
