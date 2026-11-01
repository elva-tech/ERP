
# API conventions

These conventions define the current API standards for the project.

- Use HTTPS outside local development.
- Use `/api/` as the current API URL prefix consistently across frontend and backend routes.
- Introduce explicit API versioning (for example, `/api/v1/`) only through a coordinated frontend and backend migration.
- Validate inputs at the boundary and return a consistent error envelope.
- Enforce authentication, authorization, and tenant scope on the server.
- Support pagination and filtering for collection endpoints.
- Use idempotency keys for retryable operations with side effects where appropriate.
- Include correlation/request IDs in logs and error responses.
- Do not expose internal database identifiers or sensitive fields unnecessarily.
- Never treat frontend-hidden controls as authorization.
