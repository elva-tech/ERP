# ELVA ERP — Inventory Management Module

> Production-grade Frontend, API Integration Contracts, and Mock Testing Infrastructure for **ELVA ERP**.

---

## 1. Overview

The **Inventory Module** provides multi-location enterprise stock management, real-time inventory ledger tracking, inward receipt verification (GRN), outbound issue dispatch (DN), inter-warehouse transfer tracking, physical stock audit reconciliations, and stock aging analytics.

### Key Capabilities
- **Real-Time Multi-Warehouse Management**: 5 enterprise storage locations (Pune Main WH, Mumbai Yard WH, Nagpur Site WH, Nashik Depot, Aurangabad Project Store) with capacity utilization, zone counts, and real-time valuation.
- **Stock Ledger & Audit Trail**: Running balance calculation with immutable audit logging for Inward, Outward, Transfer, and Physical Adjustment vouchers.
- **Negative Stock Prevention**: Built-in validation rejecting any dispatch that exceeds current warehouse stock.
- **Atomic Inter-Warehouse Transfers**: Real-time conservation of total enterprise inventory with in-transit lifecycle tracking.
- **Physical Reconciliation & Variance Audits**: Cycle count verification with variance percentages and automated ledger adjustment entries.
- **Strict Domain Boundary Safeguards**: Delivery Notes record physical warehouse dispatch, while Sales Invoices serve as read-only cross-module references to prevent duplicate stock deduction or premature financial posting.

---

## 2. Directory Structure

```text
apps/frontend/inventory-module/
├── docs/                               # Architecture and API documentation
│   ├── frontend.md                     # File map: pages, services, schemas, mock, tests, links
│   ├── backend-api-contract.md         # Complete REST contracts (Confirmed vs Proposed)
│   ├── data-model.md                   # Data schemas, UOM, and relationships
│   ├── mock-vs-production.md           # Mock simulation vs Production requirements
│   ├── implementation-decisions.md     # Module boundaries and architectural decisions
│   └── color-code.md                   # Visual design system tokens
├── figma-screenshots/                  # Reference screenshots from UI design
├── src/
│   ├── components/
│   │   ├── layout/                     # AppShell, Sidebar, TopBar
│   │   └── ui/                         # Badge, Modal, Toast, MockModeBadge
│   ├── config/                         # Navigation groups and route mappings
│   ├── features/                       # Domain feature services & modals
│   │   ├── aging/
│   │   ├── dashboard/
│   │   ├── delivery-notes/
│   │   ├── invoices/
│   │   ├── inward/
│   │   ├── items/
│   │   ├── ledger/
│   │   ├── outward/
│   │   ├── reconciliation/
│   │   ├── transfers/
│   │   └── warehouses/
│   ├── hooks/                          # Hash routing and state hooks
│   ├── lib/
│   │   ├── apiClient.js                # Centralized HTTP transport & error handling
│   │   └── apiConfig.js                # Environment modes & base URL settings
│   ├── mock-api/
│   │   ├── mockDatabase.js             # Seeded mock data matching Figma
│   │   └── mockApiAdapter.js           # Deterministic transport simulation
│   ├── pages/                          # 12+ required inventory screens
│   ├── schemas/                        # Zod runtime schemas & TypeScript definitions
│   ├── App.jsx                         # Main application layout router
│   ├── index.css                       # Tailwind v4 theme design tokens
│   └── main.jsx                        # Application root entry
├── tests/
│   ├── apiClient.test.js               # Transport, mode separation, and error tests
│   ├── inventorySchemas.test.js        # Zod validation schema tests
│   ├── stockIntegrity.test.js          # Negative stock prevention and atomic balance tests
│   ├── workflows.test.jsx              # UI rendering and workflow component tests
│   └── setup.js                        # Testing library and Vitest configuration
├── .env                                # Local environment variables
├── .env.example                        # Template for environment configuration
├── package.json                        # Scripts and dependencies
└── vite.config.js                      # Vite and Tailwind configuration
```

---

## 3. Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
From the root directory or inside the module:
```bash
cd apps/frontend/inventory-module
npm install
```

### Running the Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 4. API Mode Configuration

The application features a strict separation between **Mock Mode** (isolated prototype/testing environment) and **Real Production API Mode**.

Configured via the `.env` file:

```env
# Mode options: 'mock' or 'real'
VITE_API_MODE=mock

# Real backend base URL (used when VITE_API_MODE=real)
VITE_API_BASE_URL=https://api.erp.sbpatil.com/api/v1/inventory

# Multi-tenant configuration
VITE_TENANT_ID=tenant-sb-patil
VITE_TENANT_NAME="SB PATIL GROUP"
VITE_TENANT_SUBTITLE="INVENTORY MANAGEMENT"
```

### Crucial Production Safeguard
When `VITE_API_MODE=real`:
- All requests target the configured real API base URL with standard HTTP headers (`Accept`, `Content-Type`, `Idempotency-Key`, `credentials: include`).
- Failed network requests, 404s, or 500s are **never silently replaced with mock data**. Errors are surfaced via `ApiError` to the UI with user-friendly error banners.

---

## 5. Running Automated Tests

A comprehensive test suite of 27 unit, integration, schema validation, and workflow tests is included:

```bash
# Run tests with Vitest
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Suite Coverage:
1. `tests/inventorySchemas.test.js`: Validates all Zod runtime schemas (positive quantities, required attributes, negative reorder rejection).
2. `tests/stockIntegrity.test.js`: Verifies negative stock prevention, atomic stock balance deduction, inward balance increment, and transfer balance conservation.
3. `tests/apiClient.test.js`: Verifies real vs mock mode separation, AbortSignal cancellation, idempotency generation, and 401/403/404/500 error classification.
4. `tests/workflows.test.jsx`: Tests full UI mounting and rendering of Dashboard, Item Master, Warehouse Dashboard, and Stock Ledger.

---

## 6. Building for Production

To create an optimized production build:

```bash
npm run build
```

Bundle assets are emitted to `apps/frontend/inventory-module/dist/`.

