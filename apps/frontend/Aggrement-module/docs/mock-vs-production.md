# ELVA ERP — Mock Mode vs. Production Real API Architecture

**Document ID:** ELVA-ARCH-MOCK-002  
**Version:** 2.0  
**Updated:** 3 November 2026  

---

## 1. Architectural Strategy

The Agreement Store delivers a clean dual-mode execution model where UI components remain free of conditional flags or environment checks:

```
[UI Components (Table, Cards, Modal, Drawer)]
                      │
                      ▼
          [Feature Service Modules]
  (agreementService, agreementSummaryService,
   subcontractorLookupService, projectLookupService)
                      │
            Mode Selector (env.js)
             /              \
            /                \
           ▼                  ▼
     [Mock Adapter]     [Central API Client]
     (Multi-Tenant)     (Fetch, Auth, Timeout, Idempotency)
           │                  │
           ▼                  ▼
    [Mock Storage]      [Real ERP Backend]
(Isolated Tenant Keys)  (Cookie / Session Scoped)
```

---

## 2. Multi-Tenant Mock Environment

Mock mode includes a full multi-tenant mock testing environment. When switching demo tenants, **the entire application context updates dynamically**:

1. **Company Name & Branding:** Changes logo (e.g. SBP Red Square vs. ELVA Teal), short code, subtitle, and brand accent colors.
2. **User Identity:** Updates displayed user profile, initials, email, and designation (e.g., `Mr. Sandeep Patil, Director, Legal & Compliance` vs. `Ms. Priya Sharma, VP, Commercial & Contracts`).
3. **Financial Year:** Updates active financial year context (e.g. `FY 25` vs. `FY 2026-27`) and reflects across all KPI cards.
4. **Master Data Records:**
   - Subcontractor master records switch to the active tenant's authorized contractors.
   - Project master records switch to the active tenant's authorized sites.
5. **Agreement Register:** Loads exclusively the active tenant's subcontract agreements.
6. **Dashboard & KPIs:** Dynamically recalculates portfolio metrics using only the active tenant's contracts.

### Supported Demo Tenants

| Attribute | Tenant A (SB Patil Group) | Tenant B (ELVA Demo Construction) |
|---|---|---|
| **Tenant ID** | `tenant-sbp-demo` | `tenant-elva-demo` |
| **Company Name** | SB Patil Group | ELVA Demo Construction |
| **Short Code / Logo** | SBP (Red Square) | ELVA (Teal Mark) |
| **Financial Year** | FY 25 | FY 2026-27 |
| **User Profile** | Mr. Sandeep Patil | Ms. Priya Sharma |
| **User Role** | Director, Legal & Compliance | VP, Commercial & Contracts |
| **Subcontractors** | ABC Constructions, XYZ Electricals, L&T, Tata Power, MSEDCL, MIDC, HDFC | Kumar Constructions, Prime Electricals, Apex Infrastructure, Vanguard MEP |
| **Projects** | Bangalore Residential, Mysore Commercial, Pune Metro, Baramati Substation, SBP IT Park | Chennai Highway, Hyderabad Office Campus, Coimbatore Logistics Hub |
| **Agreement Numbers** | `AG-1001` through `AG-1498+` | `AG-2001` through `AG-2004+` |

---

## 3. Mock Data Storage & Complete Isolation

Mock records are stored using isolated tenant storage keys:
- Tenant A Key: `agreement-mock:tenant-sbp-demo`
- Tenant B Key: `agreement-mock:tenant-elva-demo`
- Active Tenant Key: `agreement-mock:active-tenant-id`

### Isolation Guarantees
- **No Cross-Tenant Pollution:** Agreements created under Tenant A are stored strictly under Tenant A's storage key and are never exposed when switched to Tenant B.
- **Independent Persistence:** Changes in Tenant A persist when switching to Tenant B and back.
- **Referential Integrity & Cross-Tenant Rejection:** Creating an agreement with a subcontractor or project belonging to another tenant is strictly rejected with HTTP 422.
- **Tenant-Scoped Numbering:** Unique agreement IDs and numbers are generated within the tenant's number sequence.

---

## 4. Production Authentication & Tenant Security

In production mode (`VITE_API_MODE=real`), security strictly adheres to the existing ERP authentication architecture:
1. **No Client-Supplied Tenant ID:** `VITE_TENANT_ID` has been removed from production authorization logic. The frontend never injects a tenant ID header or claim.
2. **Backend Session Resolution:** Tenant identity and user permissions are derived exclusively by the backend from the authenticated session (HTTP-only cookies via `credentials: "include"`).
3. **Session Verification (`GET /procurement/session`):** On startup, `SessionProvider` retrieves the user's authenticated profile and organization context.
4. **Mock Selector Hidden:** The Mock Tenant Selector is strictly omitted in production mode.
5. **Unauthorized Handling:** Any 401 response emits `agreement:unauthorized` (and `procurement:unauthorized`), initiating the ERP re-authentication workflow.
6. **Zero Silent Fallback:** If a real API endpoint is unavailable, an explicit error banner is rendered. Mock data is never silently substituted.

---

## 5. Mode Configuration Summary

| Setting | Mock Mode | Production Real Mode |
|---|---|---|
| `VITE_API_MODE` | `mock` | `real` |
| `VITE_API_BASE_URL` | *(Ignored)* | `https://api.erp.elvatech.com/api/v1` |
| **Tenant Source** | Selected Mock Tenant (`mockStore`) | Backend Authenticated Session Cookie |
| **Mock Tenant Selector** | Visible in TopBar | Hidden / Not Rendered |
| **Subcontractor Master** | Mock Tenant Subcontractors | `GET /procurement/lookups/subcontractors` |
| **Project Master** | Mock Tenant Projects | `GET /procurement/lookups/projects` |
| **User Profile / Branding** | Demo Tenant Configuration | `session.user` / `session.tenant` |
