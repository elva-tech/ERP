import { describe, it, expect, beforeEach } from "vitest";
import { mockApiAdapter } from "../src/mock-api/mockApiAdapter.js";
import { resetMockDatabase, getMockDatabase } from "../src/mock-api/mockDatabase.js";
import { buildWarehouseDocumentAttachment } from "../src/features/warehouses/warehouseDocument.js";

describe("PR #9 inventory enhancements", () => {
  beforeEach(() => {
    resetMockDatabase();
  });

  it("persists warehouse PDF attachment metadata on create", async () => {
    const file = new File(["%PDF-1.4 mock"], "lease-deed.pdf", { type: "application/pdf" });
    const attachment = buildWarehouseDocumentAttachment(file);

    const created = await mockApiAdapter.createWarehouse({
      code: "TST-PDF-01",
      name: "PDF Test Warehouse",
      streetAddress: "Plot 1 MIDC",
      city: "Pune",
      state: "Maharashtra",
      pinCode: "411001",
      type: "Main",
      totalAreaSqFt: 12000,
      contactPerson: "Test Owner",
      contactPhone: "+91 9000000000",
      documentAttachment: attachment,
    });

    expect(created.documentAttachment?.fileName).toBe("lease-deed.pdf");
    const db = getMockDatabase();
    const stored = db.warehouses.find((w) => w.id === created.id);
    expect(stored?.documentAttachment?.mimeType).toBe("application/pdf");
  });

  it("posts only received quantity to stock on inward", async () => {
    const dbBefore = getMockDatabase();
    const initial = dbBefore.items.find((i) => i.id === "item-1").currentStock;

    await mockApiAdapter.createInward({
      supplier: "Supplier QA",
      warehouseId: "wh-1",
      date: "12 Sep 2026",
      lineItems: [
        {
          itemId: "item-1",
          challanQuantity: 120,
          quantity: 100,
          rejectedQuantity: 20,
          rate: 200,
        },
      ],
    });

    const dbAfter = getMockDatabase();
    expect(dbAfter.items.find((i) => i.id === "item-1").currentStock).toBe(initial + 100);
  });

  it("returns warehouse dashboard summary from list endpoint", async () => {
    const res = await mockApiAdapter.listWarehouses();
    expect(res.summary).toBeDefined();
    expect(res.summary.totalWarehouses).toBe(res.data.length);
    expect(typeof res.summary.combinedStockValue).toBe("number");
  });
});