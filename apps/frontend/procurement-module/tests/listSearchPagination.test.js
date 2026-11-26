import { describe, expect, it } from "vitest";
import { listSearchMatch, listSearchTerm, paginateItems } from "../dev-demo/api/listSearch.mjs";

describe("demo list search pagination", () => {
  it("matches records beyond the first page of an unfiltered list", () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({
      id: `row-${index}`,
      number: index === 42 ? "PRN/26-27/DEEP" : `PRN/26-27/${String(index).padStart(4, "0")}`,
    }));
    const term = listSearchTerm("deep");
    const filtered = rows.filter((row) => listSearchMatch(term, [row.number]));
    const page = paginateItems(filtered, { page: 1, pageSize: 20 });
    expect(page.pagination.totalItems).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].number).toBe("PRN/26-27/DEEP");
  });

  it("combines status-style filtering with search before paginating", () => {
    const rows = [
      { id: "1", status: "active", code: "SCA-001" },
      { id: "2", status: "active", code: "SCA-DEEP" },
      { id: "3", status: "completed", code: "SCA-DEEP" },
    ];
    const term = listSearchTerm("deep");
    const filtered = rows
      .filter((row) => row.status === "active")
      .filter((row) => listSearchMatch(term, [row.code]));
    const page = paginateItems(filtered, { page: 1, pageSize: 8 });
    expect(page.pagination.totalItems).toBe(1);
    expect(page.items[0].id).toBe("2");
  });

  it("restores the full dataset when search is cleared", () => {
    const rows = [{ id: "1" }, { id: "2" }];
    const narrowed = rows.filter(() => listSearchMatch(listSearchTerm(""), ["x"]));
    const page = paginateItems(narrowed, { page: 1, pageSize: 8 });
    expect(page.pagination.totalItems).toBe(2);
  });

  it("returns empty pagination when nothing matches", () => {
    const rows = [{ id: "1", code: "A" }];
    const term = listSearchTerm("missing");
    const filtered = rows.filter((row) => listSearchMatch(term, [row.code]));
    const page = paginateItems(filtered, { page: 1, pageSize: 8 });
    expect(page.items).toHaveLength(0);
    expect(page.pagination.totalItems).toBe(0);
    expect(page.pagination.totalPages).toBe(1);
  });
});