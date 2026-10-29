import { z } from "zod";

/**
 * Standard Enums for Inventory Domain
 */
export const ItemCategoryEnum = z.enum([
  "Cables & Wires",
  "Switchgear",
  "Distribution Panels",
  "Transformers",
  "Conduits",
  "Earthing",
  "Meters",
  "Accessories",
  "Other",
]);

export const UnitOfMeasureEnum = z.enum([
  "Mtr",
  "Nos",
  "Pcs",
  "Kg",
  "Ltr",
  "Set",
  "Box",
]);

export const ItemStockStatusEnum = z.enum([
  "In Stock",
  "Low Stock",
  "Reorder",
  "Out of Stock",
]);

export const WarehouseTypeEnum = z.enum([
  "Main",
  "Yard",
  "Transit",
  "Project Site",
]);

export const WarehouseStatusEnum = z.enum(["Active", "Inactive", "Maintenance"]);

export const InwardStatusEnum = z.enum(["Draft", "Received", "Quality Check"]);

export const OutwardStatusEnum = z.enum(["Draft", "Dispatched", "Delivered"]);

export const TransferStatusEnum = z.enum([
  "Draft",
  "In Transit",
  "Received",
  "Cancelled",
]);

export const ReconciliationStatusEnum = z.enum([
  "Matched",
  "Discrepancy",
  "Pending",
]);

export const DeliveryNoteStatusEnum = z.enum([
  "Pending",
  "Dispatched",
  "Delivered",
]);

export const SalesInvoiceStatusEnum = z.enum([
  "Draft",
  "Sent",
  "Paid",
  "Overdue",
]);

/**
 * 1. Inventory Item Schemas
 */
export const InventoryItemSchema = z.object({
  id: z.string(),
  itemCode: z.string().min(2, "Item code must be at least 2 characters").regex(/^[A-Za-z0-9._-]+$/, "Invalid item code format"),
  itemName: z.string().min(2, "Item name must be at least 2 characters"),
  category: z.string(),
  unit: z.string(),
  hsnCode: z.string().regex(/^\d{4,8}$/, "HSN code must be 4 to 8 digits"),
  reorderLevel: z.number().nonnegative("Reorder level cannot be negative"),
  currentStock: z.number().default(0),
  description: z.string().optional().default(""),
  taxRate: z.number().min(0).max(100).default(18),
  status: ItemStockStatusEnum.default("In Stock"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const CreateItemInputSchema = InventoryItemSchema.omit({
  id: true,
  currentStock: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  initialStock: z.number().nonnegative().optional().default(0),
  warehouseId: z.string().optional(),
});

/**
 * 2. Warehouse Schemas
 */
export const WarehouseSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Warehouse name must be at least 2 characters"),
  code: z.string().min(2, "Warehouse code must be at least 2 characters"),
  streetAddress: z.string().min(3, "Street address required"),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  pinCode: z.string().regex(/^\d{6}$/, "PIN code must be exactly 6 digits"),
  type: WarehouseTypeEnum.default("Main"),
  totalAreaSqFt: z.number().positive("Total area must be greater than zero"),
  contactPerson: z.string().min(2, "Contact person required"),
  contactPhone: z.string().min(10, "Valid 10-digit phone number required"),
  status: WarehouseStatusEnum.default("Active"),
  zonesCount: z.number().int().default(1),
  capacityUtilization: z.number().min(0).max(100).default(0),
  totalItems: z.number().int().default(0),
  stockValue: z.number().default(0),
});

export const CreateWarehouseInputSchema = WarehouseSchema.omit({
  id: true,
  capacityUtilization: true,
  totalItems: true,
  stockValue: true,
  zonesCount: true,
}).extend({
  zonesCount: z.number().int().positive().optional().default(4),
});

/**
 * 3. Inward Schemas
 */
export const InwardLineItemSchema = z.object({
  itemId: z.string().min(1, "Item selection is required"),
  itemCode: z.string(),
  itemName: z.string(),
  unit: z.string().default("Nos"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  rate: z.number().nonnegative("Rate cannot be negative"),
  amount: z.number().nonnegative(),
});

export const InwardTransactionSchema = z.object({
  id: z.string(),
  grnNo: z.string(),
  supplier: z.string().min(2, "Supplier name is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  warehouseName: z.string(),
  date: z.string(),
  status: InwardStatusEnum.default("Received"),
  lineItems: z.array(InwardLineItemSchema).min(1, "At least one line item is required"),
  totalItems: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  remarks: z.string().optional().default(""),
  createdAt: z.string().optional(),
});

export const CreateInwardInputSchema = z.object({
  supplier: z.string().min(2, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.string().min(1, "Date is required"),
  remarks: z.string().optional().default(""),
  status: InwardStatusEnum.default("Received"),
  lineItems: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    quantity: z.number().positive("Quantity must be > 0"),
    rate: z.number().nonnegative().default(0),
  })).min(1, "Please add at least one line item"),
});

/**
 * 4. Outward Schemas
 */
export const OutwardLineItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  itemCode: z.string(),
  itemName: z.string(),
  unit: z.string().default("Nos"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  rate: z.number().nonnegative().default(0),
  amount: z.number().nonnegative().default(0),
  remarks: z.string().optional().default(""),
});

export const OutwardTransactionSchema = z.object({
  id: z.string(),
  deliveryNoteNo: z.string(),
  purpose: z.string().default("Sales"),
  destination: z.string().min(2, "Customer or department destination required"),
  warehouseId: z.string().min(1, "Source warehouse is required"),
  warehouseName: z.string(),
  date: z.string(),
  status: OutwardStatusEnum.default("Dispatched"),
  lineItems: z.array(OutwardLineItemSchema).min(1, "At least one line item is required"),
  totalItems: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  authorization: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  createdAt: z.string().optional(),
});

export const CreateOutwardInputSchema = z.object({
  purpose: z.string().default("Sales"),
  destination: z.string().min(2, "Destination/Recipient is required"),
  warehouseId: z.string().min(1, "Dispatch warehouse is required"),
  date: z.string().min(1, "Date is required"),
  authorization: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  status: OutwardStatusEnum.default("Dispatched"),
  lineItems: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    quantity: z.number().positive("Quantity must be > 0"),
    rate: z.number().nonnegative().optional().default(0),
    remarks: z.string().optional().default(""),
  })).min(1, "Please add at least one line item"),
});

/**
 * 5. Stock Ledger Schemas
 */
export const StockLedgerEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  voucherNo: z.string(),
  type: z.enum(["Inward", "Outward", "Transfer", "Reconciliation"]),
  itemId: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  unit: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  quantityIn: z.number().nonnegative().default(0),
  quantityOut: z.number().nonnegative().default(0),
  balance: z.number(),
  reference: z.string(),
  createdAt: z.string(),
});

export const LedgerSummarySchema = z.object({
  openingBalance: z.number(),
  totalInward: z.number(),
  totalOutward: z.number(),
  closingBalance: z.number(),
  unit: z.string(),
  asOnDate: z.string(),
  inwardMovementsCount: z.number(),
  outwardMovementsCount: z.number(),
});

/**
 * 6. Stock Transfer Schemas
 */
export const TransferLineItemSchema = z.object({
  itemId: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  unit: z.string(),
  quantity: z.number().positive("Transfer quantity must be > 0"),
});

export const StockTransferSchema = z.object({
  id: z.string(),
  transferNo: z.string(),
  fromWarehouseId: z.string(),
  fromWarehouseName: z.string(),
  toWarehouseId: z.string(),
  toWarehouseName: z.string(),
  date: z.string(),
  itemsCount: z.number().int().positive(),
  status: TransferStatusEnum.default("In Transit"),
  reason: z.string(),
  lineItems: z.array(TransferLineItemSchema),
  createdAt: z.string(),
});

export const CreateTransferInputSchema = z.object({
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  date: z.string().min(1, "Date is required"),
  reason: z.string().min(2, "Reason is required"),
  lineItems: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    quantity: z.number().positive("Quantity must be > 0"),
  })).min(1, "Select at least one item to transfer"),
}).refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
  message: "Source and destination warehouses cannot be the same",
  path: ["toWarehouseId"],
});

/**
 * 7. Stock Reconciliation Schemas
 */
export const ReconciliationLineItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  systemQty: z.number().nonnegative(),
  physicalQty: z.number().nonnegative(),
  variance: z.number(),
  variancePercent: z.number(),
  status: ReconciliationStatusEnum,
});

export const StartReconciliationInputSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  reconciliationDate: z.string().min(1, "Reconciliation date is required"),
  scope: z.enum(["Full Inventory", "Selected Items"]),
  selectedItemIds: z.array(z.string()).optional().default([]),
  remarks: z.string().optional().default(""),
  assignedTo: z.string().min(2, "Assigned team/person is required"),
});

/**
 * 8. Stock Aging Schemas
 */
export const AgingBucketSummarySchema = z.object({
  bucket: z.string(),
  value: z.number(),
  percentage: z.number(),
  color: z.string(),
  count: z.number(),
});

export const ItemAgingDetailSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  itemName: z.string(),
  warehouseName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  ageDays: z.number().int().nonnegative(),
  value: z.number().nonnegative(),
  lastMovementDate: z.string(),
});

/**
 * 9. Delivery Note Schemas
 */
export const DeliveryNoteLineItemSchema = z.object({
  itemId: z.string(),
  itemCode: z.string(),
  description: z.string(),
  pickQty: z.number().positive(),
  unit: z.string().default("Nos"),
  binLocation: z.string().default("General"),
  status: z.enum(["Picked", "Pending"]).default("Pending"),
});

export const DeliveryNoteSchema = z.object({
  id: z.string(),
  dnNo: z.string(),
  date: z.string(),
  customer: z.string().min(2, "Customer name is required"),
  salesInvoiceRef: z.string().min(1, "Sales invoice reference is required"),
  itemsCount: z.number().int().positive(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  status: DeliveryNoteStatusEnum.default("Pending"),
  vehicleNo: z.string().optional().default(""),
  transporterName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  lineItems: z.array(DeliveryNoteLineItemSchema).default([]),
  createdAt: z.string(),
});

export const CreateDeliveryNoteInputSchema = z.object({
  salesInvoiceRef: z.string().min(1, "Sales invoice is required"),
  customer: z.string().min(1, "Customer name is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  vehicleNo: z.string().optional().default(""),
  transporterName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
});

/**
 * 10. Sales Invoice Reference Schemas
 */
export const SalesInvoiceLineItemSchema = z.object({
  itemId: z.string(),
  itemCode: z.string(),
  description: z.string(),
  qty: z.number().positive(),
  rate: z.number().nonnegative(),
  taxPercent: z.number().default(18),
  amount: z.number().nonnegative(),
});

export const SalesInvoiceSchema = z.object({
  id: z.string(),
  invoiceNo: z.string(),
  date: z.string(),
  dueDate: z.string(),
  customer: z.string().min(2, "Customer is required"),
  customerAddress: z.string().optional().default(""),
  customerGstin: z.string().optional().default(""),
  itemsCount: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  status: SalesInvoiceStatusEnum.default("Draft"),
  paymentTerms: z.string().default("Net 15"),
  remarks: z.string().optional().default(""),
  lineItems: z.array(SalesInvoiceLineItemSchema).default([]),
  createdAt: z.string(),
});

export const CreateInvoiceInputSchema = z.object({
  customer: z.string().min(2, "Customer is required"),
  customerGstin: z.string().optional().default(""),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentTerms: z.string().default("Net 15"),
  remarks: z.string().optional().default(""),
  lineItems: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    qty: z.number().positive("Qty must be > 0"),
    rate: z.number().positive("Rate must be > 0"),
    taxPercent: z.number().default(18),
  })).min(1, "At least one line item is required"),
});

/**
 * 11. Dashboard Metrics Schema
 */
export const InventoryDashboardMetricsSchema = z.object({
  totalSkus: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
  inwardTodayAmount: z.string(),
  inwardTodayShipmentsCount: z.number().int().nonnegative(),
  outwardTodayAmount: z.string(),
  outwardTodayIssuesCount: z.number().int().nonnegative(),
  categoryStockDistribution: z.array(z.object({
    category: z.string(),
    percentage: z.number(),
  })),
  monthlyTrends: z.array(z.object({
    month: z.string(),
    inwardValue: z.number(),
    outwardValue: z.number(),
  })),
  lowStockAlerts: z.array(z.object({
    id: z.string(),
    itemCode: z.string(),
    description: z.string(),
    currentStock: z.number(),
    minLevel: z.number(),
    unit: z.string(),
    warehouse: z.string(),
  })),
});

