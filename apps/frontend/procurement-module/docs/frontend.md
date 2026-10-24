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