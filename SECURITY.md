# Security policy

Report suspected vulnerabilities privately to the designated ELVA security contact. Do not publish exploit details or sensitive customer data in public issues.

## Minimum requirements

- Enforce authentication and server-side authorization.
- Derive tenant context from trusted identity/session/token claims and validate it server-side.
- Scope every tenant-owned data access path to the authenticated tenant.
- Apply least privilege and separate sensitive HR/payroll permissions.
- Keep audit records for sensitive reads and writes where required by policy.
- Encrypt traffic and protect secrets using approved secret management.
- Avoid logging passwords, tokens, bank details, government identifiers, or unnecessary employee personal data.
- Use synthetic or anonymized data in development and testing.
