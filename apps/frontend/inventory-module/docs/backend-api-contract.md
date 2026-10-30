# ELVA ERP — Inventory Module Backend API Contract

> **Target Version**: v1.0.0  
> **Base Path**: `/api/v1/inventory`  
> **Protocol**: HTTPS / REST / JSON  
> **Authentication**: Cookie / Bearer JWT session token issued by ELVA IAM Platform

---

## 1. Global Conventions & Standards

### 1.1 Headers
| Header | Type | Description |
|---|---|---|
| `Accept` | `string` | Must be `application/json` |
| `Content-Type` | `string` | Must be `application/json` for mutations with payload |
| `Idempotency-Key` | `string (UUID)` | Required for non-safe mutations (`POST`, `PUT`, `PATCH`) to prevent duplicate transactions |
| `Authorization` | `string` | `Bearer <token>` (if cookie-based session is not used) |

### 1.2 Standard Error Response Schema
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable description of error.",
    "fieldErrors": {
      "quantity": ["Quantity must be greater than 0"]
    },
    "requestId": "req-9884-2609-a1b2"
  }
}
```

### 1.3 Concurrency & Transaction Integrity Rules
1. **Row-Level Locking**: Mutating operations on item stock (`/inward`, `/outward`, `/transfers`) must acquire pessimistic write locks (`SELECT ... FOR UPDATE` in PostgreSQL/MySQL) on target items and warehouse balance rows.
2. **Negative Stock Prevention**: The database layer must enforce `CHECK (quantity >= 0)` on `warehouse_balances`. If a request would cause negative stock, the transaction must roll back and return HTTP 400 (`INSUFFICIENT_STOCK`).
3. **Double Ledger Prevention**: Every stock balance mutation must atomically insert a corresponding row into `stock_ledger` within the exact same database transaction.

---

## 2. API Endpoints Specification

### 2.1 Dashboard & Analytics
#### `GET /dashboard`
- **Status**: `CONFIRMED` (Matches Figma `inventory-dashboard.png`)
- **Query Parameters**:
  - `warehouseId` (optional, string): Filter summary to specific warehouse
- **Success Response (200 OK)**:
```json
{
  "totalValuation": 124500000,
  "activeItemsCount": 8,
  "activeWarehousesCount": 5,
  "lowStockAlertsCount": 4,
  "recentInwardToday": 420000,
  "recentOutwardToday": 310000,
  "warehouseOccupancy": [
    {
      "id": "wh-1",
      "name": "Pune Main Warehouse",
      "utilizationPercent": 86,
      "itemsCount": 1842
    }
  ],
  "recentActivities": [
    {
      "id": "act-1",
      "type": "Inward",
      "title": "Copper Armoured Cable received (500 Mtr)",
      "time": "10 mins ago",
      "user": "Suresh Patil"
    }
  ]
}
```

---

### 2.2 Item Master
#### `GET /items`
- **Status**: `CONFIRMED` (Matches Figma `item-master.png`)
- **Query Parameters**:
  - `category` (optional, string): "Cables", "Switchgear", "Pipes", etc.
  - `warehouseId` (optional, string)
  - `status` (optional, string): "In Stock", "Low Stock", "Out of Stock"
  - `search` (optional, string): Filter by code, name, or HSN
  - `page` (optional, integer): Default 1
  - `limit` (optional, integer): Default 20
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "item-1",
      "itemCode": "CBL-1.5-3C",
      "itemName": "1.5 Sqmm 3 Core Copper Armoured Cable",
      "category": "Cables",
      "unit": "Mtr",
      "hsnCode": "85444990",
      "currentStock": 1850,
      "reorderLevel": 500,
      "description": "Standard industrial grade cable",
      "taxRate": 18,
      "status": "In Stock",
      "createdAt": "2026-06-15T09:30:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

#### `POST /items`
- **Status**: `CONFIRMED` (Matches modal `Add Item modal.png`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "itemCode": "CBL-2.5-4C",
  "itemName": "2.5 Sqmm 4 Core Copper Cable",
  "category": "Cables",
  "unit": "Mtr",
  "hsnCode": "85444990",
  "reorderLevel": 300,
  "taxRate": 18,
  "description": "Armoured heavy industrial cable"
}
```
- **Success Response (201 Created)**: Returns created item object.
- **Errors**:
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: `ITEM_CODE_ALREADY_EXISTS`.

---

### 2.3 Warehouses
#### `GET /warehouses`
- **Status**: `CONFIRMED` (Matches Figma `warehouse-dashboard.png`)
- **Success Response (200 OK)**: Array of warehouse locations with zone counts, occupancy %, and stock valuation.

#### `GET /warehouses/:id`
- **Status**: `CONFIRMED` (Matches Figma `warehouse-detail.png`)
- **Success Response (200 OK)**: Returns detailed warehouse metadata and zone breakdown.

#### `POST /warehouses`
- **Status**: `CONFIRMED` (Matches modal `Add Warehouse modal.png`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "code": "NAG-SITE-01",
  "name": "Nagpur Metro Site Warehouse",
  "streetAddress": "MIDC Butibori, Plot 14",
  "city": "Nagpur",
  "state": "Maharashtra",
  "pinCode": "441108",
  "type": "Site",
  "totalAreaSqFt": 24000,
  "zonesCount": 6,
  "contactPerson": "Ramesh Deshmukh",
  "contactPhone": "+91 98224 88771"
}
```

---

### 2.4 Goods Inward (GRN)
#### `GET /inward`
- **Status**: `CONFIRMED` (Matches Figma `inward.png`)
- **Query Parameters**: `warehouseId`, `status`, `page`, `limit`
- **Success Response (200 OK)**: Array of Goods Receipt Notes with line items.

#### `POST /inward`
- **Status**: `CONFIRMED` (Matches modal `Add New Inward modal.png`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "supplier": "Finolex Cables Ltd",
  "warehouseId": "wh-1",
  "date": "11 Sep 2026",
  "purchaseOrderRef": "PO-2608-441",
  "remarks": "Received in good condition",
  "status": "Received",
  "lineItems": [
    {
      "itemId": "item-1",
      "quantity": 500,
      "rate": 248
    }
  ]
}
```
- **Stock Posting Action**:
  - Increments item quantity in `warehouse_balances`.
  - Increments item `currentStock`.
  - Generates immutable `stock_ledger` entry with `quantityIn: 500`.

---

### 2.5 Goods Outward (Issue / Dispatch)
#### `GET /outward`
- **Status**: `CONFIRMED` (Matches Figma `outward.png`)
- **Query Parameters**: `warehouseId`, `status`, `purpose`, `page`, `limit`

#### `POST /outward`
- **Status**: `CONFIRMED` (Matches modal `Add New Outward modal.png`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "destination": "Baner Site Tower C",
  "warehouseId": "wh-1",
  "date": "11 Sep 2026",
  "purpose": "Project Issue",
  "remarks": "Urgent electrification dispatch",
  "status": "Dispatched",
  "lineItems": [
    {
      "itemId": "item-1",
      "quantity": 180,
      "rate": 248
    }
  ]
}
```
- **Stock Posting Action**:
  - Verifies available stock >= 180.
  - If insufficient: Rejects with HTTP 400 (`INSUFFICIENT_STOCK`).
  - If sufficient: Decrements stock and records `stock_ledger` with `quantityOut: 180`.

---

### 2.6 Stock Ledger
#### `GET /ledger`
- **Status**: `CONFIRMED` (Matches Figma `stock-ledger.png`)
- **Query Parameters**:
  - `itemId` (optional, string)
  - `warehouseId` (optional, string)
  - `startDate`, `endDate` (optional, ISO date)
  - `type` (optional): "Inward", "Outward", "Transfer", "Adjustment"
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "led-1",
      "date": "11 Sep 2026",
      "voucherNo": "GRN-2609-0184",
      "type": "Inward",
      "itemId": "item-1",
      "itemCode": "CBL-1.5-3C",
      "itemName": "1.5 Sqmm 3 Core Copper Armoured Cable",
      "unit": "Mtr",
      "warehouseName": "Pune Main WH",
      "quantityIn": 500,
      "quantityOut": 0,
      "balance": 1850,
      "reference": "PO-2608-441 • Finolex Cables"
    }
  ],
  "summary": {
    "openingBalance": 1350,
    "totalIn": 500,
    "totalOut": 0,
    "closingBalance": 1850
  }
}
```

---

### 2.7 Inter-Warehouse Stock Transfers
#### `GET /transfers`
- **Status**: `CONFIRMED` (Matches Figma `stock-transfer.png`)

#### `POST /transfers`
- **Status**: `CONFIRMED` (Matches modal `Create Transfer Modal`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "fromWarehouseId": "wh-1",
  "toWarehouseId": "wh-3",
  "date": "11 Sep 2026",
  "reason": "Site stock replenishment",
  "lineItems": [
    {
      "itemId": "item-1",
      "quantity": 150
    }
  ]
}
```
- **Stock Posting Action**:
  - Verifies `fromWarehouseId !== toWarehouseId`.
  - Verifies source warehouse has >= 150 available units.
  - Decrements `wh-1` and increments `wh-3` (or moves to in-transit virtual account).
  - Overall company stock remains conserved.

---

### 2.8 Stock Aging
#### `GET /aging`
- **Status**: `CONFIRMED` (Matches Figma `stock-aging.png`)
- **Query Parameters**: `warehouseId`
- **Success Response (200 OK)**:
```json
{
  "buckets": [
    { "bucket": "0-30 days", "value": 84200000, "percentage": 68, "count": 1840 },
    { "bucket": "31-60 days", "value": 19600000, "percentage": 16, "count": 420 },
    { "bucket": "61-90 days", "value": 11200000, "percentage": 9, "count": 260 },
    { "bucket": "90+ days", "value": 8540000, "percentage": 7, "count": 190 }
  ],
  "totalValue": 123540000,
  "itemDetails": [
    {
      "itemCode": "CBL-1.5-3C",
      "itemName": "Copper Armoured Cable",
      "warehouseName": "Pune Main WH",
      "quantity": 1850,
      "unit": "Mtr",
      "ageDays": 18,
      "value": 459000,
      "lastMovementDate": "24 Aug 2026"
    }
  ]
}
```

---

### 2.9 Physical Stock Reconciliation
#### `GET /reconciliations`
- **Status**: `CONFIRMED` (Matches Figma `stock-reconciliation.png`)

#### `POST /reconciliations`
- **Status**: `CONFIRMED` (Matches modal `Start Reconciliation modal.png`)
- **Headers**: `Idempotency-Key`
- **Request Body**:
```json
{
  "warehouseId": "wh-1",
  "reconciliationDate": "11 Sep 2026",
  "scope": "Selected Items",
  "selectedItemIds": ["item-1", "item-2"],
  "assignedTo": "Team Alpha (Store Keepers)",
  "remarks": "Monthly cycle count"
}
```

---

### 2.10 Delivery Notes & Dispatch
#### `GET /delivery-notes`
- **Status**: `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` (Cross-module ownership: Fulfill sales orders)
- **Description**: Delivery Notes record warehouse picking and dispatch verification. Stock is reduced upon marked as Dispatched.

#### `POST /delivery-notes`
- **Status**: `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED`
- **Request Body**:
```json
{
  "salesInvoiceRef": "INV-2609-0098",
  "customer": "Apex Infra Projects",
  "warehouseId": "wh-1",
  "deliveryDate": "11 Sep 2026",
  "vehicleNo": "MH 12 CR 1199",
  "transporterName": "Apex Express Logistics",
  "contactPhone": "+91 98220 55443"
}
```

---

### 2.11 Sales Invoices Reference
#### `GET /invoices`
- **Status**: `PROPOSED — BACKEND/PRODUCT CONFIRMATION REQUIRED` (Finance module domain boundary)
- **Description**: Read-only reference register. Actual general ledger posting, GST returns, and payment reconciliation are strictly owned by the Finance Module to avoid duplicate stock reduction or tax double-entry.

