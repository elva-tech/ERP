# ELVA ERP — Agreement Store Data Model & Schemas

**Document ID:** ELVA-DATA-PROC-AGR-001  
**Version:** 1.0  
**Status:** Architecture Baseline  

---

## 1. Domain Entities & Relationships

```
+-------------------------------------------------------------+
| Tenant (ELVA Multi-tenant Isolation)                        |
| - tenant_id (UUID / String)                                 |
+------------------------------+------------------------------+
                               | 1
                               |
                               | owns *
+------------------------------v------------------------------+
| SubcontractAgreement                                        |
|-------------------------------------------------------------|
| id: string (PK)                                             |
| agreementNumber: string (Unique per tenant e.g. "AG-1102")   |
| title: string (3-200 chars)                                 |
| agreementDate: ISO Date (YYYY-MM-DD)                        |
| subcontractorId: FK -> SubcontractorMaster                  |
| projectId: FK -> ProjectSiteMaster                          |
| scopeOfWork: text (deliverables, boundaries)                |
| agreementValue: numeric (high precision decimal)            |
| currencyCode: string ("INR")                                |
| startDate: ISO Date                                         |
| endDate: ISO Date (>= startDate)                            |
| status: AgreementStatusEnum                                 |
| paymentSchedule: string / structured milestone              |
| termsAndConditions: text / legal clause reference           |
| renewalAttention: boolean (derived / flag)                  |
| createdAt: ISO Timestamp                                    |
| updatedAt: ISO Timestamp                                    |
+-------------------+--------------------+--------------------+
                    | 1                  | 1
                    |                    |
                    | refers to          | refers to
                    v                    v
+-------------------------+        +--------------------------+
| SubcontractorMaster     |        | ProjectSiteMaster        |
| - id: string            |        | - id: string             |
| - name: string          |        | - name: string           |
| - code: string          |        | - code: string           |
| - category: string      |        | - location: string       |
+-------------------------+        +--------------------------+
```

---

## 2. Agreement Status State Machine

The following status values are supported:

| Status Code | Display Label | Meaning |
|---|---|---|
| `draft` | Draft | Agreement created, saved in draft mode, awaiting submission |
| `pending_approval` | Pending Approval | Submitted for executive / legal authorization |
| `active` | Active | Fully approved, counter-signed, and currently effective |
| `expiring_soon` | Expiring Soon | End date approaching within tenant renewal warning window (e.g. 60 days) |
| `expired` | Expired | End date passed without approved renewal or extension |
| `completed` | Completed | All contractual obligations delivered, bills cleared, retention released |
| `terminated` | Terminated | Terminated prematurely through formal notice or breach |
| `cancelled` | Cancelled | Draft withdrawn or cancelled prior to execution |
| `pending_renewal` | Pending Renewal | Renewal agreement drafted and undergoing review |

---

## 3. Financial Precision & Calculations

- **Storage / API:** Decimal string representation or integer subunit (`paise` for INR, where ₹1.00 = 100 paise) to prevent IEEE-754 binary floating-point roundoff errors.
- **Frontend Validation:** Standard regex `/^\d+(\.\d{1,2})?$/` ensuring non-negative values with up to 2 decimal places.
- **KPI Aggregation:**
  - `activeCount`: Integer count of `active` agreements.
  - `cumulativeValue`: Exact integer sum of paise converted back to Decimal/Crores/Lakhs for compact UI display.

---

## 4. Unresolved Product Owner Decisions

1. **Structured Milestones vs. Free Text:** Does Payment Schedule require dedicated structured milestone rows (with percentage and amount allocations) in v1, or is the Figma single selection sufficient?
2. **Document Upload Boundary:** Should document attachment happen directly inside the creation modal, or during execution/review?
3. **Derived vs. Materialized Expiry:** Is `expired` purely derived when `today > endDate`, or does an audit event mutate the status?
4. **Project Linking:** Can a Master Framework Agreement exist without a specific project site attached?

