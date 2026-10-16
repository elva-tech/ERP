# API conventions (initial proposal)

These are defaults to review and ratify; they are not yet a finalized standard.

- Use HTTPS outside local development.
- Use a consistent URL/versioning strategy, such as `/api/v1/`.
- Validate inputs at the boundary and return a consistent error envelope.
- Enforce authentication, authorization, and tenant scope on the server.
- Support pagination and filtering for collection endpoints.
- Use idempotency keys for retryable operations with side effects where appropriate.
- Include correlation/request IDs in logs and error responses.
- Do not expose internal database identifiers or sensitive fields unnecessarily.
- Never treat frontend-hidden controls as authorization.
