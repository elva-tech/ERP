# ELVA ERP — Inventory Module Implementation Decisions

> Architectural boundaries, confirmed requirements, and proposed domain integration contracts.

---

## 1. Requirements Classification

Every screen, workflow, and data property in the Inventory module has been classified under strict requirement discipline:

### 1.1 Confirmed Requirements
1. **Inventory Dashboard**: 4 KPI metric cards (Total SKUs, Low Stock Items, Inward Today, Outward Today), warehouse occupancy bar list, and live activity feeds matching Figma `inventory-dashboard.png`.
2. **Item Master**: Multi-category electrical item table (Cables, Switchgear, Conduit, Earthing, Meters), filter controls, stock badges, and `AddItemModal` matching Figma `item-master.png` & `Add Item modal.png`.
3. **Warehouse Dashboard & Detail**: Multi-location cards (Pune Main WH, Mumbai Yard WH, Nagpur Site WH, Nashik Depot, Aurangabad Project Store) with capacity metrics and zone breakdown matching Figma `warehouse-dashboard.png` & `warehouse-detail.png`.
4. **Goods Inward (GRN)**: Receipt entry against suppliers/POs, atomic balance incrementation, and stock ledger tracking matching Figma `inward.png`.
5. **Goods Outward (Issue)**: Issue dispatch for projects and sites, negative stock rejection, and delivery notes matching Figma `outward.png`.
6. **Stock Ledger**: Running balance computation, transaction type badges, CSV export, and print view matching Figma `stock-ledger.png`.
7. **Stock Transfer**: Multi-warehouse balance movements with in-transit lifecycle tracking matching Figma `stock-transfer.png`.
8. **Stock Aging Analysis**: 4 holding period buckets (0-30d, 31-60d, 61-90d, 90+d), distribution bar, and holding valuation matching Figma `stock-aging.png`.
9. **Physical Stock Reconciliation**: Audit cycle counting, variance percentage calculation, and automated stock adjustment posting matching Figma `stock-reconciliation.png`.

---

### 1.2 Proposed Requirements (Backend/Product Confirmation Required)

| Item / Workflow | Proposed Decision | Current Implementation | Action Required by Backend/Product |
|---|---|---|---|
| **Delivery Notes Ownership** | `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` | Implemented in Inventory as physical dispatch fulfillment and warehouse picking list tracking. | Confirm whether Delivery Notes are initiated by Sales Order fulfillment or directly by warehouse storekeepers. |
| **Sales Invoices Boundary** | `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` | Implemented as a read-only dispatch reference view with an explicit warning banner that financial posting resides in the Finance module. | Confirm that stock deduction is strictly bound to Delivery Notes, not Sales Invoices, to prevent double deduction. |
| **Procurement PO Linking** | `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` | Inward form accepts optional `purchaseOrderRef` (e.g. `PO-2608-441`) and pre-populates supplier lines. | Confirm REST endpoint in Procurement module for fetching open PO line items. |
| **Tenant Customization** | `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` | Tenant name defaults to `SB PATIL GROUP` but is loaded dynamically via `apiConfig` and environment variables. | Provide multi-tenant organization context headers from the parent ERP shell. |

---

## 2. Module Boundary Safeguards

### 2.1 Boundary with Procurement Module (`apps/frontend/procurement-module`)
- **Strict Isolation**: No files in `apps/frontend/procurement-module` were modified or refactored.
- **Reference Contracts**: Inward transactions link to Procurement POs via reference strings (`PO-2608-441`). When the backend service is deployed, an async event `procurement.po.received` will update the procurement PO status without cross-module tight coupling.

### 2.2 Boundary with Finance Module (`apps/frontend/finance-module`)
- **Double-Deduction Prevention**: In ERP systems, if both the Delivery Note and the Sales Invoice trigger inventory deduction, stock is decremented twice.
- **Our Guardrail**: The Inventory module defines **Delivery Notes as the single source of physical stock deduction**. Sales Invoices within this module are presented with informational badges and explicit navigation anchors to the Finance Module (`finance.elva.internal`).

