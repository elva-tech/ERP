# ELVA ERP — Agreement Store Backend API Contract

**Document ID:** ELVA-API-PROC-AGR-002  
**Version:** 2.0  
**Status:** Integrated Architecture Baseline  
**Scope:** Procurement Subcontract Agreements & Commercial Contract Store  

---

## 1. Overview and Architecture Principles

The ELVA ERP Agreement Store frontend communicates with backend services using strict REST conventions. All API endpoints enforce:
1. **Multi-Tenant Context:** Tenant ID is derived solely from the authenticated session (JWT/Session Cookie). The client never supplies `tenant_id` as an authorization claim.
2. **Hierarchical Scope:** Records are filtered according to the user's assigned organisation, legal entity, and project boundaries.
3. **Consistent Envelope:** All responses adhere to standard JSON envelopes.
4. **Idempotency:** State-mutating requests (`POST`, `PATCH`) accept an `Idempotency-Key` header to prevent duplicate creations or submissions.
5. **Security & Audit:** Every mutating endpoint generates an immutable audit record containing actor ID, tenant, timestamp, correlation ID, and changed field deltas.

---

## 2. Master-Data API Integration (Procurement Reused Endpoints)

The Agreement Module directly reuses the existing Procurement and platform master data infrastructure:

| Endpoint | Method | Reused From | Purpose |
|---|---|---|---|
| `/procurement/session` | `GET` | Platform / Procurement Auth | Fetch authenticated session, user profile, organization, and permissions. |
| `/procurement/lookups/subcontractors` | `GET` | Procurement Lookups | Fetch authorized subcontractor options (`{ options: [{ value, label, subtext }] }`). |
| `/procurement/subcontractors` | `GET` | Procurement Subcontractor Master | Direct master list fallback for active subcontractors. |
| `/procurement/suppliers` | `GET` | Procurement Supplier Master | Direct master list fallback for supplier records. |
| `/procurement/lookups/projects` | `GET` | Procurement / Project Lookups | Fetch authorized project site options. |
| `/procurement/lookups/paymentSchedules` | `GET` | Procurement Lookups | Fetch standard payment terms and schedules. |

---

## 3. Agreement Store Specific Endpoints

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| `GET` | `/procurement/agreements` | List, filter and search subcontract agreements | Production Contract Implemented |
| `GET` | `/procurement/agreements/summary` | KPI portfolio summary metrics | Production Contract Implemented |
| `POST` | `/procurement/agreements` | Create draft or active agreement | Production Contract Implemented |
| `GET` | `/procurement/agreements/:id` | Retrieve agreement detail record | Production Contract Implemented |
| `PATCH` | `/procurement/agreements/:id` | Update permitted agreement fields | Proposed |
| `POST` | `/procurement/agreements/:id/submit` | Submit draft agreement for approval | Proposed |
| `POST` | `/procurement/agreements/:id/approve` | Approve agreement workflow step | Proposed |
| `POST` | `/procurement/agreements/:id/reject` | Reject agreement with feedback | Proposed |
| `POST` | `/procurement/agreements/:id/complete` | Complete agreement obligations | Proposed |
| `POST` | `/procurement/agreements/:id/terminate` | Terminate agreement with reason | Proposed |
| `GET` | `/procurement/agreements/:id/documents` | List attached agreement documents | Proposed |
| `POST` | `/procurement/agreements/:id/documents` | Upload signed contract / attachment | Proposed |
| `GET` | `/procurement/agreements/:id/history` | Audit trail and version history | Proposed |
| `GET` | `/procurement/agreements/export` | Export filtered agreements to CSV/Excel | Production Contract Implemented |

---

## 4. Detailed Endpoint Contracts

### 4.1 List Subcontract Agreements
- **Method / Path:** `GET /procurement/agreements`
- **Permission Required:** `procurement.agreement.read`
- **Query Parameters:**
  - `page` (integer, default: 1): Page number.
  - `pageSize` (integer, default: 10, max: 100): Records per page.
  - `status` (string, optional): Filter by status (`draft`, `pending_approval`, `active`, `expiring_soon`, `expired`, `completed`, `terminated`, `cancelled`, `pending_renewal`).
  - `search` (string, optional): Debounced search against agreement number, title, subcontractor name, project name, scope.
- **Success Response (200 OK):**
```json
{
  "items": [
    {
      "id": "agr-sbp-1102",
      "agreementNumber": "AG-1102",
      "agreementDate": "2024-01-15",
      "title": "MSEDCL Substation Lease Agreement",
      "subcontractor": {
        "id": "sub-sbp-005",
        "name": "MSEDCL Maharashtra"
      },
      "projectId": "proj-sbp-004",
      "projectName": "Baramati Substation EPC",
      "scopeOfWork": "33/11 kV Electrical substation land lease...",
      "scopeSummary": "33/11 kV Electrical substation lease & rights of way",
      "agreementValue": 24000000,
      "currencyCode": "INR",
      "startDate": "2024-01-15",
      "endDate": "2027-04-24",
      "status": "active",
      "renewalAttention": true,
      "owner": "Project Dept"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 234,
    "totalPages": 24,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

### 4.2 Get Agreement KPI Summary
- **Method / Path:** `GET /procurement/agreements/summary`
- **Permission Required:** `procurement.agreement.read`
- **Calculation Rules:**
  - `activeCount`: Total agreements where `status = 'active'`.
  - `cumulativeValue`: Sum of `agreementValue` for all active agreements.
  - `completedCount`: Total agreements where `status = 'completed'` within the tenant's current financial year.
  - `expiredOrPendingRenewalCount`: Total agreements where `status IN ('expired', 'pending_renewal')` or `endDate` falls within the renewal notice window (60 days).
- **Success Response (200 OK):**
```json
{
  "activeCount": 24,
  "cumulativeValue": 124500000,
  "completedCount": 18,
  "completedPeriodLabel": "FY 25",
  "expiredOrPendingRenewalCount": 6,
  "totalCount": 234,
  "currencyCode": "INR",
  "asOf": "2026-11-03T10:00:00.000Z"
}
```

---

### 4.3 Create Subcontract Agreement
- **Method / Path:** `POST /procurement/agreements`
- **Permission Required:** `procurement.agreement.create`
- **Headers:**
  - `Content-Type: application/json`
  - `Idempotency-Key: <UUID>` (mandatory to prevent double submissions)
- **Request Body (9 Figma fields):**
```json
{
  "title": "Pune Metro Line 3 Overhead Electrification Package",
  "subcontractorId": "sub-sbp-004",
  "projectId": "proj-sbp-003",
  "startDate": "2026-06-01",
  "endDate": "2028-05-31",
  "scopeOfWork": "25 kV AC Traction overhead equipment, switching stations and SCADA integration.",
  "agreementValue": "48500000",
  "paymentSchedule": "Monthly Progress Billing (30-day credit)",
  "termsAndConditions": "Defect liability period of 24 months post commissioning."
}
```
- **Validation Rules:**
  - `title`: string, required, length between 3 and 200 chars.
  - `subcontractorId`: string, required, must reference valid active subcontractor belonging to authenticated tenant.
  - `projectId`: string, required, must reference valid project site belonging to authenticated tenant.
  - `startDate`: string (YYYY-MM-DD), required.
  - `endDate`: string (YYYY-MM-DD), required, `endDate >= startDate`.
  - `scopeOfWork`: string, required, min 5 chars.
  - `agreementValue`: decimal string or number, required, > 0, max 2 decimals.
- **Success Response (201 Created):**
```json
{
  "id": "agr-sbp-1003",
  "agreementNumber": "AG-1003",
  "agreementDate": "2026-11-03",
  "title": "Pune Metro Line 3 Overhead Electrification Package",
  "subcontractor": {
    "id": "sub-sbp-004",
    "name": "Tata Power Co. Ltd."
  },
  "projectId": "proj-sbp-003",
  "projectName": "Pune Metro Line 3",
  "agreementValue": 48500000,
  "status": "active"
}
```

---

### 4.4 Error Envelopes & Security

| HTTP Status | Error Kind | UI Behaviour |
|---|---|---|
| `400 / 422` | `validation` | Field errors mapped to form inputs; entered values preserved. |
| `401` | `unauthorized` | Dispatches `agreement:unauthorized` & triggers ERP re-auth. |
| `403` | `forbidden` | Access denied for cross-tenant or unpermitted action. |
| `404` | `not_found` | Record not found error screen. |
| `409` | `conflict` | Duplicate idempotency key or concurrent modification error. |
| `500 / 503` | `server` / `unavailable` | Recoverable error state with retry action. |
