# HR module — implementation home

This is the initial active business module. Keep the implementation in this directory, using the team's chosen language/framework. This repository does not prescribe a framework.

## Scope to define with the HR team

Potential capability areas (confirm against the approved HR requirements):
- Organization structure, legal entities, locations, departments, designations
- Employee profile and employment lifecycle
- Employee documents and access control
- Attendance, shifts, holidays, and leave
- Payroll inputs, payroll processing, payslips, and statutory calculations
- Claims/expenses, if in scope
- Employee and manager self-service
- Approvals and notifications
- HR reports and exports
- Integrations with finance, identity, attendance devices, banks, and statutory systems

Do not assume all items above are in the current release; maintain a scoped backlog and release plan.

## Module boundary

- HR owns HR domain rules and its authoritative HR records.
- Use platform identity/authorization contracts; do not create a separate, incompatible user/role system without an ADR.
- Publish supported APIs/events for other modules.
- Avoid direct writes into Finance, Inventory, or other module-owned data.
- Treat payroll, compensation, government identifiers, bank information, and employee documents as sensitive data.
- Apply tenant scoping to all reads, writes, exports, background jobs, files, and reports.

## Suggested internal organization

Adapt this to the chosen stack; do not create empty directories just to match this example.

- `domain/` — domain entities and business rules
- `application/` — use cases / orchestration
- `api/` — HTTP endpoints and request/response validation
- `persistence/` — repository and database implementation
- `integrations/` — external-system adapters
- `jobs/` — scheduled/background work
- `tests/` — unit, integration, API, authorization, and tenant-isolation tests
- `docs/` — module-specific decisions and workflow documentation

## Definition of done

- Business rules are tested, including edge cases.
- Permission checks are server-side and deny by default.
- Tenant isolation tests cover list, detail, update, delete, exports, files, and background jobs.
- Sensitive operations are auditable.
- Personal data is minimized in logs and test fixtures.
- API and event contracts are documented.
- Migrations and rollback considerations are reviewed.
