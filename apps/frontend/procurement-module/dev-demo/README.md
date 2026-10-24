# Procurement demo API (temporary, development only)

This folder holds a **temporary demo backend** so the procurement UI can be clicked through in a browser
before the real backend exists. Everything it returns is **fictional sample data**.

- It is not part of the production app. Nothing in `src/` imports it, and `npm run build` does not include it.
- All writes stay in memory and are lost when the server stops.
- Every response carries the header `X-Demo-Data: true`. The browser shows a fixed "DEMO MODE · sample data only"
  badge in the bottom-right corner, and the session reports the role "DEMO · Procurement Manager" and the tenant
  "ELVA Demo Tenant (sample data)".
- Every name, company, GSTIN, PAN, phone number and email is invented. GSTINs use state code `00` and PANs
  use the prefix `ZZD`, so none can match a real taxpayer. Emails use `.example` domains.

## Start

Run these from `apps/frontend/procurement-module`:

```powershell
npx vite --config dev-demo/vite.demo.config.mjs
```

Then open **http://localhost:5299/#/dashboard**.

The demo starts signed in. To try the full flow, click your name in the top right, choose **Log out**, then sign
in again with:

- Employee ID / Email: `demo` (or `demo@elva.example`)
- Password: `demo123`

This is a fictional demo account that only the demo API accepts. Any other combination shows the
"incorrect" message.

This starts the normal Vite dev server for the real frontend code, with the demo API mounted on the same origin at
`/demo-api`. Because the API is on the same origin, no CORS or cookie setup is needed.

Optional environment variables (set them in the shell only; there is no env file for them):

| Variable | Default | Effect |
| --- | --- | --- |
| `DEMO_PORT` | `5299` | Port for the demo frontend. The server fails rather than silently picking another port. |
| `DEMO_LATENCY_MS` | `250` | Artificial delay on each API call, so you can see the loading states. Use `0` to turn it off. |

PowerShell example: `$env:DEMO_LATENCY_MS = "1500"; npx vite --config dev-demo/vite.demo.config.mjs`

### Environment setup

None is required. For this process only, the demo config sets `VITE_API_BASE_URL=/demo-api`. Values already in
the process environment take precedence over `.env` files, so an existing `.env.local` that points to a real backend
is ignored by the demo and is **not modified**. No env file is created or changed.

The normal commands are unchanged:

- `npm run dev` uses `VITE_API_BASE_URL` from your own `.env.local` (see `.env.example`).
- `npm run build` produces the production bundle, which uses the real API client. There is no demo fallback.

### Standalone API only (optional)

```powershell
node dev-demo/server.mjs
```

This serves only the API, at `http://127.0.0.1:4599/demo-api` (override the port with `DEMO_API_PORT`). Use it for
curl checks or for the smoke test.

## Stop

Press `Ctrl+C` in the terminal running the command. If the terminal is gone:

```powershell
Get-NetTCPConnection -LocalPort 5299,4599 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

## Reset the data

Use any of these:

- Open `http://localhost:5299/demo-api/__demo/reset`.
- Restart the server.
- Use the standalone server's equivalent: `http://127.0.0.1:4599/demo-api/__demo/reset`.

### Other demo controls

These GET URLs control the demo only. They are not part of the real API contract.

| URL (prefix `http://localhost:5299/demo-api`) | Effect |
| --- | --- |
| `/__demo/status` | Shows record counts, the signed-in flag and the outage flag. |
| `/__demo/session?state=signed-out` | All API calls return `401`. The UI redirects to `#/login`. |
| `/__demo/session?state=signed-in` | Restores the session. Reload the page afterwards. The login form itself does not call an API. |
| `/__demo/outage?state=on` / `off` | All API calls return `503`, so you can see the error and retry states. |

The session and outage switches stay as you set them until you change them back or restart the server. Resetting the
data does not change them.

## Troubleshooting

| What you see | Cause | Fix |
| --- | --- | --- |
| You land on the login page | You logged out, or the demo session was switched to signed out. | Sign in with `demo` / `demo123`. |
| "The Employee ID / email or password is incorrect." | The credentials are not the demo account's. | Use `demo` / `demo123`. |
| Every page shows "Service temporarily unavailable" with a Retry button | The outage switch is on. | Open `http://localhost:5299/demo-api/__demo/outage?state=off`, then press Retry. |
| Pages show "Procurement service not connected" and no data | You opened the normal dev server (`npm run dev`, usually port 5173), which never uses demo data. | Use `http://localhost:5299/` from the demo command instead. |
| Records you created are gone | The server was restarted or the data was reset. Demo data is kept in memory only. | This is expected. |
| `Port 5299 is already in use` | A previous demo is still running in the background. | Run the stop command in [Stop](#stop), then start again. |

To check the current settings, open `http://localhost:5299/demo-api/__demo/status` and look at `signedIn` and `outage`.

## Smoke test

With either server running:

```powershell
node dev-demo/smoke-test.mjs                                  # standalone API on port 4599
node dev-demo/smoke-test.mjs http://localhost:5299/demo-api   # Vite demo
```

The script calls every endpoint, including writes, approval decisions and file downloads, and then resets the data.

## Sample data and fixed dates

"Today" in the demo is fixed at **2026-10-21**, and the financial year is **FY 2026 - 27** (1 Apr 2026 to
31 Mar 2027). "Overdue", "last 30 days" and "this month" are all calculated from that date, so the screens look
the same every day.

| Record | IDs | Notes |
| --- | --- | --- |
| Suppliers | `sup-001` … `sup-012` (codes `SUP-001` …) | `sup-010` and `sup-012` are inactive. |
| Purchase requisitions | `pr-001` … `pr-024` (`PR/26-27/0001` …) | Mix of approved, pending approval and rejected (no drafts). |
| Purchase orders | `po-001` … `po-024` (`PO/26-27/0001` …) | Linked to approved requisitions and suppliers. Received POs have goods receipts (`GRN/26-27/…`). |
| Purchase invoices | `inv-001` … `inv-020` | Linked to received purchase orders. Statuses: draft, partially paid, paid, overdue. Each payment and the TDS appear in the supplier ledger. |
| Purchase returns | `ret-001` … `ret-008` (`PRN/26-27/…`) | Returns with an issued credit note post a debit note to the ledger. |
| Subcontractors | `sc-001` … `sc-009` | `sc-006` is suspended and `sc-009` is inactive. |
| Agreements, orders, bills | `sca-…`, `sco-…`, `scb-…` | Orders belong to agreements; bills belong to orders. |
| Approvals | `apr-…` | Pending requests plus decided history. |
| Generated reports | `rep-001` … `rep-006` | Seeded as ready. A newly requested report shows as processing for about 4 seconds. |

The ledger, ledger statement, payment aging, dashboard KPIs and spend analysis are all calculated from the same
records, so their totals agree with each other.

The supplier ledger detail view has no link in the UI. Open it directly, for example
`http://localhost:5299/#/supplier-ledger/detail?supplierId=sup-001`.

Demo-only calculation constants: GST 18%, TDS 1%, retention 5%, annual budget ₹85 crore, and a 4.5 top-rated
threshold. These are **not** confirmed business rules; see `docs/backend-api-contract.md`.

## Supported endpoints

All paths are relative to `/demo-api`. They mirror the frontend services in `src/features/*/*Service.js`.

| Method | Path | Used by |
| --- | --- | --- |
| GET | `/procurement/session` | Session or user identity |
| POST | `/procurement/session` | Sign in (`demo` / `demo123`; works while signed out) |
| DELETE | `/procurement/session` | Log out (returns 204) |
| GET | `/procurement/lookups/{key}` | Dropdowns. Keys: `supplierCategories`, `paymentTerms`, `departments`, `requisitionPriorities`, `approvers`, `units`, `suppliers`, `approvedRequisitions`, `purchaseOrders`, `returnReasons`, `subcontractors`, `projects`, `tradeSpecialties`, `paymentSchedules`, `reportingPeriods`, `performancePeriods` |
| GET | `/procurement/dashboard` | Dashboard |
| GET, POST | `/procurement/suppliers` | Supplier Master list (`search`, `categoryId`, `status`, `page`, `pageSize`) and Add Supplier |
| POST | `/procurement/suppliers/{id}/status-changes` | Activate or deactivate a supplier |
| GET | `/procurement/suppliers/{id}/ledger` | Supplier Ledger (`fromDate`, `toDate`, page size 20) |
| GET | `/procurement/suppliers/{id}/statement` | Supplier Ledger detail |
| GET | `/procurement/suppliers/{id}/ledger/export?format=xlsx\|pdf` | Ledger export (real .xlsx and .pdf files) |
| GET | `/procurement/supplier-performance` | Supplier Performance (`periodId`, `categoryId`) |
| GET, POST | `/procurement/purchase-requisitions` | Requisitions list (`status`, `search`) and New Requisition |
| GET | `/procurement/purchase-requisitions/{id}` | Requisition View (all fields, items, approval history, Approve/Reject) |
| GET, POST | `/procurement/purchase-orders` | Purchase Orders list (`status`, `search`) and Create PO |
| GET | `/procurement/purchase-orders/{id}` | Purchase Order View (items with ordered/received/remaining, receipts) |
| POST | `/procurement/purchase-orders/{id}/status-changes` | Mark as Sent, Mark Completed, Cancel PO |
| POST | `/procurement/purchase-orders/{id}/receipts` | Record Receipt (received date and quantity per line) |
| GET | `/procurement/purchase-orders/{id}/returnable-lines` | New Return: lines of the selected PO |
| GET, POST | `/procurement/purchase-invoices` | Invoices list (`status`, `search`) and Record Invoice |
| GET | `/procurement/purchase-invoices/summary` | Invoice KPI cards |
| GET | `/procurement/purchase-invoices/{id}` | Invoice View (items, tax/TDS, payments, balance due) |
| POST | `/procurement/purchase-invoices/{id}/payments` | Record Partial Payment (amount, transaction ID, payment date) |
| POST | `/procurement/attachments` | Invoice attachment upload (multipart; PDF, JPG or PNG, up to 10 MB; only metadata is kept) |
| GET, POST | `/procurement/purchase-returns` | Returns list (`status`) and New Return |
| GET | `/procurement/purchase-returns/summary` | Return KPI cards |
| GET, POST | `/procurement/subcontractors` | Subcontractor list (`search`) and Add Subcontractor |
| GET | `/procurement/subcontractors/summary` | Subcontractor KPI cards |
| GET, POST | `/procurement/subcontract-agreements` | Agreements list (`status`) and New Agreement |
| GET | `/procurement/subcontract-agreements/summary` | Agreement KPI cards |
| GET | `/procurement/subcontract-orders` | Subcontract Orders list (`status`) |
| GET | `/procurement/subcontract-bills` | Subcontract Bills list (`status`) |
| GET | `/procurement/subcontract-bills/summary` | Bill KPI cards |
| GET | `/procurement/approvals/pending` | Approvals queue (`documentType`) |
| POST | `/procurement/approvals/{id}/decisions` | Approve or reject (a rejection needs a comment; a stale `expectedVersion` returns 409) |
| GET | `/procurement/approvals/history` | Approval History (`dateRange`, `documentType`, `decision`) |
| GET | `/procurement/approvals/history/export` | Approval History export (.xlsx) |
| GET | `/procurement/reports/definitions?group=purchase` | Purchase Reports tiles |
| GET | `/procurement/reports/generated` | Recently Generated list (page size 5) |
| POST | `/procurement/reports/generate` | Generate a report |
| GET | `/procurement/reports/generated/{id}/file` | Download a generated report |
| GET | `/procurement/reports/supplier-overview` | Supplier Reports (top suppliers and payment aging) |
| GET | `/procurement/reports/spend-analysis` | Spend Analysis |

Behaviour shared by all endpoints:

- Lists return `{ items, pagination: { page, pageSize, totalItems, totalPages } }`.
- Validation failures return `422` with `{ error: { code, message, fieldErrors, requestId } }`.
- POST requests that repeat an `Idempotency-Key` get the cached response back.
- Any other path returns `404` or `405` with code `demo_not_implemented`.

### Demo-only behaviour (not confirmed for the real backend)

These effects are invented for the demo; the real rules are still unresolved in the contract.

- **New records.** New requisitions start as `pending_approval` and new purchase orders as `draft`; both create a pending approval. New invoices start as `draft` and create no approval. New returns start as `pending_approval`.
- **Approvals.**
  - Approving a requisition sets it to `approved`; rejecting it sets `rejected`. The same decision can be made from the requisition View.
  - Approving a purchase order sets it to `sent`; rejecting it sets `cancelled`. This only happens if the PO is still `draft` (it may have been changed manually from View).
  - Approving a subcontract bill sets it to `approved`; rejecting it sets `submitted`.
- **Purchase order View.**
  - Draft: Mark as Sent, Record Receipt, Mark Completed, Cancel PO. Sent and partially received: Record Receipt, Mark Completed, Cancel PO. Completed and cancelled: no actions.
  - A receipt cannot take any line above its ordered quantity (422 on `items[i].quantity`). After a receipt the PO becomes `partially_received`, or `completed` when everything is received.
  - The receipt amount is quantity × unit price plus GST, calculated by the demo API.
- **Invoice View.** A payment must be more than zero and no more than the balance due (net payable minus payments so far). The invoice becomes `partially_paid`, or `paid` when the balance reaches zero. The first payment also posts the TDS entry in the ledger.
- **Invoice totals.** If you enter a stated total, it must be within ₹1 of quantity × rate plus tax.
- **Returns.** You can return at most the received quantity minus anything already returned.

## UI actions the demo cannot support

These actions make no API call in the current UI, so the demo can't make them work.

- Password reset ("Forgot Password?" on `#/login`).
- The header search box.
- Record detail screens other than requisitions, purchase orders and invoices, which are still a placeholder.
- The Workspace screen, which has not been built.
- Bulk approval, which is disabled.
- "Create Order" on Subcontract Orders and "Record Bill" on Subcontract Bills. Both buttons are disabled, and
  there is no create endpoint in the services.
- The "Compliance Report" tile, which is disabled.
- Editing a supplier. There is no edit UI and no edit endpoint.

Endpoints that cannot be inferred from the frontend (no service defines them), so the demo does not implement them:

- Session refresh and password reset.
- Fetching a single return, subcontract record, approval or report, and any edit or delete endpoint.
- Creating subcontract orders or subcontract bills.

Known contract mismatch (affects the real backend too): when a return line fails validation on the server, the
error key is `items[i].quantity`, where `i` is the index within the lines actually sent. The form field is
`items.N.quantityReturning`, so these errors appear only in the form's error banner.

Spend Analysis always calls the API with an empty `periodId`, because the page has no period selector.

## Remove

1. Stop the server.
2. Delete this `dev-demo/` folder.
3. Optionally delete `node_modules/.vite-demo/`, the demo's separate Vite cache.

Nothing else in the project refers to this folder.
