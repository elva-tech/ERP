# Contributing to ELVA ERP

## Working agreements

- Create a short-lived branch for each change: `feature/hr-leave-policy`, `bugfix/hr-payroll-rounding`.
- Keep pull requests focused and reviewable.
- Add or update tests for business rules, authorization, tenant isolation, and failure cases.
- Include database migration and rollback considerations when applicable.
- Update API/event contracts and documentation when behavior changes.
- Do not commit secrets, real employee data, customer exports, or production logs.
- Do not bypass module boundaries by importing another module's internal implementation.

## Pull request checklist

- [ ] The change has a clear business purpose.
- [ ] Tests cover normal, boundary, and failure cases.
- [ ] Authorization and tenant isolation are enforced server-side.
- [ ] Audit and sensitive-data implications have been considered.
- [ ] API/event contracts and docs are updated where needed.
- [ ] Database migration and rollback implications are described.
- [ ] Logs avoid secrets and unnecessary personal data.
