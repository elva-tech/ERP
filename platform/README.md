# Platform capabilities

This directory is for capabilities shared across modules. Implement only when needed, with explicit ownership and contracts.

Likely capabilities:
- Tenant registry and tenant context
- Identity, authentication, and SSO integration
- Authorization / role and permission model
- Module registry and entitlements
- Audit trail
- Configuration and feature flags
- Workflow primitives
- Document/file metadata and access control
- Notifications
- Observability and operational health

Platform components must not become a dumping ground for business-specific logic. HR rules belong in HR; finance posting rules belong in Finance.
