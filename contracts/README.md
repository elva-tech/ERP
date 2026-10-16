# Shared contracts

Keep versioned, technology-neutral contracts here where practical.

Examples:
- OpenAPI specifications for HTTP APIs
- JSON Schema for events and payloads
- Error response conventions
- Pagination, idempotency, and correlation-ID conventions

Rules:
- A contract is a supported interface, not a mirror of internal database models.
- Prefer backward-compatible additions.
- Version breaking changes and document a migration window.
- Do not include secrets or real employee/customer data in examples.
