import { describe, expect, it } from "vitest";
import { matchesSearch } from "../src/lib/search.js";
import { mockApiAdapter } from "../src/mock-api/mockApiAdapter.js";

describe("search filtering", () => {
  it("matches case-insensitive partial text and treats blank queries as no filter", () => {
    expect(matchesSearch("  cOpPeR ", "1.5 Sqmm Copper Cable")).toBe(true);
    expect(matchesSearch("", "anything")).toBe(true);
    expect(matchesSearch("missing", "anything")).toBe(false);
  });

  it("searches items while preserving category, status, and pagination filters", async () => {
    const result = await mockApiAdapter.listItems({
      search: " cbl-1.5 ",
      category: "Cables & Wires",
      status: "Low Stock",
      page: 1,
      limit: 1,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].itemCode).toBe("CBL-1.5-3C");
    expect(result.pagination).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  it("searches warehouses by location", async () => {
    const result = await mockApiAdapter.listWarehouses({ search: " nagpur " });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((warehouse) => /nagpur/i.test(`${warehouse.name} ${warehouse.city}`))).toBe(true);
  });

  it("searches inward entries by supplier alongside warehouse filtering", async () => {
    const result = await mockApiAdapter.listInward({ search: "FINOLEX", warehouseId: "wh-1" });

    expect(result.data.map((entry) => entry.grnNo)).toEqual(["GRN-2609-0184"]);
  });

  it("searches outward entries by destination alongside status filtering", async () => {
    const result = await mockApiAdapter.listOutward({ search: "baner", status: "Dispatched" });

    expect(result.data.map((entry) => entry.deliveryNoteNo)).toEqual(["DN-2609-0096"]);
  });

  it("searches ledger references alongside item and warehouse filters", async () => {
    const result = await mockApiAdapter.getLedger({
      search: "hinjawadi",
      itemId: "item-1",
      warehouseId: "wh-1",
    });

    expect(result.data.map((entry) => entry.voucherNo)).toEqual(["DN-2609-0092"]);
  });
});
