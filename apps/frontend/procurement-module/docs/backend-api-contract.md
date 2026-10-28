# Procurement Frontend — Backend API Contract

This document lists every HTTP call the Procurement frontend (`apps/frontend/procurement-module`) currently makes,
and the request and response shapes the screens read. It is derived from the source code, not from a backend.

## Status labels

| Label | Meaning |
| --- | --- |
| **IMPLEMENTED** | What the frontend code actually sends or reads today. A fact about the frontend only. |
| **PROPOSED** | An endpoint, field or convention the frontend assumes. **No backend team has agreed to it.** |
| **UNRESOLVED** | A business or platform decision the frontend cannot make. It needs an owner and an answer. |

No endpoint in this document is confirmed. Every path, method and field name is PROPOSED until the backend
team agrees to it or replaces it. If the backend chooses different names, update the matching
`src/features/**/*Service.js` file. Screens only read the fields listed here.

Source of truth for each section: the `*Service.js` file named in its heading, plus the page or modal that calls it.

---

## 1. Authentication and session — `features/auth/authService.js`

| Endpoint | Called by |
| --- | --- |
| **PROPOSED** `GET /procurement/session` | `SessionProvider` once when the app loads, and again after sign-in; the result is shared through `useSession()` |
| **PROPOSED** `POST /procurement/session` (sign in) | `pages/LoginPage.jsx` when the form is submitted |
| **PROPOSED** `DELETE /procurement/session` (sign out) | `components/layout/UserMenu.jsx`, "Log out" in the header account menu |

The sign-in and sign-out endpoints are placeholders so the screens can be wired and tested.
**The ELVA identity team must confirm or replace them.** If they differ, only `authService.js` changes.

**IMPLEMENTED: response fields read**

```json
{
  "user": { "id": "string", "displayName": "string", "roleLabel": "string", "avatarUrl": "string | null" },
  "tenant": { "id": "string", "name": "string" },
  "permissions": ["procurement.suppliers.read", "..."],
  "navigation": ["dashboard", "supplierMaster", "..."]
}
```

- `navigation` contains route keys from `src/config/navigation.js` (`dashboard`, `supplierMaster`,
  `supplierLedger`, `supplierPerformance`, `purchaseRequisitions`, `purchaseOrders`, `purchaseInvoices`,
  `purchaseReturns`, `purchaseReports`, `subcontractors`, `subcontractAgreements`,
  `subcontractBills`, `pendingApprovals`, `approvalHistory`, `spendAnalysis`).
  (`subcontractOrders` and `supplierReports` are not in the sidebar for now.)
  Sidebar items not in the list are hidden, and opening one shows "Access denied".
- If `navigation` or `permissions` is missing or not an array, nothing is hidden. Visibility is cosmetic only;
  **the backend must authorise every request.**

**IMPLEMENTED: signed-out behaviour** (`App.jsx`, `ProcurementRouter`)

- A `401` from the session endpoint, or from any later request (`UNAUTHORIZED_EVENT` in `lib/apiClient.js`),
  moves the user to `#/login?returnTo=<previous route>`.
- On `#/login`, an authenticated session redirects to `returnTo`. `returnTo` is accepted only if it is a known
  in-app route; otherwise the user goes to `#/dashboard`.
- If the API is unreachable, returns another error, or is not configured, the user is **not** redirected.
  The shell stays visible and each screen shows its own error state.
**IMPLEMENTED: sign in** (`pages/LoginPage.jsx`)

- Request body: `{ "username": "string (trimmed)", "password": "string (as typed)", "rememberMe": boolean }`.
  No `Idempotency-Key` is sent.
- Client checks: both fields are required. Nothing else is validated on the client.
- Any `2xx` counts as success. The response body is not read; the app reloads `GET /procurement/session` and
  then leaves `#/login` for `returnTo`.
- `401` shows "The Employee ID / email or password is incorrect." `422` maps `fieldErrors.username` and
  `fieldErrors.password` onto the fields. Any other error shows its message above the Sign In button.
- The backend is expected to set the session cookie on success. The frontend never reads or stores a token.
- "Forgot Password?" makes no request; it shows a notice that password reset belongs to the identity service.

**IMPLEMENTED: sign out** (`components/layout/UserMenu.jsx`)

- The header account menu (click the user's name) shows the name, role, tenant and "Log out".
- "Log out" sends `DELETE /procurement/session` with no body. A `2xx` response or a `401` both count as signed
  out: the app moves to `#/login?returnTo=<current route>`. Any other error is shown in the menu and the user
  stays signed in.
- The backend is expected to clear the session cookie.

**UNRESOLVED**

- The sign-in mechanism. The frontend uses the PROPOSED credential endpoint above. If the identity service uses a
  hosted redirect (SSO) instead, the login form is replaced by a redirect and `signIn` is removed.
- Lockout, MFA, password expiry and the exact `401`/`423`/`429` responses for sign-in.
- What "Remember me" means (session length), or whether it is supported at all.
- No refresh or password-reset endpoint exists in this frontend.
- How the session is carried. The client sends `credentials: "include"` on every request and never reads or
  stores tokens. Cookie name, `SameSite`/domain settings and CSRF protection are not defined.
- Whether the session endpoint is owned by Procurement or by the shared platform/identity service.
- The permission string catalogue. The example values above are placeholders; no screen currently checks a
  specific permission.
- Whether signing out of Procurement should also end the user's session in other ELVA modules.

---

## 2. Transport conventions — `lib/apiClient.js`, `lib/apiTypes.js`

**IMPLEMENTED**

- **Base URL.** `VITE_API_BASE_URL` (see `.env.example`). Every path in this document is appended to it. If it
  is empty, no request is sent and screens show "Procurement service not connected".
- **Request headers.**
  - `Accept: application/json` (`*/*` for file downloads).
  - `Content-Type: application/json` for JSON bodies; multipart for `FormData`.
  - `Idempotency-Key: <uuid>` on every create, decision and generate request. A modal reuses the same key
    when the user retries after an error.
- **Credentials.** `fetch(..., { credentials: "include" })`. A cross-origin API must return credentialed CORS
  headers for the frontend origin.
- **Query strings.** Empty, `null` and `undefined` values are omitted. Arrays are sent as repeated keys.
- **Success responses.**
  - JSON with a `content-type` matching `application/json` or `application/*+json`.
  - `204` is accepted as "no body".
  - Any other content type is treated as an invalid response.
- **File downloads.** The response body is read as a blob. The file name is taken from `Content-Disposition`
  (`filename` or `filename*`); otherwise the screen uses a fallback name.
- **Error mapping by status.**

  | HTTP status | Error kind | UI behaviour |
  | --- | --- | --- |
  | 401 | `unauthorized` | Redirect to sign-in (§1) |
  | 403 | `forbidden` | "Access denied" |
  | 404 | `not_found` | "Not found" |
  | 409 | `conflict` | "Changed by someone else" |
  | 400, 422 | `validation` | Field errors shown on the form |
  | 502, 503, 504 | `unavailable` | Retry offered |
  | Other non-2xx | `server` | Generic error |
  | Network failure | `network` | Retry offered |

- **Error body (PROPOSED).** The client reads either `{ "error": { ... } }` or the object itself:

  ```json
  { "error": { "code": "string", "message": "string", "fieldErrors": { "items[0].quantity": ["message"] }, "requestId": "string" } }
  ```

  - Field keys in `items[0].x` form are mapped to the matching form field.
  - `requestId` (or the `X-Request-Id` header) is shown to the user as a reference.
- **Paginated lists (PROPOSED).**
  - Query: `page` (1-based) and `pageSize` (default 8; Purchase Reports' generated list uses 5).
  - Response: `{ "items": [], "pagination": { "page", "pageSize", "totalItems", "totalPages" } }`.
  - Filtering and paging are always done by the server; the frontend never filters locally.
- **Data types (PROPOSED).**
  - Identifiers are opaque strings.
  - Money, quantities, rates and percentages are **decimal strings** (e.g. `"4520000.00"`), never JSON numbers.
  - Dates are `YYYY-MM-DD`; timestamps are ISO 8601 with an offset.
  - The frontend only formats values; it never calculates totals, taxes, balances or scores.

**UNRESOLVED**

- The final base path and version prefix (e.g. `/api/v1`).
- Error `code` values.
- Idempotency-key retention window.
- Whether `sort` is supported on lists. No screen sends it today.

---

## 3. Lookups — `features/lookups/lookupService.js`

| | |
| --- | --- |
| Endpoint | **PROPOSED** `GET /procurement/lookups/{lookupKey}` |
| Response | `{ "options": [{ "value": "string", "label": "string" }], "defaultValue": "string (optional)" }` |

**IMPLEMENTED:** lookup keys requested and where they are used

| Lookup key | Used by |
| --- | --- |
| `supplierCategories` | Supplier Master filter, Add Supplier, Supplier Performance filter |
| `paymentTerms` | Add Supplier, Create PO |
| `departments`, `requisitionPriorities`, `approvers`, `units` | New PR |
| `suppliers` | Supplier Ledger supplier picker, Record Invoice |
| `approvedRequisitions` | Create PO |
| `purchaseOrders` | Record Invoice, New Return |
| `returnReasons` | New Return (per line) |
| `subcontractors`, `projects`, `paymentSchedules` | New Agreement |
| `tradeSpecialties` | Add Subcontractor |
| `reportingPeriods` | Purchase Reports |
| `performancePeriods` | Supplier Performance |

**UNRESOLVED**

- Which lists are tenant-scoped or user-scoped. For example, `approvers` may depend on the requisition's
  amount and department.
- Which lookups need search or paging for large tenants.

---

## 4. Suppliers — `features/suppliers/supplierService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/suppliers` | Supplier Master | query `page`, `pageSize`, `categoryId`, `status` (`search` is accepted by the service but no screen sends it yet) | paginated `SupplierListItem` |
| `POST /procurement/suppliers` | Add Supplier modal | body below | created supplier; `name` is used in the toast |
| `POST /procurement/suppliers/{id}/status-changes` | Status toggle confirmation | `{ "status": "active" \| "inactive", "reason": "string \| null" }` | any 2xx |

- **`SupplierListItem`:** `id`, `code`, `name`, `categoryName`, `gstin`, `contactPerson`, `phone`, `city`,
  `status` (`active` \| `inactive`).
- **Create body:** `name`, `categoryId`, `gstin`, `pan`, `contactPerson`, `phone`, `email`, `address`, `city`,
  `state`, `paymentTermId`. All values are strings exactly as entered.

**UNRESOLVED**

- Whether `blocked` is a separate supplier status.
- The code-generation rule.
- GSTIN/PAN validation and duplicate detection, which are server-side.
- Who may deactivate a supplier, and whether a reason is mandatory.

---

## 5. Supplier ledger — `features/supplier-ledger/supplierLedgerService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/suppliers/{supplierId}/ledger` | Supplier Ledger (`#/supplier-ledger?supplierId=`) | query `fromDate`, `toDate`, `page`, `pageSize` | `SupplierLedgerResponse` |
| `GET /procurement/suppliers/{supplierId}/ledger/export` | Ledger export buttons | query `fromDate`, `toDate`, `format` = `xlsx` \| `pdf` | file (blob) |
| `GET /procurement/suppliers/{supplierId}/statement` | Ledger Detail (`#/supplier-ledger/detail?supplierId=`) | none | `SupplierStatementResponse` |

- **`LedgerEntry`:** `id`, `documentDate`, `voucherNumber`, `voucherType`, `description`, `debitAmount`,
  `creditAmount`, `runningBalance` (absolute value), `runningBalanceSide` (`cr` \| `dr`), `sourceDocument`
  (`{ type, id }` or `null`).
- **`SupplierLedgerResponse`:**
  - `supplier { id, code, name }`
  - `period { fromDate, toDate }`
  - `summary { openingBalance, totalDebits, totalCredits, closingBalance }`
  - `items: LedgerEntry[]`
  - `pagination`
- **`SupplierStatementResponse`:**
  - `supplier { id, code, name, initials?, gstin, pan, paymentTermsLabel }`
  - `financialYearLabel` (shown in the header badge)
  - `statementPeriodLabel`
  - `totals { totalPurchases, totalPayments, outstanding }`
  - `items: LedgerEntry[]`

**UNRESOLVED**

- Ledger ownership: procurement sub-ledger, read-only Finance/AP view, or supplier statement.
- Financial-year boundaries and the default date range.
- Export permissions.
- Whether the statement is paginated. The frontend currently expects all items in one response.

---

## 6. Supplier performance — `features/supplier-performance/supplierPerformanceService.js`

| | |
| --- | --- |
| Endpoint | **PROPOSED** `GET /procurement/supplier-performance` |
| Query | `page`, `pageSize`, `periodId`, `categoryId` |

**Response read:**

- `lastUpdatedAt`
- `period { id, label }`
- `highlights`:
  - `bestDelivery { supplier, onTimeRate }`
  - `highestQuality { supplier, rejectionRate }`
  - `fastestResponse { supplier, avgResponseHours }`
  - Each highlight may be `null`.
- `items[]`: `supplier { id, name }`, `dataSufficiency` (`sufficient` \| `insufficient`), `onTimeRate`,
  `qualityScore`, `rejectionRate`, `avgResponseHours`, `overallRating`, and `filledStars` (an integer chosen by
  the backend).
- `pagination`

**UNRESOLVED**

- Every formula and weighting.
- The minimum data needed for a score.
- How stars are rounded.
- Period definitions.

---

## 7. Purchase requisitions — `features/purchase-requisitions/purchaseRequisitionService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/purchase-requisitions` | Purchase Requisitions (default filter `pending_approval`) | query `page`, `pageSize`, `status`, `search` (`search` is not sent by the current screen) | paginated list |
| `POST /procurement/purchase-requisitions` | New PR modal | body below | created PR; `requisitionNumber` is used in the toast |
| `GET /procurement/purchase-requisitions/{id}` | View (record detail) | none | detail below |

- **List item:**
  - `id`, `requisitionNumber`, `requestDate`
  - `requestedBy { id, displayName }`
  - `departmentName`, `itemsSummary`, `estimatedAmount`
  - `priority` (`high` \| `medium` \| `low`)
  - `status` (`pending_approval` \| `approved` \| `rejected`). There is no `draft` status.
- **Create body:**
  - `title`, `departmentId`, `priority`, `requiredDate`, `justification`, `approverId`
  - `items[]: { description, quantity, unitId, estimatedCost }`
  - A new PR is created as `pending_approval` and appears in Pending Approvals.
- **Detail:** every list-item field plus
  - `title`, `requiredDate`, `approver { id, displayName } | null`, `justification`
  - `items[]: { description, quantity, unitLabel, estimatedCost }`
  - `pendingApproval { id, version } | null`: when set, View shows Approve and Reject. The decision is sent to
    `POST /procurement/approvals/{id}/decisions` (§15) with `expectedVersion = version`, and the detail is reloaded.
  - `approvalHistory[]: { id, decision, decidedBy { id, displayName }, decidedAt, comment }`

**UNRESOLVED**

- Whether `pendingApproval` is returned only to users allowed to decide, or to everyone (the backend still enforces it).
- Approval routing (see §15).
- Numbering rule.

---

## 8. Purchase orders — `features/purchase-orders/purchaseOrderService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/purchase-orders` | Purchase Orders (default filter `sent`) | query `page`, `pageSize`, `status`, `search` (`search` is not sent by the current screen) | paginated list |
| `POST /procurement/purchase-orders` | Create PO modal | body below | created PO; `orderNumber` is used in the toast |
| `GET /procurement/purchase-requisitions/{id}` | Create PO modal (after PR Reference is chosen) | none | requisition detail; `items[]` pre-fill the PO line editor |
| `GET /procurement/purchase-orders/{id}` | View (record detail) | none | detail below |
| `POST /procurement/purchase-orders/{id}/status-changes` | View: Mark as Sent / Mark Completed / Cancel PO | `{ "status": "sent" \| "completed" \| "cancelled" }` | detail |
| `POST /procurement/purchase-orders/{id}/receipts` | View: Record Receipt | `{ "receivedDate", "items": [{ "lineId", "quantity" }] }` | detail |

- **List item:**
  - `id`, `orderNumber`, `orderDate`
  - `supplier { id, name }`
  - `itemsSummary`, `totalAmount`, `deliveryDate`
  - `status` (`draft` \| `sent` \| `partially_received` \| `completed` \| `cancelled`)
- **Create body:**
  - `supplierId`, `requisitionId`, `deliveryDate`, `paymentTermId`, `shippingAddress`, `notes`
  - `items[]: { description, quantity, unitPrice }`
  - Line amounts, tax and totals are computed by the server. A new PO is created as `draft` (it still goes to
    Pending Approvals; approval moves a still-draft PO to `sent`).
- **Detail:** every list-item field plus
  - `requisition { id, requisitionNumber } | null`, `paymentTermsLabel`, `shippingAddress`, `notes`, `createdBy { id, displayName }`
  - `items[]: { lineId, description, unitLabel, quantity, receivedQuantity, remainingQuantity, unitPrice, amount }`
  - `subtotal`, `taxRatePercent`, `taxAmount`, `receivedAmount` (value of goods received, incl. tax)
  - `receipts[]: { id, receiptNumber, receivedDate, amount, items[]: { lineId, description, unitLabel, quantity }, recordedBy, recordedAt }`
  - `allowedActions[]` from `send`, `receive`, `complete`, `cancel`. The View screen shows only these buttons.
- **Status rules expected from the backend:**
  - Cancel is allowed at any stage except `completed` (and `cancelled`).
  - A receipt adds to the received quantity. The cumulative received quantity per line must not exceed the
    ordered quantity; the error is returned as `items[i].quantity`.
  - After a receipt the status becomes `partially_received`, or `completed` when nothing remains.
  - The receipt amount is calculated by the backend; the frontend never calculates it.
- **Receipt body:** the frontend sends every PO line in order, with `quantity: ""` for lines not received now,
  so `items[i]` errors map back to the same row.

**UNRESOLVED**

- Tax rules.
- Whether a PO must reference an approved PR.
- How a PO is sent to the supplier (email/PDF) when marked `sent`.
- Whether "Mark Completed" is allowed while quantities remain (short-close).
- Amendments.

---

## 9. Purchase invoices and attachments — `features/purchase-invoices/purchaseInvoiceService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/purchase-invoices` | Purchase Invoices (default filter: all) | query `page`, `pageSize`, `status`, `search` (`search` is not sent by the current screen) | paginated list |
| `GET /procurement/purchase-invoices/summary` | Summary cards | none | `{ totalInvoices, totalAmount, overdueAmount }` |
| `GET /procurement/purchase-invoices/{id}` | View (record detail) | none | detail below |
| `POST /procurement/purchase-invoices/{id}/payments` | View: Record Partial Payment | `{ "amount", "transactionId", "paymentDate" }` | detail |
| `POST /procurement/attachments` | Record Invoice (only when a file is chosen) | multipart: `file`, `purpose=purchase_invoice` | `{ id, fileName, sizeBytes, contentType }`; only `id` is read |
| `POST /procurement/purchase-invoices` | Record Invoice modal | body below | created invoice; `invoiceNumber` is used in the toast |

- **List item:**
  - `id`, `invoiceNumber`, `invoiceDate`
  - `supplier { id, name }`, `purchaseOrder { id, orderNumber } | null`
  - `invoiceAmount`, `tdsAmount`, `netPayable`, `dueDate`
  - `status` (`draft` \| `paid` \| `partially_paid` \| `overdue`). `pending_verification` and `verified` are
    disabled for now (commented out in the frontend, not used anywhere).
- **Create body:**
  - `invoiceNumber`, `supplierId`, `purchaseOrderId`, `invoiceDate`, `dueDate`
  - `items[]: { description, quantity, rate }`
  - `taxRatePercent`, `statedTotalAmount` (as entered, so the server can check it against its own total)
  - `attachmentIds: string[]`
  - A new invoice is created as `draft`. Invoices do not go to Pending Approvals.
- **Client-side file checks:** PDF, JPEG or PNG only, at most 10 MB.
- **Detail:** every list-item field plus
  - `items[]: { description, quantity, rate, amount }`
  - `taxableAmount`, `taxRatePercent`, `taxAmount`, `tdsRatePercent`
  - `paidAmount`, `balanceDue` (= `netPayable` − `paidAmount`)
  - `payments[]: { id, paymentDate, amount, transactionId, recordedBy { id, displayName }, recordedAt }`
  - `attachments[]: { id, fileName }`
  - `allowedActions[]`: `recordPayment` while `balanceDue` > 0.
- **Payment rules expected from the backend:**
  - `amount` > 0 and not more than `balanceDue` (error on `amount`); `transactionId` and `paymentDate` are required.
  - After a payment the status becomes `partially_paid`, or `paid` once cumulative payments equal the net payable.

**UNRESOLVED**

- Three-way match rules.
- TDS calculation.
- Whether `overdue` is a stored status or a derived flag.
- The attachment service's owner, storage, malware scanning and retention.

---

## 10. Purchase returns — `features/purchase-returns/purchaseReturnService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/purchase-returns` | Purchase Returns | query `page`, `pageSize`, `status` | paginated list |
| `GET /procurement/purchase-returns/summary` | Summary cards | none | `{ processedCount, totalValue, pendingCreditNoteCount, rejectedCount }` |
| `GET /procurement/purchase-orders/{id}/returnable-lines` | New Return, after a PO is chosen | none | `{ supplier { id, name }, lines[]: { lineId, itemName, quantityReceived, unitLabel } }` |
| `POST /procurement/purchase-returns` | New Return modal | body below | created return; `returnNumber` is used in the toast |

- **List item:**
  - `id`, `returnNumber`, `returnDate`
  - `supplier { id, name }`
  - `sourceDocument { type: purchaseOrder | purchaseInvoice, id, number } | null`
  - `reasonLabel`, `itemsSummary`, `amount`
  - `status` (`pending_approval` \| `credit_note_issued` \| `rejected`)
- **Create body:**
  - `purchaseOrderId`, `returnDate`, `resolution` (`replacement` \| `refund`), `notes`
  - `items[]: { lineId, quantity, reasonId }`. Only lines with a quantity entered are sent.

**UNRESOLVED**

- Return value calculation.
- Credit-note generation and ownership (Procurement or Finance).
- Whether returns against invoices (not only POs) are allowed at creation time.

---

## 11. Subcontractors — `features/subcontractors/subcontractorService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/subcontractors` | Subcontractors | query `page`, `pageSize`, `search` | paginated list |
| `GET /procurement/subcontractors/summary` | Summary cards | none | `{ registeredCount, activeAgreementCount, topRatedCount, topRatedThreshold, suspendedOrBlacklistedCount }` |
| `POST /procurement/subcontractors` | Add Subcontractor modal | body below | created record; `name` is used in the toast |

- **List item:**
  - `id`, `code`, `name`, `tradeSpecialtyLabel`, `gstin`, `contactPerson`, `phone`
  - `activeAgreementCount`, `rating` (decimal string, 0–5)
  - `status` (`active` \| `suspended` \| `inactive`)
- **Create body:**
  - `name`, `firmName`, `gstin`, `pan`, `contactPerson`, `phone`, `email`, `address`
  - `tradeSpecialtyId`, `licenseNumber`, `licenseExpiryDate`
  - `initialRating` is no longer sent: the rating input is disabled (commented out) for now. The list still shows `rating`.

**UNRESOLVED**

- Whether `blacklisted` is a separate status.
- Rating methodology, including whether an initial rating is allowed at all.
- The "top rated" threshold.

---

## 12. Subcontract agreements — `features/subcontract-agreements/subcontractAgreementService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/subcontract-agreements` | Subcontract Agreements | query `page`, `pageSize`, `status` | paginated list |
| `GET /procurement/subcontract-agreements/summary` | Summary cards | none | `{ activeCount, cumulativeValue, completedCount, completedPeriodLabel, expiredOrPendingRenewalCount }` |
| `GET /procurement/subcontract-agreements/{id}` | View (record detail) | none | detail below |
| `POST /procurement/subcontract-agreements/{id}/status-changes` | View: Mark as Completed | `{ "status": "completed" }` | detail |
| `GET /procurement/attachments/{id}/file` | View signed copy | none | PDF file (blob) |
| `POST /procurement/subcontract-agreements` | New Agreement modal | body below | created record; `agreementNumber` is used in the toast |

- **List item:**
  - `id`, `agreementNumber`, `agreementDate`
  - `subcontractor { id, name }`
  - `projectName`, `scopeSummary`, `agreementValue`, `startDate`, `endDate`
  - `status` (`active` \| `completed` \| `expired`)
- **Create body:** `title`, `subcontractorId`, `projectId`, `startDate`, `endDate`, `scopeOfWork`,
  `agreementValue`, `paymentScheduleId`, `termsAndConditions`, `attachmentIds: string[]` (signed copy PDF; optional).
  Upload uses `POST /procurement/attachments` with `purpose=subcontract_agreement` (PDF only) before create.
- **Detail:** every list-item field plus `title`, full `scopeOfWork`, `termsAndConditions`, `paymentScheduleLabel`,
  `attachments[]: { id, fileName, contentType }`, `allowedActions: ["complete"]` while status is Active.
- **Status (PRD-aligned, not toggled on the list):**
  - **Active** — current date is on or before the end date and the agreement is not completed.
  - **Expired** — end date has passed and the agreement is not completed (backend-derived on read).
  - **Completed** — user chooses **Mark as Completed** on View when work is finished.

**UNRESOLVED**

- The project master: Procurement or another module.
- Payment-schedule definitions.
- Renewal workflow.

---

## 13. Subcontract orders — `features/subcontract-orders/subcontractOrderService.js`

The Subcontract Orders route and sidebar item are **commented out** in the frontend for now; list services remain for when the screen is re-enabled.

| | |
| --- | --- |
| Endpoint | **PROPOSED** `GET /procurement/subcontract-orders` |
| Query | `page`, `pageSize`, `status` (default `active`) |

**List item:**

- `id`, `orderNumber`, `orderDate`
- `subcontractor { id, name }`, `agreement { id, agreementNumber } | null`
- `description`, `orderValue`, `deliveryDate`, `progressPercent`
- `status` (`draft` \| `active` \| `completed` \| `cancelled`)

**UNRESOLVED**

- No create endpoint is called. The "Create Order" button is disabled because the form has not been designed.
- How `progressPercent` is measured.

---

## 14. Subcontract bills — `features/subcontract-bills/subcontractBillService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/subcontract-bills` | Subcontract Bills | query `page`, `pageSize`, `status` | paginated list, optionally with a top-level `retentionRatePercent` |
| `GET /procurement/subcontract-bills/summary` | Summary cards | none | `{ billedThisMonth, pendingVerificationCount, approvedForPayment, retentionHeld }` |

**List item:**

- `id`, `billNumber`, `billDate`
- `subcontractor { id, name }`, `order { id, orderNumber } | null`
- `billAmount`, `retentionAmount`, `netPayable`, `cumulativePaid` (all calculated by the backend)
- `status` (`submitted` \| `verified` \| `approved` \| `paid`)

**UNRESOLVED**

- No create endpoint is called. The "Record Bill" button is disabled because the form has not been designed.
- Retention rules, including whether there is one rate per page or per bill.
- Payment ownership (Procurement or Finance).

---

## 15. Approvals — `features/approvals/approvalService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/approvals/pending` | Pending Approvals | query `page`, `pageSize`, `documentType` | paginated list plus top-level `totalPending` (header badge) |
| `POST /procurement/approvals/{id}/decisions` | Approve/Reject modal | `{ "decision": "approved" \| "rejected", "comment": "string \| null", "expectedVersion": "any \| null" }` | any 2xx |
| `GET /procurement/approvals/history` | Approval History | query `page`, `pageSize`, `documentType`, `decision`, `dateRange` | paginated list |
| `GET /procurement/approvals/history/export` | Export History | query `documentType`, `decision`, `dateRange`, `format=xlsx` | file (blob) |

- **`documentType` values:** `purchaseRequisition`, `purchaseOrder`, `subcontractBill`, `purchaseInvoice`.
- **`dateRange` values:** `last_30_days` (default), `last_90_days`, `current_financial_year`. The backend
  resolves these to actual dates.
- **Pending item:**
  - `id`, `documentType`, `documentTypeLabel`, `document { id, number }`
  - `requestedBy { id, displayName }`, `submittedAt`, `amount`
  - `priority` (`high` \| `medium` \| `low` \| `null`), `description`
  - `allowedActions { approve, reject }`
  - `version`, which is sent back as `expectedVersion`; a `409` means someone else acted first.
- **History item:**
  - `id`, `documentType`, `documentTypeLabel`, `document { id, number }`
  - `requestedBy`, `amount`, `submittedAt`, `decidedAt`
  - `decidedBy { id, displayName }`
  - `decision` (`approved` \| `rejected`), `comment`

**UNRESOLVED**

- Approval routing, thresholds and delegation.
- Whether a comment is mandatory on reject.
- Bulk approval: the checkbox is shown disabled.
- Fiscal-year definition for `current_financial_year`.

---

## 16. Dashboard — `features/dashboard/dashboardService.js`

| | |
| --- | --- |
| Endpoint | **PROPOSED** `GET /procurement/dashboard` |

**Response read:**

- `kpis { purchaseValue, pendingRequisitions, pendingOrders, pendingApprovals, supplierPayables, monthlySpend }`.
  Counts are integers; amounts are decimal strings; any value may be `null`.
- `monthlySpend[]: { periodKey, label, amount }`
- `categoryBreakdown { totalAmount, categories[]: { id, name, sharePercent } }`
- `recentOrders[]: { id, orderNumber, supplierName, totalAmount, orderDate, status }`, using the purchase order
  status values from §8.
- `pendingApprovals[]: { id, document { type, id, number }, title, subtitle, amount }`

**UNRESOLVED**

- The scope of the figures: user, department or tenant.
- The time window for "Purchase Value" and "Monthly Spend".
- How many months and categories to return.

---

## 17. Reports — `features/reports/reportService.js`

| Method and path (PROPOSED) | Used by | Request | Response read |
| --- | --- | --- | --- |
| `GET /procurement/reports/definitions?group=purchase` | Purchase Reports | query `group` | `{ items[]: { key, title, description, formats: ("pdf" \| "xlsx")[] } }` |
| `GET /procurement/reports/generated` | Purchase Reports, "Recently Generated" | query `page`, `pageSize` (5) | paginated `{ id, fileName, generatedAt, sizeBytes, format, status: ready \| processing \| failed }` |
| `POST /procurement/reports/generate` | Generate button | `{ "reportKey", "periodId": "string \| null", "format" }` (the first format listed for the report) | any 2xx; the list is reloaded afterwards |
| `GET /procurement/reports/generated/{id}/file` | Download | none | file (blob) |
| `GET /procurement/reports/supplier-overview` | *(no screen; reserved for a future Supplier Reports page)* | none | see below |
| `GET /procurement/reports/spend-analysis` | Spend Analysis | query `periodId` (currently always empty) | see below |

- **Supplier overview:**
  - `topSuppliersByVolume { axisMax, items[]: { supplier { id, name }, amount } }`
  - `paymentAging { items[]: { supplier { id, name }, bucket0To30, bucket31To60, bucket61To90, bucket90Plus, totalOutstanding } }`
- **Spend analysis:**
  - `kpis { totalAnnualSpend, costSavings, averageOrderValue, budgetUtilization }`. Each is
    `{ value, trend { direction: up | down, tone: positive | ..., label } }`.
  - `categoryDistribution[]: { id, name, sharePercent }`
  - `monthlyTrend[]: { periodKey, label, amount }`
  - `departments[]: { departmentId, departmentName, requisitionCount, totalValue, sharePercent }`

**UNRESOLVED**

- Whether report generation is asynchronous, and how completion is signalled (the screen only reloads the list).
- Report retention.
- Definitions of "cost savings" and "budget utilization", and the budget source.
- The aging-bucket basis (invoice date or due date).
- The "Compliance Report" tile is disabled because no design exists.

---

## 18. Screens and actions with no backend call

| Item | Current frontend behaviour | Status |
| --- | --- | --- |
| Workspace (PRD screen) | Not built; no route or sidebar item | **UNRESOLVED**: purpose not confirmed |
| Record detail (`#/record?type=&id=&number=`) for returns, subcontract orders/bills, approvals and reports | Placeholder that states no detail design exists; no request is made | **UNRESOLVED**: detail screens and endpoints. Requisition, purchase order, invoice and subcontract agreement detail are PROPOSED in §7–§9 and §12. |
| Subcontract Orders "Create Order" | Disabled | **UNRESOLVED**: form design and endpoint |
| Subcontract Bills "Record Bill" | Disabled | **UNRESOLVED**: form design and endpoint |
| Bulk approval | Disabled checkbox | **UNRESOLVED**: rules |
| Password reset ("Forgot Password?") | No request; an informational notice only | **UNRESOLVED**: see §1 |
| Global header search | No request | **UNRESOLVED**: search scope and endpoint |
