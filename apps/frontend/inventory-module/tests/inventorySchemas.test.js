import { describe, it, expect } from "vitest";
import {
  InventoryItemSchema,
  CreateItemInputSchema,
  WarehouseSchema,
  CreateWarehouseInputSchema,
  CreateInwardInputSchema,
  CreateOutwardInputSchema,
  CreateTransferInputSchema,
  StartReconciliationInputSchema,
  CreateDeliveryNoteInputSchema,
  CreateInvoiceInputSchema,
} from "../src/schemas/inventorySchemas.js";

describe("Inventory Zod Runtime Validation Schemas", () => {
  describe("Item Master Schemas", () => {
    it("should validate a valid item object", () => {
      const validItem = {
        id: "item-1",
        itemCode: "CBL-1.5-3C",
        itemName: "1.5 Sqmm 3 Core Copper Armoured Cable",
        category: "Cables",
        unit: "Mtr",
        hsnCode: "85444990",
        currentStock: 1850,
        reorderLevel: 500,
        description: "Standard industrial grade cable",
        taxRate: 18,
        status: "In Stock",
        createdAt: "2026-09-01T10:00:00Z",
      };
      const result = InventoryItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it("should reject item creation if required fields are missing", () => {
      const invalidItem = {
        category: "Cables",
        unit: "Mtr",
      };
      const result = CreateItemInputSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
      const errors = result.error.flatten().fieldErrors;
      expect(errors.itemCode).toBeDefined();
      expect(errors.itemName).toBeDefined();
    });

    it("should reject negative reorder level or invalid tax rate", () => {
      const invalidData = {
        itemCode: "TEST-01",
        itemName: "Test Item",
        category: "General",
        unit: "Nos",
        reorderLevel: -5,
        taxRate: 150,
      };
      const result = CreateItemInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      const errors = result.error.flatten().fieldErrors;
      expect(errors.reorderLevel).toBeDefined();
      expect(errors.taxRate).toBeDefined();
    });
  });

  describe("Warehouse Schemas", () => {
    it("should validate a valid warehouse structure", () => {
      const validWh = {
        id: "wh-1",
        code: "PUN-MAIN-01",
        name: "Pune Main Warehouse",
        streetAddress: "Bhosari MIDC",
        city: "Pune",
        state: "Maharashtra",
        pinCode: "411026",
        type: "Main",
        totalAreaSqFt: 48000,
        zonesCount: 12,
        capacityUtilization: 85,
        totalItems: 1800,
        stockValue: 50000000,
        contactPerson: "Rajesh Kulkarni",
        contactPhone: "+91 98221 44551",
        status: "Active",
      };
      const result = WarehouseSchema.safeParse(validWh);
      expect(result.success).toBe(true);
    });

    it("should reject warehouse creation if code or name is missing", () => {
      const invalidWh = {
        city: "Pune",
        state: "Maharashtra",
      };
      const result = CreateWarehouseInputSchema.safeParse(invalidWh);
      expect(result.success).toBe(false);
      expect(result.error.flatten().fieldErrors.code).toBeDefined();
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });
  });

  describe("Inward and Outward Schemas", () => {
    it("should validate inward entry with positive quantities", () => {
      const validInward = {
        supplier: "Polycab India Ltd",
        warehouseId: "wh-1",
        date: "11 Sep 2026",
        lineItems: [
          { itemId: "item-1", quantity: 500, rate: 248 },
          { itemId: "item-2", quantity: 50, rate: 1800 },
        ],
      };
      const result = CreateInwardInputSchema.safeParse(validInward);
      expect(result.success).toBe(true);
    });

    it("should reject inward entry with negative or zero quantity", () => {
      const invalidInward = {
        supplier: "Polycab India Ltd",
        warehouseId: "wh-1",
        date: "11 Sep 2026",
        lineItems: [{ itemId: "item-1", quantity: -10, rate: 248 }],
      };
      const result = CreateInwardInputSchema.safeParse(invalidInward);
      expect(result.success).toBe(false);
    });

    it("should reject outward entry with empty line items", () => {
      const emptyOutward = {
        destination: "Baner Site",
        warehouseId: "wh-1",
        date: "11 Sep 2026",
        purpose: "Project Issue",
        lineItems: [],
      };
      const result = CreateOutwardInputSchema.safeParse(emptyOutward);
      expect(result.success).toBe(false);
    });
  });

  describe("Stock Transfer Schemas", () => {
    it("should validate transfer when source and destination are different", () => {
      const validTransfer = {
        fromWarehouseId: "wh-1",
        toWarehouseId: "wh-2",
        date: "11 Sep 2026",
        reason: "Stock replenishment",
        lineItems: [{ itemId: "item-1", quantity: 50 }],
      };
      const result = CreateTransferInputSchema.safeParse(validTransfer);
      expect(result.success).toBe(true);
    });

    it("should reject transfer when source and destination are identical", () => {
      const invalidTransfer = {
        fromWarehouseId: "wh-1",
        toWarehouseId: "wh-1",
        date: "11 Sep 2026",
        reason: "Stock replenishment",
        lineItems: [{ itemId: "item-1", quantity: 50 }],
      };
      const result = CreateTransferInputSchema.safeParse(invalidTransfer);
      expect(result.success).toBe(false);
    });
  });

  describe("Delivery Notes and Invoices Schemas", () => {
    it("should validate delivery note creation input", () => {
      const validDN = {
        salesInvoiceRef: "INV-2609-0098",
        customer: "Apex Infra",
        warehouseId: "wh-1",
        deliveryDate: "11 Sep 2026",
      };
      const result = CreateDeliveryNoteInputSchema.safeParse(validDN);
      expect(result.success).toBe(true);
    });

    it("should validate sales invoice creation input", () => {
      const validInv = {
        customer: "Apex Infra Projects",
        invoiceDate: "11 Sep 2026",
        dueDate: "26 Sep 2026",
        paymentTerms: "Net 15",
        lineItems: [{ itemId: "item-1", qty: 100, rate: 250, taxPercent: 18 }],
      };
      const result = CreateInvoiceInputSchema.safeParse(validInv);
      expect(result.success).toBe(true);
    });
  });
});
