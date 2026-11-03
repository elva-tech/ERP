# ELVA ERP — Agreement Store Implementation Decisions & Assumptions

**Document ID:** ELVA-DEC-PROC-AGR-002  
**Version:** 2.0  
**Updated:** 3 November 2026  

---

## 1. Confirmed Integration Architecture

1. **Procurement Master-Data Connectivity:**
   - **Subcontractor Master:** Reuses existing Procurement lookup endpoint `GET /procurement/lookups/subcontractors`, with graceful fallback to `GET /procurement/subcontractors` and `GET /procurement/suppliers`. The dropdown preserves actual master record IDs (`id`), company names (`name`), and trade/category classifications. No second supplier database is created.
   - **Project Master:** Reuses existing Procurement lookup endpoint `GET /procurement/lookups/projects` and `GET /procurement/projects`, preserving actual project IDs (`id`), names, and locations.
   - **Referential Integrity:** In both real and mock modes, agreements store foreign key references (`subcontractorId`, `projectId`), never duplicated master data clones.

2. **Production Authentication & Tenant Isolation:**
   - **No Client Tenant Injection:** `VITE_TENANT_ID` has been removed from production authorization logic. The backend derives tenant identity from authenticated session cookies (`credentials: "include"`).
   - **Session Integration:** Uses existing ERP session architecture via `GET /procurement/session`.
   - **Unauthorized Handling:** Emits `agreement:unauthorized` on HTTP 401.

3. **Multi-Tenant Mock Testing Environment:**
   - **Independent Demo Tenants:** Supports Tenant A (`tenant-sbp-demo` - SB Patil Group) and Tenant B (`tenant-elva-demo` - ELVA Demo Construction).
   - **Complete Data Isolation:** Mock records are persisted under separate storage keys (`agreement-mock:tenant-sbp-demo` and `agreement-mock:tenant-elva-demo`). Switching tenants clears active in-memory caches, swaps master lookups, re-calculates KPIs, and re-renders the register.
   - **Cross-Tenant Reference Rejection:** Creating an agreement referencing a subcontractor or project from another tenant is strictly rejected with HTTP 422.
   - **Mock-Only Selector:** The demo tenant selector is rendered exclusively in mock mode and is never exposed in production.

4. **Dynamic Branding & User Identity:**
   - Hardcoded customer names ("SB Patil Group", "Mr. Sandeep Patil", "Director, Legal & Compliance", "FY 25") have been removed from production components.
   - In Mock Mode: Branding and user identity dynamically adapt to the selected demo tenant.
   - In Production Mode: Branding and user identity are populated from `session.tenant` and `session.user`.

---

## 2. Unresolved Product Owner Decisions

1. **Payment Schedule Line Items:** Clarification needed on whether structured milestone percentage allocations are required in v1 or if standard option selection is approved.
2. **Document Upload in Modal:** Clarification needed on whether document upload belongs in the creation modal or in the Agreement 360 detail view.
3. **Derived vs. Stored Expiry:** Confirmation needed on whether `expired` is derived purely from `endDate < today` or requires an explicit backend lifecycle mutation.
