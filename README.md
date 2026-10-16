# ELVA ERP

A modular, multi-tenant ERP platform designed to support shared business capabilities and industry-specific modules.

## Repository principles

- **Platform-first:** identity, tenant context, permissions, audit, configuration, and module registration are shared capabilities.
- **Modular by domain:** HR, Finance, Procurement, Inventory, EMS, Manufacturing, and PMS own their business rules and data boundaries.
- **Technology-neutral architecture:** domain contracts and architecture rules are not tied to a specific language or framework.
- **API-first integration:** modules integrate through documented APIs/events, not by reaching into another module's internal implementation.
- **Secure by default:** tenant isolation, least privilege, auditability, and sensitive-data protection are design requirements.
- **Configuration before customer-specific code:** customer variation should use configuration, permissions, workflows, and extension points.
- **Incremental delivery:** create and maintain module folders as they are implemented; do not build empty scaffolding for every planned module.

## Current focus

The initial active module is **HR**. See [`modules/hr/README.md`](modules/hr/README.md).

## Suggested repository map

- `platform/` — cross-cutting platform capabilities and their contracts.
- `modules/` — business-domain modules.
- `packages/` — reusable libraries, SDKs, shared types, and UI components where appropriate.
- `contracts/` — API schemas, event definitions, and integration contracts.
- `apps/` — deployable applications or entry points, if/when needed.
- `infra/` — deployment, environments, observability, and infrastructure-as-code.
- `docs/` — architecture, ADRs, security, operations, and product documentation.
- `tools/` — repository automation and developer tooling.

The exact source-code layout inside `modules/hr/` should follow the HR team's actual language/framework and existing implementation. This starter does not force Django, Python, Node.js, Java, .NET, or any other stack.

## Before implementation

1. Read [`docs/architecture/principles.md`](docs/architecture/principles.md).
2. Review the open decisions in [`docs/decisions/README.md`](docs/decisions/README.md).
3. Agree the current HR stack and developer workflow with the team.
4. Record significant technical choices as Architecture Decision Records (ADRs).
5. Add CI checks for the languages and tools actually used by the project.

## Non-negotiable tenancy rule

Tenant identity must be derived and validated by trusted server-side authentication/context. Never trust a tenant ID supplied only by the client. Every tenant-owned read/write path must enforce tenant scope, including background jobs, exports, reports, search, caches, files, and integrations.
