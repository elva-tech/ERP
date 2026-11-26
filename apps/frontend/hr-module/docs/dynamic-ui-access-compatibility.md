# ELVA ERP — UI dynamic access compatibility (HR module)

## Review findings

| Area | Finding |
|------|---------|
| Navigation | Single registry in `src/routes.jsx`; visibility previously filtered by coarse `access` levels (`all`, `manager`, `admin`, …) in `src/navigation.js`. |
| Auth | `AuthGate.jsx` loads `/api/auth/me`; no global context — props passed into `App`. |
| Actions | Migrated to `useModuleAccess()` / `Can` + `HR.*` codes; `helpers.canManage` only for legacy nav fallback when `permissionCodes` is empty. |
| Routes | Hash routes in `App.jsx` with `pageAllowed` based on accessible sections — no dedicated access-denied UX. |
| Tenancy | Company switch via `localStorage` + `App` remount; permissions were not refreshed from the server. |
| Backend | Per-route `requireCompanyAccess`; no permissions payload on session (until this change). |

## Components / screens touched

- **New:** `src/permissions/*` (catalog, access helpers, `AccessProvider`, `Can`, `AccessDenied`)
- **Updated:** `navigation.js`, `App.jsx`, `AuthGate.jsx`
- **Backend:** `lib/hrms-permission-catalog.js`, `lib/hrms-access.js`, `GET /api/auth/me`, `GET /api/access/context`

Screen modules use permission-backed flags (`useModuleAccess`) for create/edit/delete/export; `access.jsx` keeps minimal role rules aligned with backend membership lifecycle (self-revoke, admin-only grants).

## Permission-handling approach

1. **Backend** resolves `permissionCodes` per company membership from IAM-ready role templates (`company_admin`, `hr_manager`, `employee`, plus `payroll_executive` / `recruiter` templates for future roles).
2. **`/api/auth/me`** embeds `membership.access` (application, tenant, roles, codes, action map, scopes placeholder).
3. **`/api/access/context?companyId=`** refreshes access after tenant switch without a full reload.
4. **Frontend** maps route IDs → view permissions (`permissions/catalog.js`) and filters menus via `canAccessItem`.
5. **`AccessProvider`** exposes `hasPermission`, `canViewRoute`, `canPerform`, `canMutateWorkspace`, `canApproveInbox`.
6. **Legacy fallback:** if `permissionCodes` is empty (stale client), navigation falls back to previous `access` levels until the session is refreshed.

## Sample roles (TL role division v1.0)

| TL role | `membership.role` | Example menus |
|---------|-------------------|---------------|
| HR ADMIN | `company_admin` | Full HRMS menu (incl. devices, shifts, payroll processing, PF/ESIC, users) |
| HR | `hr_manager` | Dashboard, directory ops, attendance ops (no devices/raw/shift/roster), leave ops (no types/carry-forward), payslips; **no** payroll config, PF/ESIC, users |
| EMPLOYEE | `employee` | Dashboard, my attendance/regularization, leave self-service, payslips, my profile; **no** directory or admin sections |

Verified by unit tests: `src/permissions/access.test.js`, `src/navigation.test.js`, backend `tests/unit/hrms-access.test.mjs`.

## Integration dependencies (IAM / ERP)

- [ ] ELVA IAM to supply authoritative `permissionCodes` per app + tenant (replace role templates).
- [ ] Optional organisation scopes (legal entity, branch, department) in `access.scopes`.
- [ ] Shared permission catalog package for Finance / Inventory / Procurement frontends.
- [x] Fine-grained action wiring on HR screens (interim catalog; IAM remains source of truth at cutover).
- [ ] Backend route mapping from permission codes (today still uses `MANAGER_ROLES` / `ADMIN_ROLES`).

## Security note

Hiding menus and buttons is **not** authorization. All mutations remain validated by HRMS API routes.