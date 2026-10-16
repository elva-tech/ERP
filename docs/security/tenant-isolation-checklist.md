# Tenant-isolation review checklist

For every tenant-owned resource, verify:

- [ ] Tenant context comes from trusted server-side identity.
- [ ] Requests cannot choose another tenant by changing a URL, body, header, or query parameter.
- [ ] List and detail queries are scoped.
- [ ] Create/update/delete operations validate tenant ownership.
- [ ] Related-object IDs cannot be used to cross tenant boundaries.
- [ ] Search, reports, exports, and bulk actions are scoped.
- [ ] Background jobs carry validated tenant context.
- [ ] Caches include tenant scope in keys.
- [ ] Files and document links enforce tenant and object permissions.
- [ ] Integrations/webhooks validate tenant mapping and signatures.
- [ ] Audit records capture the correct tenant and actor.
- [ ] Automated negative tests attempt cross-tenant access.
