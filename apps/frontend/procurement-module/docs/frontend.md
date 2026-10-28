Every API call in the module is listed in the service files, one per feature: src/features/<feature>/<feature>Service.js. All of them go through one shared file, src/lib/apiClient.js, which makes the actual fetch call. Pages never call fetch directly; they use a few shared hooks that call the services.

The full written list of endpoints, with request and response shapes, is in docs/backend-api-contract.md.

The four layers
Page (e.g. SupplierMasterPage.jsx)
   │  uses a hook
   ▼
Hook (useServerList / useAsyncResource / useLookupOptions / useFormSubmission)
   │  calls a service function
   ▼
Service (e.g. features/suppliers/supplierService.js)   ← "the list of APIs"
   │  calls apiRequest(path, options)
   ▼
apiClient.js  →  fetch(VITE_API_BASE_URL + path)  →  backend
1. API client: src/lib/apiClient.js (one file, shared by every page)
This is the only file that calls fetch. It handles the things every request needs:

It builds the URL from VITE_API_BASE_URL plus the path. If that variable isn't set, it stops with a not_configured error, which is why port 5173 shows no data.
if (!isApiConfigured()) {
  throw new ApiError(
    "not_configured",
    "The procurement API is not configured for this environment.",
  );
It sends cookies (credentials: "include"), JSON headers, and an Idempotency-Key on POST requests, so a double-clicked submit doesn't create two records.
It turns HTTP failures into a single ApiError with a kind: 401 becomes unauthorized, 422 becomes validation, 409 becomes conflict, and so on. A 401 also tells the app to redirect to login.
It handles file downloads (responseType: "blob") for the Excel and PDF exports.
2. Services: src/features/*/*Service.js (the API list)
Each feature has one service file. Each function in it is one backend endpoint and contains no UI logic. For example:

/** PROPOSED: GET /procurement/purchase-orders */
export function listPurchaseOrders({ page, pageSize, status, search }, signal) {
  return apiRequest("/procurement/purchase-orders", { query: { page, pageSize, status, search }, signal });
}
/** PROPOSED: POST /procurement/purchase-orders (line amounts, taxes and totals are computed server-side) */
export function createPurchaseOrder(payload, { idempotencyKey }) {
  return apiRequest("/procurement/purchase-orders", { method: "POST", body: payload, idempotencyKey });
}
The full set of service files:


| **Feature**                                    | **Service file**                                                 |
| :--------------------------------------------- | :--------------------------------------------------------------- |
| Login session                                  | `features/auth/authService.js`                                   |
| Dropdown options (categories, units and so on) | `features/lookups/lookupService.js`                              |
| Dashboard                                      | `features/dashboard/dashboardService.js`                         |
| Suppliers                                      | `features/suppliers/supplierService.js`                          |
| Supplier Ledger                                | `features/supplier-ledger/supplierLedgerService.js`              |
| Supplier Performance                           | `features/supplier-performance/supplierPerformanceService.js`    |
| Purchase Requisitions                          | `features/purchase-requisitions/purchaseRequisitionService.js`   |
| Purchase Orders                                | `features/purchase-orders/purchaseOrderService.js`               |
| Purchase Invoices and attachments              | `features/purchase-invoices/purchaseInvoiceService.js`           |
| Purchase Returns                               | `features/purchase-returns/purchaseReturnService.js`             |
| Subcontractors                                 | `features/subcontractors/subcontractorService.js`                |
| Subcontract Agreements                         | `features/subcontract-agreements/subcontractAgreementService.js` |
| Subcontract Orders                             | `features/subcontract-orders/subcontractOrderService.js`         |
| Subcontract Bills                              | `features/subcontract-bills/subcontractBillService.js`           |
| Approvals and history                          | `features/approvals/approvalService.js`                          |
| Reports and spend analysis                     | `features/reports/reportService.js`                              |

The JSDoc @typedef blocks at the top of each service describe the response shape the UI expects. The "PROPOSED" tag means the endpoint hasn't been confirmed by the backend team yet.

3. Hooks: src/hooks/ (how pages use the services)
Four reusable hooks handle loading, error, pagination and form state, so pages don't repeat that code:

useAsyncResource(load, key) is for one-off fetches such as the dashboard. It tracks loading, success and error, cancels the old request if the page changes, and offers reload() for the Retry button.
useServerList(listFn, filters) is for every table page. It keeps the filters and page number, sends them as query parameters, and resets to page 1 whenever a filter changes. Filtering and pagination all happen on the backend.
useLookupOptions(key) loads dropdown options from /procurement/lookups/{key}, so business lists aren't hardcoded in the frontend.
useFormSubmission(...) is for every Create or Add modal. It runs validation, calls the service with an idempotency key, and shows the server's field errors under the right inputs. The success message appears only after the backend confirms the save.
4. Pages: src/pages/*.jsx
A page connects hooks to services. For example, Supplier Master:

const list = useServerList(listSuppliers, { categoryId: "", status: SUPPLIER_STATUS.active });
const categories = useLookupOptions("supplierCategories");
And the Dashboard:

const dashboard = useAsyncResource(getDashboard, "dashboard");
The page then passes resource.status to the shared AsyncState component, which shows the loading, error-with-retry, or empty state.

One request, start to finish
Here is what happens when a user changes the Status filter on Supplier Master to "Inactive":

The page calls list.setFilter("status", "inactive").
useServerList updates its filters, resets to page 1, and builds the query { categoryId: "", status: "inactive", page: 1, pageSize: 8 }.
useAsyncResource sees a new query, cancels any request still running, and calls listSuppliers(query, signal).
supplierService.js calls apiRequest("/procurement/suppliers", { query }).
apiClient.js sends GET {VITE_API_BASE_URL}/procurement/suppliers?status=inactive&page=1&pageSize=8.
The backend replies with { items, pagination }, and the table and pagination controls re-render. If the request fails, AsyncState shows the error with a Retry button.
Points worth telling your TL
One place to change the backend URL. Set VITE_API_BASE_URL in .env.local. No other code changes are needed.
No fake data in production code. If the backend is down, the UI shows an error; it never shows sample records.
The backend owns the business rules. Totals, taxes, statuses and dropdown lists all come from the API. The frontend only displays them.
The demo doesn't change any of this. It provides a temporary backend at the same paths, so the services, hooks and pages run unmodified.
Adding a new endpoint takes two steps: add a function to the feature's service file that calls apiRequest, then use it from a page through one of the hooks.

## Colour tokens

All theme colours are defined once, in the `@theme` block of `src/index.css`. Tailwind turns each
`--color-<name>` into utility classes, for example `--color-brand` → `bg-brand`, `text-brand`, `border-brand`.
To change a colour everywhere, change its hex value in `index.css` only.

### Sidebar

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `sidebar` | `#111c3a` | Sidebar background |
| `sidebar-active` | `#1b2a4a` | Active menu item background |
| `sidebar-text` | `#94a3b8` | Menu item text and the logo subtitle |
| `sidebar-line` | `#252f4a` | Divider lines inside the sidebar |

### Brand (red)

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `brand` | `#c41e3a` | Page "+ New / Record" buttons, active menu marker, required-field `*`, Net Payable amounts, KPI accents, charts |
| `brand-strong` | `#c91e3a` | Modal submit button and detail-page primary buttons (Record Receipt, Record Partial Payment) |
| `brand-hover` | `#a9172f` | Hover for both red button types |
| `brand-soft` | `#fdecef` | Light red background (defined, not used yet) |

### Page, cards and text

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `workspace` | `#f4f6f9` | Page background, table header bands, neutral badge background, button hover |
| `surface` | `#ffffff` | Cards, panels, modals, inputs on focus |
| `surface-muted` | `#f8fafc` | Light grey surface (defined, not used yet) |
| `field` | `#fbfcfe` | Form input background |
| `field-line` | `#dce3ed` | Form input border, modal header/footer divider |
| `modal-footer` | `#f7f9fc` | Modal footer background |
| `ink` | `#1e293b` | Main text |
| `ink-soft` | `#334155` | Secondary dark text (error banner detail) |
| `navy` | `#1b2a4a` | Record numbers (PR/PO/Invoice No), detail page titles, focus outlines, "Sent" badge text |
| `muted` | `#64748b` | Secondary text, table headers, labels, neutral badge text |
| `placeholder` | `#94a3b8` | Input placeholders, hints, "Fields marked required" note |
| `line` | `#e2e8f0` | Card borders, table row lines |
| `line-soft` | `#f1f5f9` | Progress bar track, chart tracks, modal close button |

### Accent, links and login

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `accent` | `#0e9f7e` | "+ Add item" links in line-item editors, file dropzone highlight |
| `link` | `#2563eb` | "View" links in tables, report download links |
| `login` | `#1a5276` | Login page Sign In button |
| `login-hover` | `#154360` | Login page Sign In button hover |

### Status colours

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `success` | `#10b981` | Approved/Completed/Active badge text, Approve button, Received quantities |
| `success-soft` | `#d1fae5` | Success badge background |
| `success-muted` | `#e6f4ea` | Softer success badge background (Paid, Partially Paid) |
| `danger` | `#ef4444` | Rejected/Inactive badge text, Reject and Cancel buttons, field errors |
| `danger-soft` | `#fee2e2` | Danger badge background, error banner background |
| `warning` | `#fbbf24` | Pending badge text, Medium priority |
| `warning-strong` | `#f59e0b` | Overdue/Submitted/Suspended badge text, rating stars, warning KPI cards |
| `warning-soft` | `#fef3c7` | Warning badge background |
| `info` | `#3b82f6` | Draft badge text (invoices, subcontract orders) |
| `info-soft` | `#eff6ff` | Info badge background, login page notice |
| `sent-soft` | `#e0e9f5` | "Sent" badge background |

### Badge tones

Status badges never use hex values directly. Each status file maps a status to a **tone**, and
`src/components/ui/badgeStyles.js` maps the tone to colours:

| Tone | Background | Text |
| :-- | :-- | :-- |
| `success` | `success-soft` `#d1fae5` | `success` `#10b981` |
| `successMuted` | `success-muted` `#e6f4ea` | `success` `#10b981` |
| `warning` | `warning-soft` `#fef3c7` | `warning` `#fbbf24` |
| `warningStrong` | `warning-soft` `#fef3c7` | `warning-strong` `#f59e0b` |
| `danger` | `danger-soft` `#fee2e2` | `danger` `#ef4444` |
| `info` | `info-soft` `#eff6ff` | `info` `#3b82f6` |
| `navy` | `sent-soft` `#e0e9f5` | `navy` `#1b2a4a` |
| `neutral` (also any unknown status) | `workspace` `#f4f6f9` | `muted` `#64748b` |

### Which status uses which tone

| Module (status file) | Status → tone |
| :-- | :-- |
| Suppliers (`supplierStatus.js`) | Active → success · Inactive → danger |
| Purchase Requisitions (`requisitionStatus.js`) | Pending Approval → warning · Approved → success · Rejected → danger |
| Requisition priority (`requisitionStatus.js`) | High → danger · Medium → warning · Low → success |
| Purchase Orders (`purchaseOrderStatus.js`) | Draft → neutral · Sent → navy · Partially Received → neutral · Completed → success · Cancelled → neutral |
| Purchase Invoices (`purchaseInvoiceStatus.js`) | Draft → info · Paid → successMuted · Partially Paid → successMuted · Overdue → warningStrong |
| Purchase Returns (`purchaseReturnStatus.js`) | Pending Approval → warningStrong · Credit Note Issued → warningStrong · Rejected → danger |
| Subcontractors (`subcontractorStatus.js`) | Active → success · Suspended → warningStrong · Inactive → success |
| Subcontract Agreements (`subcontractAgreementStatus.js`) | Active → success · Completed → success · Expired → danger |
| Subcontract Orders (`subcontractOrderStatus.js`) | Draft → info · Active → success · Completed → success · Cancelled → neutral |
| Subcontract Bills (`subcontractBillStatus.js`) | Submitted → warningStrong · Verified → success · Approved → success · Paid → success |
| Approvals (`approvalOptions.js`) | Priority HIGH → danger · MED → warning · LOW → success; Decision APPROVED → success · REJECTED → danger |
| Requisition approval history (`RequisitionDetail.jsx`) | Approved → success · Rejected → danger |

Subcontractor "Inactive" uses the green success tone, as in the reference design. Confirm with design whether it should be red.

### Buttons

| Button | Background | Hover |
| :-- | :-- | :-- |
| Page header "+ New / Record" (`PrimaryActionButton`) | `brand` `#c41e3a` | `brand-hover` `#a9172f` |
| Modal submit, detail-page primary | `brand-strong` `#c91e3a` | `brand-hover` `#a9172f` |
| Approve / success | `success` `#10b981` | `#059669` |
| Reject / danger (filled) | `danger` `#ef4444` | `#dc2626` |
| Cancel PO / danger (outline, detail pages) | white, red border and text | `danger-soft` `#fee2e2` |
| Secondary / outline | `surface` `#ffffff` with `line` border | `workspace` `#f4f6f9` |
| Login Sign In | `login` `#1a5276` | `login-hover` `#154360` |

### Charts (`src/components/charts/DonutChart.jsx`)

| Name | Hex |
| :-- | :-- |
| navy | `#1b2a4a` |
| brand | `#c41e3a` |
| success | `#10b981` |
| warning | `#f59e0b` |
| empty track | `#f1f5f9` |

### One-off colours written directly in components

These hex values are not theme tokens. They match specific reference screens and are written inline as
Tailwind arbitrary values (`text-[#1b2631]`). If they become shared, move them into `index.css` as tokens.

| Hex | Where | Used for |
| :-- | :-- | :-- |
| `#1b2631` | `TopBar.jsx`, supplier ledger components | Page title and ledger headings/amounts |
| `#4b5563` | `TopBar.jsx`, supplier ledger components | Search box text, ledger body text |
| `#9ca3af` | `LedgerSummaryCard.jsx` | Ledger labels and supplier code |
| `#e0e0e0` | `TopBar.jsx`, supplier ledger pages | Header bottom border, ledger card borders |
| `#f1f3f5` | `TopBar.jsx` | Header search box background |
| `#f2f4f4` | `App.jsx`, `LedgerStatementTable.jsx` | Ledger page background, ledger table header |
| `#27ae60` | Supplier ledger components | Payments / debit amounts (green) |
| `#dc2626` | Supplier ledger components; also danger button hover | Outstanding / credit amounts (red) |
| `#fdedec` | `LedgerSummaryCard.jsx` | Supplier initials tile background |
| `#ebf5fb` / `#1a5276` | `App.jsx` | Small header tag (background / text) |
| `#059669` | `ModalForm.jsx`, `ApprovalCard.jsx`, `DetailParts.jsx` | Success button hover |
| `#cbd5e1` | `formStyles.js`, `FilterSelect.jsx`, `SupplierReportsPage.jsx` | Input and card border on hover |
| `#f1f2f2`, `#e3e6e8`, `#dfe3e8` | `LoginPage.jsx` | Login page background, card border, input border |
| `#0f172a` (73%) | `Modal.jsx` | Modal backdrop |
| `#0b1226` (50%) | `AppShell.jsx` | Mobile sidebar backdrop |

### Rules

- Use a theme token (`bg-brand`, `text-muted`) instead of a hex value in new code.
- To show a status, add it to the feature's `*Status.js` file with a tone; don't colour badges by hand.
- An unknown status from the backend still renders, as a neutral grey badge with the raw value.