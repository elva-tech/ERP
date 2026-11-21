import { describe, it, expect, beforeEach } from "vitest";
import { mockApiAdapter } from "../src/mock-api/mockApiAdapter.js";
import { resetMockDatabase, getMockDatabase } from "../src/mock-api/mockDatabase.js";
import { ApiError } from "../src/lib/apiClient.js";

describe("Inventory Stock Integrity & Business Rules", () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  describe("Inward Operations", () => {
    it("should atomically increase item stock when inward is received", async () => {
      const dbBefore = getMockDatabase();
      const targetItem = dbBefore.items.find((i) => i.id === "item-1");
      const initialStock = targetItem.currentStock;

      const inwardPayload = {
        supplier: "Finolex Cables Ltd",
        warehouseId: "wh-1",
        date: "12 Sep 2026",
        remarks: "New stock arrival",
        lineItems: [
          {
            itemId: "item-1",
            quantity: 300,
            rate: 245,
          },
        ],
      };

      const response = await mockApiAdapter.createInward(inwardPayload);
      expect(response.grnNo).toMatch(/^GRN-/);
      expect(response.status).toBe("Received");

      // Verify stock in mock database
      const dbAfter = getMockDatabase();
      const updatedItem = dbAfter.items.find((i) => i.id === "item-1");
      expect(updatedItem.currentStock).toBe(initialStock + 300);

      // Verify stock ledger entry was generated
      const ledgerEntry = dbAfter.ledgerEntries.find((l) => l.voucherNo === response.grnNo);
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.quantityIn).toBe(300);
      expect(ledgerEntry.balance).toBe(initialStock + 300);
    });
  });

  describe("Outward & Negative Stock Prevention", () => {
    it("should allow outward dispatch if available stock is sufficient", async () => {
      const dbBefore = getMockDatabase();
      const targetItem = dbBefore.items.find((i) => i.id === "item-1");
      const initialStock = targetItem.currentStock;

      const dispatchQty = 100;
      expect(initialStock).toBeGreaterThan(dispatchQty);

      const outwardPayload = {
        destination: "Baner Site Tower C",
        warehouseId: "wh-1",
        date: "12 Sep 2026",
        purpose: "Project Issue",
        remarks: "Cabling for high-rise",
        lineItems: [
          {
            itemId: "item-1",
            quantity: dispatchQty,
            rate: 248,
          },
        ],
      };

      const response = await mockApiAdapter.createOutward(outwardPayload);
      expect(response.deliveryNoteNo).toMatch(/^DN-/);
      expect(response.status).toBe("Dispatched");

      const dbAfter = getMockDatabase();
      const updatedItem = dbAfter.items.find((i) => i.id === "item-1");
      expect(updatedItem.currentStock).toBe(initialStock - dispatchQty);
    });

    it("should strictly reject outward dispatch when requested quantity exceeds available stock", async () => {
      const dbBefore = getMockDatabase();
      const targetItem = dbBefore.items.find((i) => i.id === "item-1");
      const initialStock = targetItem.currentStock;

      // Request way more than available
      const excessiveQty = initialStock + 10000;

      const outwardPayload = {
        destination: "Excessive Site Request",
        warehouseId: "wh-1",
        date: "12 Sep 2026",
        purpose: "Project Issue",
        lineItems: [
          {
            itemId: "item-1",
            quantity: excessiveQty,
            rate: 248,
          },
        ],
      };

      await expect(mockApiAdapter.createOutward(outwardPayload)).rejects.toThrow(ApiError);

      // Verify stock was NOT deducted (no negative stock allowed)
      const dbAfter = getMockDatabase();
      const itemUnchanged = dbAfter.items.find((i) => i.id === "item-1");
      expect(itemUnchanged.currentStock).toBe(initialStock);
    });
  });

  describe("Inter-Warehouse Stock Transfers", () => {
    it("should preserve total company stock balance across warehouses during transfer", async () => {
      const dbBefore = getMockDatabase();
      const targetItem = dbBefore.items.find((i) => i.id === "item-1");
      const totalInitialStock = targetItem.currentStock;

      const transferQty = 75;

      const transferPayload = {
        fromWarehouseId: "wh-1",
        toWarehouseId: "wh-2",
        date: "12 Sep 2026",
        reason: "Stock rebalance to yard",
        lineItems: [
          {
            itemId: "item-1",
            quantity: transferQty,
          },
        ],
      };

      const response = await mockApiAdapter.createTransfer(transferPayload);
      expect(response.transferNo).toMatch(/^ST-/);
      expect(response.status).toBe("In Transit");

      // In a transfer, overall company stock remains conserved
      const dbAfter = getMockDatabase();
      const updatedItem = dbAfter.items.find((i) => i.id === "item-1");
      expect(updatedItem.currentStock).toBe(totalInitialStock);
    });
  });

  describe("Stock Reconciliation and Physical Audits", () => {
    it("should correctly identify discrepancies when physical count differs from system quantity", async () => {
      const recRes = await mockApiAdapter.listReconciliations();
      const records = recRes.data;
      expect(records.length).toBeGreaterThan(0);

      const matchedRecords = records.filter((r) => r.status === "Matched");
      matchedRecords.forEach((r) => {
        expect(r.variance).toBe(0);
        expect(r.systemQty).toBe(r.physicalQty);
      });

      const discrepancyRecords = records.filter((r) => r.status === "Discrepancy");
      discrepancyRecords.forEach((r) => {
        expect(r.variance).not.toBe(0);
        expect(r.systemQty - r.physicalQty).not.toBe(0);
      });
    });
  });
});
