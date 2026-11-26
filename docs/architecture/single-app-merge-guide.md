# ELVA Single React App — Merge Guide

**Purpose:** Merge five modules into **one** tenant-aware, **role-based access (RBAC)** ERP SPA — one login, one URL. Access is **never** “see everything then hide later”; it is **defined by role at login** for the **whole product** (all modules).  
**Audience:** Team leads and developers planning the work.

---

## 0 — RBAC is the product model (read before anything else)

This merge is **not** “five apps in one folder, add roles later.”

| Concept | Meaning in ELVA |
|---------|------------------|
| **Tenant** | Company / org; data and users belong to one tenant. |
| **Role** | Warehouse, HR admin, buyer, etc. — assigned to the user. |
| **User key** | Unique id at login (employee id / account id). |
| **RBAC** | Role → **what screens** (`navigation[]`) and **what actions** (`permissions[]`) this user gets **across all modules**. |
| **At login** | API returns `user`, `tenant`, `role`, `navigation[]`, `permissions[]`, `defaultRoute`. UI is built **only** from that. |

**Tenant + RBAC apply to the entire ERP** — sidebar, pages, buttons, notifications, APIs — not one module at a time.

**During merge:** We still use **`mockSession.js`** with **the same JSON shape** as production (fake roles, fake keys). We are **not** skipping RBAC architecture; we are **mocking the auth API** until the identity service is live.

---

## 1 — Approach at a glance (read this first)

### What we are building

Today: **five small apps** — five logins, no shared roles.

Target: **one RBAC-driven app** at `apps/frontend/elva-app/` — user signs in once → **role decides everything they see** in Inventory, Procurement, HR, Agreement, and the fifth module. No module dropdown. No full menu with hidden items “for later.”

### How we do it (simple version)

1. Create empty **elva-app** (one `main.jsx`).  
2. **Create `platform/session/` first** — `access.js`, session shape, `mockSession` **with roles and nav keys** (RBAC-shaped from day one).  
3. Copy generic UI once into **`shared/`**.  
4. One **`LoginPage`** → `authService` → session stored → **all shell code uses RBAC helpers**.  
5. Add **`app/buildSidebarNav.js`** + **`AppRouter`** guards — **filter by `session.navigation`**.  
6. Move each **`modules/<name>/`** one at a time (business code only).  
7. Wire **real** tenant/session API when backend is ready — **replace mock, keep same session contract**.

### All five at once vs one by one (decision)

| Strategy | Verdict |
|----------|---------|
| **Paste all 5 modules in one commit / one PR** | **Do not.** Duplicate UI files, merge conflicts, cannot tell which module broke the app. |
| **One module at a time, test, then next** | **Yes.** This is the default plan. |

**Order (recommended):** shell + `platform/session` + `shared/` → **Inventory** → **Procurement** → **HR** → **Agreement** → **fifth module** → delete old `*-module` apps when parity is done.

**After each step, before the next:**

- [ ] `npm run dev` in `elva-app` only  
- [ ] `npm test` (or module tests you care about)  
- [ ] Smoke: login (mock role), sidebar keys, open 2–3 routes for the module you just merged  
- [ ] Merge that step to the **integration branch** (see below) — then start the next module

You do **not** wait until all five are moved to run the app; you run it after **shell** and after **every** module PR.

### Git branches (same branch or different?)

| Branch | Role |
|--------|------|
| **`integrate/elva-app`** (long-lived) | **Main merge target.** Everyone merges completed steps here. This is the single app that must stay runnable. |
| **`feature/elva-shell`** | Step 0–1: empty Vite app + `platform/session` + `shared/` + login — merge → `integrate/elva-app` |
| **`feature/elva-inventory`** (example) | Only Inventory move + import fixes — merge → `integrate/elva-app` |
| **`feature/elva-procurement`**, **`feature/elva-hr`**, … | Same pattern — **one module per branch/PR** |

**Rules:**

1. **Do not** open five module feature branches all targeting `main` at the same time without merging to `integrate/elva-app` in order.  
2. **Do** merge step N → `integrate/elva-app` → test → then branch step N+1 **from latest `integrate/elva-app`**.  
3. **`shared/`**, **`app/`**, **`platform/`** — only one PR at a time should touch these, or coordinate on `integrate/elva-app` to avoid conflicts.  
4. Old `inventory-module`, `procurement-module`, etc. stay on repo until **`integrate/elva-app`** reaches parity; then remove in a cleanup PR.

**Not this:** five developers each pasting a full old app into `elva-app` on five parallel branches for weeks.

**Yes this:** linear (or lightly parallel) **steps**, each **tested** on **`integrate/elva-app`**.

### Core principle — one session rules the **entire ERP** (not sidebar only)

| Area | Driven by same `session` (+ backend) |
|------|--------------------------------------|
| Sidebar | `buildSidebarNav(session)` + `session.navigation[]` |
| First page | `session.defaultRoute` |
| Any URL | `AppRouter` + `canAccessRoute` → page or Forbidden |
| Buttons (Create, Export, Approve) | `hasPermission(session, '…')` on each module page |
| Notifications (bell) | `platform/notifications` → **one** API for this user key; backend returns only their alerts |
| Global search (when built) | Same — scoped API, not per-module “who am I” logic |
| All module APIs | Backend checks user + tenant; frontend session is UX only |

**Modules** (`modules/inventory/`, etc.) = **screens + domain services** (inward, PO, HR). They **do not** each implement “what this user may see in ELVA overall.” That lives in **`platform/`** + **`app/`** + API.

### Navigation: Option A + login-driven UI

| Rule | Meaning |
|------|---------|
| **Unique user key** | Login identifies the user; session lists which **nav keys** and **permissions** they have. |
| **Sidebar at login** | As soon as login succeeds, sidebar is **fully built** from RBAC — every Inventory / HR / Procurement item they’re allowed to use **already appears**. Nothing hidden until they “click to unlock.” |
| **Default screen** | App opens their **home route** from session (e.g. `defaultRoute: "#/hr/dashboard"`). |
| **Opening another screen** | User uses **sidebar menu items that are already there** (normal menu navigation). Access was decided **at login**, not when they click. |
| **No module dropdown** | Top bar = logo, search, bell, user only. |
| **Direct URL / bookmark** | If they type a route they’re **not** allowed → **Forbidden** page; API still returns 403. |

**Wrong mental model:** “Each module wires its own menu, bell, and permissions.”  
**Right mental model:** “Login returns one session; **everything visible in the shell** follows that session across **all** modules.”

### Where to read more

| Topic | Section |
|-------|---------|
| One-by-one merge, test gates, branch strategy | **§1** (above) |
| After-login UI + session-driven shell (all modules) | **§2** |
| One session governs whole ERP (reference table) | **§2.1** |
| Copy vs move from old repos | **§3** |
| Tenant + RBAC (foundation, mock vs live API) | **§0**, **§4**, **§4a** |
| `[inv]` / `[pro]` tags | **§4b** |
| Full folder tree + per-folder detail | **§5** (start at **§5.0**) |
| Login → sidebar file-by-file | **§5.12** |
| apiClient vs module services & schemas | **§5.14** |
| NotificationBell + platform notifications (not per-module merge) | **§5.15** |
| Runtime flow summary | **§6** |
| Checklist | **§8** |

---

## 2 — After login: what the user sees

### Step-by-step (login → UI)

1. User enters credentials on **one** `LoginPage` (tied to their **unique user key**).  
2. **POST /session** (or mock) returns e.g. `{ user, tenant, navigation: ["inventory.inward", "hr.employees", ...], permissions: [...], defaultRoute: "#/inventory/dashboard" }`.  
3. App saves session in **`platform/session`**.  
4. **`buildSidebarNav(session)`** runs:
   - Loads all modules’ `navigation.js` definitions  
   - Keeps only items whose **key** is in `session.navigation`  
   - Produces **complete sidebar sections** for this user  
5. **`AppShell`** renders: **TopBar** + **Sidebar (full allowed menu)** + **main area**.  
6. Router goes to **`defaultRoute`** — first screen (e.g. Inventory Dashboard).  
7. User opens other **allowed** screens from the **sidebar menu already shown** — RBAC does not change until logout / session refresh.  
8. **Bell, user menu, tenant name** use the **same session** — notifications from **`platform/notifications`**, not separate per-module “connect procurement to bell.”

### 2.1 Session controls the full shell (all modules)

| UI part | File(s) | Rule |
|---------|---------|------|
| Login | `pages/LoginPage.jsx`, `platform/session/authService.js` | Sets session once |
| Sidebar | `app/buildSidebarNav.js`, `shared/.../Sidebar.jsx` | `session.navigation[]` |
| Main page | `app/AppRouter.jsx` | `defaultRoute` + allowed hash |
| Forbidden | `pages/ForbiddenPage.jsx` | Route ∉ session |
| Create / export buttons | Each `modules/*/pages/*.jsx` | `hasPermission(session, …)` |
| Notification bell | `shared/.../NotificationBell.jsx`, `platform/notifications/useNotifications.js` | `GET /notifications` (user-scoped on server) |
| User + tenant in header | `UserMenu.jsx`, `useSession()` | `session.user`, `session.tenant` |

### Layout diagram

```
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR     [ELVA]  [Search]  [Bell]  [User · tenant]        │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN (defaultRoute, then user’s choice)      │
│ (complete    │                                              │
│  menu for    │  e.g. Dashboard, Inward, Employees           │
│  THIS user   │                                              │
│  from login) │                                              │
│              │                                              │
│ INVENTORY    │                                              │
│   Dashboard  │                                              │
│   Inward     │                                              │
│ HR           │                                              │
│   Employees  │                                              │
│ (no extra    │                                              │
│  items)      │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### vs today

| Today | Single app |
|-------|------------|
| Five apps / five logins | One login, one session |
| Each app shows full sidebar for that product | One sidebar = **only keys returned for this user id** across all products |
| Role logic per app | **One** session for sidebar, routes, actions, bell — all modules |

---

## 3 — What moves from old folders (overview)

| Bucket | Destination | What |
|--------|-------------|------|
| **A** | `shared/` | UI + generic hooks/lib — **once** |
| **B–F** | `modules/*/` | Pages, features, services, `navigation.js` |
| **—** | `app/` | Router, `buildSidebarNav`, `ModuleRegistry` |
| **—** | `platform/session/` | Login, session, `access.js` (all modules) |
| **—** | `platform/notifications/` | One bell feed for logged-in user (API or mock) |
| **—** | `pages/` | One `LoginPage`, Forbidden, 404 |
| **Trash** | — | Old `main.jsx`, per-module `App.jsx`, duplicate logins |

*(Bucket detail unchanged — see §3 in prior team notes or §5 below for paths.)*

---

## 4 — Tenant and RBAC (when)

| Phase | What |
|-------|------|
| **Merge** | Mock session with fake user key + full `navigation` list for dev |
| **Integration** | Real session: user key → API returns tenant + `navigation[]` + `permissions[]` |
| **Production** | Backend validates user key + tenant on **every** API call |

Frontend (sidebar, buttons, bell) = **UX mirror** of session; **security = API on every domain call** (`/inventory/...`, `/procurement/...`, `/notifications`, …).

---

## 4a — Session vs module code (division of labour)

| Layer | Responsibility |
|-------|----------------|
| `platform/session/` | Who is logged in, tenant, `navigation[]`, `permissions[]`, `defaultRoute` |
| `platform/notifications/` | Fetch list for **this user** (server already filtered) |
| `app/` | Router guards, `buildSidebarNav`, module registration |
| `shared/` | Dumb UI + `apiClient` |
| `modules/*/` | Business pages, forms, `*Service.js` for **domain** APIs only |

Modules **must not** re-implement login or “which ERP areas exist for user.”

---

## 4b — Tags `[inv]` / `[pro]`

Copy-source labels only. **All five modules** live as siblings under `modules/`. `shared/` and `platform/` serve **everyone**.

---

## 5 — Folder structure (detailed)

Each subsection: **purpose**, **how it communicates**, **file tree**.

---

### 5.0 Complete tree — `apps/frontend/elva-app/` (one picture)

This is the **whole new app** in one view. Details for each branch are in **§5.1–§5.11**.

```
apps/frontend/elva-app/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .env.example
├── public/
│   └── favicon.ico
└── src/
    ├── main.jsx
    ├── index.css
    │
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── ForbiddenPage.jsx
    │   └── NotFoundPage.jsx
    │
    ├── app/
    │   ├── App.jsx
    │   ├── AppRouter.jsx
    │   ├── buildSidebarNav.js
    │   ├── ModuleRegistry.js
    │   └── providers.jsx
    │
    ├── platform/
    │   ├── session/
    │   │   ├── SessionProvider.jsx
    │   │   ├── sessionContext.js
    │   │   ├── authService.js
    │   │   ├── access.js
    │   │   └── mockSession.js
    │   └── notifications/
    │       ├── notificationService.js   … GET /notifications (user-scoped)
    │       └── useNotifications.js      … hook for NotificationBell (uses session)
    │
    ├── shared/
    │   ├── components/
    │   │   ├── brand/BrandMark.jsx
    │   │   ├── layout/
    │   │   │   ├── AppShell.jsx
    │   │   │   ├── Sidebar.jsx
    │   │   │   ├── TopBar.jsx
    │   │   │   ├── UserMenu.jsx
    │   │   │   ├── UserIdentity.jsx
    │   │   │   └── NotificationBell.jsx            — UI; data from platform/notifications/useNotifications
    │   │   └── ui/                    … DataTable, Modal, Toast, forms, …
    │   ├── hooks/                       … useHashRoute, usePageSearch, …
    │   └── lib/
    │       ├── apiClient.js
    │       ├── apiConfig.js
    │       └── … dateUtils, validation, search, …
    │
    └── modules/
        ├── inventory/
        │   ├── navigation.js
        │   ├── routes.js
        │   ├── pages/                   … 12 screens
        │   ├── features/                … inward, warehouses, notifications/, …
        │   ├── schemas/
        │   ├── lib/
        │   ├── hooks/
        │   └── mock-api/
        ├── procurement/
        │   ├── navigation.js
        │   ├── routes.js
        │   ├── pages/
        │   ├── features/
        │   ├── components/charts/
        │   └── hooks/
        ├── hr/
        │   ├── navigation.js
        │   ├── routes.js
        │   ├── pages/
        │   └── features/
        ├── agreement/
        │   ├── navigation.js
        │   ├── routes.js
        │   ├── pages/
        │   └── features/
        └── <fifth>/
            ├── navigation.js
            ├── routes.js
            ├── pages/
            └── features/
```

**Rule:** Anything under **`modules/*`** is **business** (one module). Anything under **`shared/`**, **`platform/`**, **`app/`**, **`pages/`** is **for the whole ERP**.

---

### 5.1 Root — `apps/frontend/elva-app/`

**Purpose:** The only deployable frontend package after merge. One Vite app, one dependency tree.

**Communicates:** Nothing imports “from outside” except npm packages. Old `*-module` folders are not runtime dependencies.

```
apps/frontend/elva-app/
├── index.html              — single HTML entry; mounts #root
├── package.json            — scripts: dev, build, test
├── vite.config.js          — aliases: @shared, @app, @modules/...
├── .env.example            — VITE_API_BASE_URL, VITE_API_MODE
├── public/                 — static assets
└── src/                    — all application source (below)
```

---

### 5.2 `src/main.jsx` + `src/index.css`

**Purpose:** **Only** React entry. Boots the SPA once.

**Communicates:** Imports `app/App.jsx` and global CSS. **Never** imports a module page directly.

---

### 5.3 `src/app/` — application wiring

**Purpose:** “Brain” of the SPA: auth gate, router, **sidebar builder**, module registration. **No business rules** (no PO logic here).

| File | Purpose | Talks to |
|------|---------|----------|
| `App.jsx` | If no session → Login; else shell + router | `pages/LoginPage`, `platform/session`, `AppShell`, `AppRouter` |
| `AppRouter.jsx` | Hash URL → correct `modules/*/pages/*` | All `modules/*/routes.js` |
| `buildSidebarNav.js` | **After login:** merge `navigation.js` from all modules, **filter by `session.navigation` keys**, return sidebar sections | `ModuleRegistry`, each `modules/*/navigation.js`, `platform/access.js` |
| `ModuleRegistry.js` | Internal list: module id, path prefix, import navigation + routes | Used only by `buildSidebarNav` + `AppRouter` — **not shown in UI** |
| `providers.jsx` | Wraps SessionProvider, PageSearchProvider, etc. | `platform/session`, `shared/hooks` |

```
src/app/
├── App.jsx
├── AppRouter.jsx
├── buildSidebarNav.js
├── ModuleRegistry.js
└── providers.jsx
```

**RBAC point:** `buildSidebarNav` is why the user sees **their full allowed sidebar immediately after login** — not after exploring links.

---

### 5.4 `src/platform/session/` — identity for all modules

**Purpose:** One session for entire ERP. **User key** in login → session object used app-wide.

| File | Purpose |
|------|---------|
| `SessionProvider.jsx` | Holds session state; reload on login/logout |
| `sessionContext.js` | `useSession()` hook |
| `authService.js` | `signIn`, `signOut`, `getSession` → API |
| `access.js` | `canAccessRoute(session, key)`, `hasPermission(session, perm)` |
| `mockSession.js` | Dev: fake user id + navigation list |

**Communicates:** `LoginPage` → `authService` → API. `App.jsx`, `buildSidebarNav`, `Sidebar` filter, buttons on pages use `useSession` / `hasPermission`.

**Not here:** Inward, PO, HR payroll, etc.  
**Related:** `platform/notifications/` — same session, **one** bell API (see **§5.15**).

---

### 5.5 `src/pages/` — screens that belong to the whole app

**Purpose:** Not owned by Inventory or HR — **global** pages.

| File | Purpose |
|------|---------|
| `LoginPage.jsx` | One form; all modules share this gate |
| `ForbiddenPage.jsx` | User hit a route not in their `session.navigation` |
| `NotFoundPage.jsx` | Unknown hash |

**Communicates:** `App.jsx` routes here when unauthenticated or forbidden.

---

### 5.6 `src/shared/` — UI kit + generic utilities

**Purpose:** Components **every module reuses**. Copied **once** from Inventory or Procurement twin. **No** inward/PO/HR business logic.

**Communicates:**

- `modules/*/pages` import `shared/components/ui/*`  
- `modules/*/features/*Service.js` import `shared/lib/apiClient.js`  
- `AppShell` imports `Sidebar`, `TopBar`; `Sidebar` receives `sections={buildSidebarNav(...)}`  

**TopBar:** logo, search, bell, user — **no** module dropdown.

**Sidebar:** renders **pre-built sections** from `buildSidebarNav` — does not compute RBAC itself.

```
src/shared/
├── components/
│   ├── brand/BrandMark.jsx
│   ├── layout/
│   │   ├── AppShell.jsx      — shell: sidebar + top bar + children
│   │   ├── Sidebar.jsx       — renders section titles + nav items (data from app)
│   │   ├── TopBar.jsx
│   │   ├── UserMenu.jsx      — reads session (user, tenant)
│   │   ├── UserIdentity.jsx
│   │   └── NotificationBell.jsx            — UI; data from platform/notifications/useNotifications
│   └── ui/
│       ├── DataTable.jsx, Modal.jsx, ModalForm.jsx, Toast.jsx
│       ├── FormField.jsx, FormFields.jsx, SelectInput.jsx, SearchInput.jsx
│       ├── PrimaryActionButton.jsx, Badge.jsx, StatCard.jsx, Pagination.jsx
│       ├── LineItemsEditor.jsx, FilterSelect.jsx, DateRangeFilter.jsx
│       ├── AsyncState.jsx, ListFooter.jsx, Panel.jsx
│       └── badgeStyles.js, formStyles.js, errorMessages.js
├── hooks/
│   ├── useHashRoute.js       — hash routing for AppRouter
│   ├── usePageSearch.jsx
│   ├── useClientPagination.js
│   ├── useDebouncedDraft.js
│   ├── useFormSubmission.js
│   └── useListQuery.js
└── lib/
    ├── apiClient.js          — fetch + errors; all *Service.js use this
    ├── apiConfig.js          — base URL, mock/real mode
    ├── dateUtils.js
    ├── formatters.js
    ├── paginateList.js
    ├── search.js
    └── validation.js
```

---

### 5.7 `src/modules/inventory/` — inventory product code

**Purpose:** Everything **only Inventory** needs: screens, forms, inventory API wrappers, inventory mocks.

**Communicates:**

- `navigation.js` — defines nav **keys** (must match RBAC / `session.navigation`)  
- `routes.js` — maps `#/inventory/...` → page component for `AppRouter`  
- `pages/*` → `features/*` → `*Service.js` → `shared/apiClient` with `/inventory/...` paths  
- Cross-module data: e.g. `supplierService.js` calls `/procurement/suppliers` via same apiClient  

**Does not contain:** Login, AppShell, global session (those are in `pages/`, `shared/`, `platform/`).

```
src/modules/inventory/
├── navigation.js
├── routes.js
├── pages/
│   ├── DashboardPage.jsx
│   ├── DeliveryNotesPage.jsx
│   ├── InwardPage.jsx
│   ├── ItemMasterPage.jsx
│   ├── OutwardPage.jsx
│   ├── SalesInvoicesPage.jsx
│   ├── StockAgingPage.jsx
│   ├── StockLedgerPage.jsx
│   ├── StockReconciliationPage.jsx
│   ├── StockTransferPage.jsx
│   ├── WarehouseDashboardPage.jsx
│   └── WarehouseDetailPage.jsx
├── features/
│   ├── aging/
│   ├── delivery-notes/
│   ├── inward/                 — AddInwardModal, inwardService.js
│   ├── invoices/
│   ├── items/
│   ├── ledger/
│   ├── notifications/          — notificationService.js
│   ├── outward/
│   ├── reconciliation/
│   ├── suppliers/              — may call procurement API
│   ├── transfers/
│   └── warehouses/
├── schemas/inventorySchemas.js
├── lib/inventoryStatusBadges.js
├── hooks/                            (no bell hook here — use platform/notifications)
└── mock-api/
    ├── mockApiAdapter.js
    └── mockDatabase.js
```

---

### 5.8 `src/modules/procurement/` — procurement product code

**Purpose:** Procurement screens, PO/supplier/ledger services, procurement-only charts.

**Communicates:** Same pattern as inventory: `navigation.js` keys for RBAC, `routes.js` for `#/procurement/...`, features call `/procurement/...` via apiClient.

**Note:** Old `features/auth/` moves to **`platform/session/`**, not here.

```
src/modules/procurement/
├── navigation.js
├── routes.js
├── pages/
│   ├── DashboardPage.jsx
│   ├── SupplierMasterPage.jsx
│   ├── SupplierLedgerPage.jsx
│   ├── SupplierLedgerDetailPage.jsx
│   ├── SupplierPerformancePage.jsx
│   ├── PurchaseRequisitionsPage.jsx
│   ├── PurchaseOrdersPage.jsx
│   ├── PurchaseInvoicesPage.jsx
│   ├── PurchaseReturnsPage.jsx
│   ├── PurchaseReportsPage.jsx
│   ├── SpendAnalysisPage.jsx
│   ├── PendingApprovalsPage.jsx
│   ├── ApprovalHistoryPage.jsx
│   ├── SubcontractorsPage.jsx
│   ├── SubcontractAgreementsPage.jsx
│   ├── SubcontractBillsPage.jsx
│   ├── RecordDetailPage.jsx
│   └── NotFoundPage.jsx        — or only global 404 in src/pages
├── features/
│   ├── approvals/
│   ├── lookups/
│   ├── purchase-invoices/
│   ├── purchase-orders/
│   ├── purchase-requisitions/
│   ├── purchase-returns/
│   ├── reports/
│   ├── subcontract-agreements/
│   ├── subcontract-bills/
│   ├── subcontract-orders/
│   ├── subcontractors/
│   ├── supplier-ledger/
│   ├── supplier-performance/
│   └── suppliers/
├── components/charts/
│   ├── ColumnChart.jsx
│   └── DonutChart.jsx
└── hooks/
    ├── useAsyncResource.js
    └── useLookupOptions.js
```

---

### 5.9 `src/modules/hr/` — HR product code

**Purpose:** HR menus and screens (many sidebar entries). Split from today’s single large `App.jsx`.

**Communicates:** `navigation.js` with all HR keys for RBAC; pages under `pages/`; `*Service.js` under `features/` → `/hr/...` API.

```
src/modules/hr/
├── navigation.js               — all HR section labels + keys
├── routes.js
├── pages/                      — one file per major screen (from split App.jsx)
│   ├── DashboardPage.jsx
│   ├── DepartmentsPage.jsx
│   ├── EmployeeDirectoryPage.jsx
│   └── …
└── features/                   — attendance, payroll, etc. as you extract them
```

**RBAC:** HR user login returns many keys in `session.navigation` → `buildSidebarNav` shows **full HR block** in sidebar immediately.

---

### 5.10 `src/modules/agreement/` — agreement product code

**Purpose:** All agreement UI and APIs.

```
src/modules/agreement/
├── navigation.js
├── routes.js
├── pages/
├── features/                   — agreement *Service.js files
├── schemas/                    — optional
├── lib/                        — optional
└── mock-api/                   — optional
```

---

### 5.11 `src/modules/<fifth>/` — fifth module (e.g. finance)

**Purpose:** Same contract as 5.7–5.10.

```
src/modules/<fifth>/
├── navigation.js
├── routes.js
├── pages/
├── features/
├── schemas/                    — optional
└── mock-api/                   — optional
```

---

### 5.12 Login → session → sidebar → page (every file, step by step)

#### A) User logs in

| Step | File | What happens |
|------|------|----------------|
| 1 | `pages/LoginPage.jsx` | User submits employee id / password (unique **user key**). |
| 2 | `platform/session/authService.js` | `signIn({ username, password })` → calls API `POST /auth/session` (or mock). |
| 3 | `shared/lib/apiClient.js` | Sends HTTP request with credentials; returns JSON body. |
| 4 | API response | `{ user, tenant, navigation: string[], permissions: string[], defaultRoute: string }` — **navigation** lists allowed **nav keys** (RBAC). |
| 5 | `platform/session/SessionProvider.jsx` | Saves session in React state; status = `authenticated`. |
| 6 | `platform/session/sessionContext.js` | `useSession()` now returns this user everywhere. |

**Files that do NOT run login:** `buildSidebarNav.js`, `Sidebar.jsx`, any `modules/*/features/*Service.js`.

#### B) App decides what to render after login

| Step | File | What happens |
|------|------|----------------|
| 7 | `app/App.jsx` | Reads `useSession()`. If authenticated → render `AppShell` + `AppRouter`, not `LoginPage`. |
| 8 | `app/App.jsx` (or child) | Calls `buildSidebarNav(session)` **once** when session becomes available (and when session reloads). |
| 9 | `app/buildSidebarNav.js` | See **§5.12.1** below. |
| 10 | `shared/components/layout/AppShell.jsx` | Receives `navSections={sections}` from step 9. |
| 11 | `shared/components/layout/Sidebar.jsx` | **Only UI:** maps `sections` to labels and links; highlights active route. **No RBAC logic inside.** |
| 12 | `app/AppRouter.jsx` | Reads hash; if matches `session` access → loads page from `modules/*/pages/`; else `ForbiddenPage`. |
| 13 | Route | Starts at `session.defaultRoute` (e.g. `#/inventory/dashboard`). |

#### C) User sees a screen

| Step | File | What happens |
|------|------|----------------|
| 14 | `modules/inventory/pages/InwardPage.jsx` (example) | Renders UI; uses `shared` components. |
| 15 | `modules/inventory/features/inward/inwardService.js` | `listInward()` → `apiRequest('/inventory/inward', …)`. |
| 16 | `shared/lib/apiClient.js` | One `fetch` implementation, cookies/headers, error mapping. |
| 17 | Backend | Checks **same user key + tenant + permissions**; returns data or 403. |

---

#### 5.12.1 What `buildSidebarNav.js` does (and how it talks to RBAC + Sidebar)

**Job:** Turn **session + module menus** into **sidebar data** (sections and items).

**Inputs:**

- `session` from `useSession()` — must include `session.navigation` (array of allowed keys, e.g. `"inventory.inward"`, `"hr.employees"`).
- `ModuleRegistry.js` — list of modules and how to import each `navigation.js`.
- Each `modules/*/navigation.js` — full menu **definitions** for that product (labels, hash paths, **navKey** per item).

**Logic (pseudocode):**

```text
for each module in ModuleRegistry:
  load NAV_SECTIONS from modules/<module>/navigation.js
  for each item in NAV_SECTIONS:
    if item.navKey is in session.navigation:
      add item to output sections (grouped by module title)
return sections array → { title: "INVENTORY", items: [{ label, href, key }, …] }
```

**RBAC:** Uses `platform/session/access.js` → `canAccessRoute(session, navKey)` which checks `session.navigation.includes(navKey)` (and later `permissions` for buttons).

**Output:** Plain JavaScript array. **No React.** No fetch.

**Who consumes it:**

- `app/App.jsx` (or `AppShell` wrapper) passes `sections` into `AppShell` → `Sidebar`.
- `Sidebar.jsx` receives `sections` as **props** and renders HTML. If session changes (logout/login as different user), `App.jsx` recomputes `buildSidebarNav` → sidebar **re-renders** with new menu.

**Communication chain:**

```text
session.navigation (from API, stored in SessionProvider)
        ↓
buildSidebarNav(session)  ← reads nav definitions, filters by keys
        ↓
sections prop
        ↓
Sidebar.jsx  ← draw only; does not read session directly (recommended)
```

Optional: `Sidebar` may call `canAccessRoute` again as a safety net on click — primary filter is still at build time in `buildSidebarNav`.

---

### 5.14 `apiClient.js` vs module `*Service.js` vs `schemas/` (you are not wrong — two layers)

Both exist on purpose. They do **different jobs**.

| Layer | Location | What it is | Example |
|-------|----------|------------|---------|
| **HTTP engine** | `shared/lib/apiClient.js` | One place: `fetch`, base URL, JSON, errors, 401/403 handling | `apiRequest(path, { method, body })` |
| **Module API** | `modules/inventory/features/**/inwardService.js` | **Business** endpoints for **one domain** | `export function listInward() { return apiRequest('/inventory/inward') }` |
| **Validation shape** | `modules/inventory/schemas/inventorySchemas.js` | **Zod/Yup/rules** for forms and payloads — not HTTP | `inwardCreateSchema` |
| **Mock** | `modules/inventory/mock-api/` | Fake backend for dev — optional per module | `mockApiAdapter.js` |

**`apiClient` is not a “service” in the ERP sense** — it is **infrastructure** (like axios instance).  
**`inwardService.js` is a service** — it knows **which URLs and shapes** belong to Inward.

**Flow:**

```text
InwardPage.jsx
   → inwardService.listInward()
        → apiClient.apiRequest('/inventory/inward')
             → network
```

**Procurement** has its own `purchaseOrderService.js` in `modules/procurement/features/…` — **same** `apiClient`, **different** paths (`/procurement/purchase-orders`).

**Schemas:** Stay in the **module** that owns the data (`inventorySchemas.js` for inward lines). `shared/lib/validation.js` is only **generic** helpers (trim, optional rules), not PO line rules.

**Nothing duplicates:** You do **not** put `inwardService` in `shared/`. You do **not** copy `apiClient` per module.

| Question | Answer |
|----------|--------|
| Global + module both have “services”? | Global = **apiClient only** (and maybe tiny helpers). Module = **domain services**. |
| Global + module both have schemas? | Global = generic validation helpers. Module = **domain schemas**. |
| Does Procurement need its own apiClient? | **No** — import from `shared/lib/apiClient.js`. |

---

### 5.15 Example: `NotificationBell` — shell UI + **platform** feed (same rule as sidebar)

**Principle:** Bell is part of **main shell**, not “inventory bell + procurement bell merged.” After login, user sees **only notifications meant for their user key** — same as `session.navigation[]` for sidebar. **Do not** add `useAggregatedNotifications` or call each module’s notification service from the bell.

**Today (Inventory standalone):**

| File | Role |
|------|------|
| `NotificationBell.jsx` | UI → move to **`shared/components/layout/`** |
| `features/notifications/notificationService.js` | Client-side/mock rules for inventory-only app |

**After merge:**

| Piece | Where | Role |
|-------|--------|------|
| Bell UI | `shared/components/layout/NotificationBell.jsx` | Renders list; **no RBAC logic** |
| Data hook | `platform/notifications/useNotifications.js` | `useSession()` → calls **one** service |
| API wrapper | `platform/notifications/notificationService.js` | `apiRequest('/notifications', …)` — backend returns **pre-filtered** list for logged-in user + tenant |
| TopBar | `shared/.../TopBar.jsx` | Imports **one** `NotificationBell` for **all** modules |

**Wiring (step by step):**

1. Move **`NotificationBell.jsx`** to `shared/components/layout/`; fix imports to shared UI.  
2. Create **`platform/notifications/notificationService.js`** — single endpoint (or mock keyed off `session.user.id` during merge).  
3. Create **`platform/notifications/useNotifications.js`** — reads `useSession()`, fetches when authenticated, returns `{ items, unreadCount }`.  
4. `NotificationBell.jsx` uses **`useNotifications()`** only — not `modules/inventory/.../notificationService.js`.  
5. **`TopBar`** unchanged structurally; every ERP screen gets the same bell.

**What happens to old inventory `notificationService.js`:**

- **Merge / mock phase:** Logic can live temporarily inside `platform/notifications/mockNotifications.js` **or** platform service calls same rules until real `GET /notifications` exists.  
- **Target:** Backend aggregates inventory/procurement/HR events **server-side**; frontend **never** loops modules for the bell.

**Copy/paste checklist:**

| Action | From | To |
|--------|------|-----|
| Move UI | `inventory-module/.../NotificationBell.jsx` | `shared/components/layout/NotificationBell.jsx` |
| New shell feed | — | `platform/notifications/notificationService.js` + `useNotifications.js` |
| Retire bell import from inventory hook | `modules/inventory/hooks/useNotifications.js` | Remove from TopBar path; optional keep for inventory-only dev until cutover |
| Procurement / HR | — | **No** notification JSX to copy; they appear in bell when **API** includes them for that user |

**Mental model (same as entire ERP):** **Login → session → platform services feed the shell.** Sidebar = `navigation[]`. Bell = **`/notifications` for this user**. Modules = business pages only.

---

### 5.16 Folder connection summary (short)

**Five modules** = five trees under `modules/` (business only). **`platform/`** = session + shell feeds (notifications). **`app/`** = router + sidebar builder. **`shared/`** = UI + apiClient. **One session at login** drives sidebar, default route, forbidden, bell, and button visibility — **all modules**, one rule.

---

## 6 — Runtime flow (summary)

See **§5.12** for the full login → `buildSidebarNav` → `Sidebar` chain.

```
main.jsx → app/App.jsx
  SessionProvider
  ├─ logged out → LoginPage → authService → apiClient → session
  └─ logged in
        buildSidebarNav(session) → sections
        useNotifications(session) → bell list (platform API)
        AppShell → Sidebar + TopBar(bell) + AppRouter(defaultRoute)
        page → module *Service.js → shared apiClient → API (403 if not allowed)
```

Unauthorized route → `ForbiddenPage`. Unauthorized API → 403.

---

## 7 — Summary

| Topic | Decision |
|-------|----------|
| **RBAC + tenant** | **Core** — role at login defines entire ERP access |
| Merge strategy | **One module at a time**; test each step on `integrate/elva-app` |
| Branches | Feature branch per step → merge to **`integrate/elva-app`** in order |
| Single app | `elva-app` + five `modules/*` |
| Login | User key + role → `tenant`, `navigation[]`, `permissions[]`, `defaultRoute` |
| Session scope | **Whole ERP** — sidebar, routes, actions, bell, tenant in header |
| Sidebar | Built at login from `session.navigation[]` |
| Notifications | **platform/notifications** — one user-scoped API; **not** per-module merge in UI |
| Top bar | No module dropdown |
| Shared UI | Once in `shared/` |
| apiClient | Shared HTTP; domain `*Service.js` in `modules/*/features/` |
| Section 5 | §5.0 tree; §5.12 login; §2.1 shell table; §5.15 bell |

---

## 8 — Checklist

- [ ] Merge one module at a time; tests green before next module
- [ ] RBAC helpers (`access.js`, `buildSidebarNav`, route guard) wired before modules rely on them
- [ ] One `npm run dev`
- [ ] Login returns **role-based** `navigation[]` + `permissions[]` (mock or API)
- [ ] Sidebar after login = filtered full menu (mock or API)
- [ ] Bell uses `platform/notifications` (not per-module aggregator)
- [ ] `defaultRoute` opens without user “finding” access
- [ ] Forbidden on disallowed hash; buttons use `hasPermission`
- [ ] All five modules under `modules/`
- [ ] No duplicate AppShell/DataTable in modules

---

*End of guide.*