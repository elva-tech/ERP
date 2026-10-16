# ELVA ERP architecture principles

## 1. Domain boundaries
Organize code around business capabilities. A module owns its rules and authoritative data; other modules use documented contracts.

## 2. Multi-tenancy by design
Tenant context is established by trusted server-side identity. Every tenant-owned query, mutation, background task, export, report, cache entry, file operation, and integration must be tenant-scoped. Consider database-level controls as defense in depth.

## 3. Least privilege
Permissions are enforced server-side and at the point of data access. HR and payroll require fine-grained access controls.

## 4. Financial and employment-record integrity
Do not silently overwrite finalized payroll or posted financial records. Use controlled correction, reversal, adjustment, or amendment workflows with audit history where appropriate.

## 5. Configuration before customization
Use tenant configuration, module entitlements, workflows, and documented extension points instead of customer-name-specific code.

## 6. API-first, not database-first integration
Cross-module and external integrations use explicit APIs/events. Avoid shared-table coupling.

## 7. Auditability and data lineage
Sensitive changes should have actor, timestamp, reason/context, and outcome where appropriate. Reports should have traceable definitions and data sources.

## 8. Technology neutrality with operational discipline
Architecture contracts should not assume one language. Each deployable component still needs a declared runtime, support owner, dependency policy, security scanning, tests, logging, monitoring, and deployment process. Avoid a polyglot stack without a clear benefit.

## 9. Modular monolith as a valid starting point
A single deployable application with clear internal boundaries is often the simplest start. Extract a service only when scale, ownership, isolation, or release independence justifies the added operational burden.

## 10. Privacy by design
Use data minimization, retention rules, access logging where appropriate, encryption, and synthetic test data. HR information is sensitive even when it is not legally classified as special-category data.
