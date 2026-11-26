import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { mockApiAdapter } from "../src/mock-api/mockApiAdapter.js";
import { getMockDatabase, resetMockDatabase } from "../src/mock-api/mockDatabase.js";
import StartReconciliationModal from "../src/features/reconciliation/components/StartReconciliationModal.jsx";
import LoginPage from "../src/pages/LoginPage.jsx";
import { RECONCILIATION_STATUS_BADGES, TRANSFER_STATUS_BADGES } from "../src/lib/inventoryStatusBadges.js";
import { badgeToneClass } from "../src/components/ui/badgeStyles.js";
import { PageSearchProvider, usePageSearch } from "../src/hooks/usePageSearch.jsx";
import { matchesSearch } from "../src/lib/search.js";
import PrimaryActionButton from "../src/components/ui/PrimaryActionButton.jsx";

describe("inventory UX helpers", () => {
  beforeEach(() => resetMockDatabase());

  it("filters item master mock list by category and search together", async () => {
    const cables = await mockApiAdapter.listItems({ category: "Cables & Wires", search: "CBL" });
    expect(cables.data.length).toBeGreaterThan(0);
    cables.data.forEach((item) => {
      expect(item.category.toLowerCase()).toBe("cables & wires");
      const blob = `${item.itemCode} ${item.itemName} ${item.hsnCode}`.toLowerCase();
      expect(blob).toContain("cbl");
    });

    const none = await mockApiAdapter.listItems({ category: "Cables & Wires", search: "ZZZ-NO-MATCH" });
    expect(none.data).toHaveLength(0);
  });

  it("maps transfer and reconciliation statuses to distinct semantic badge tones", () => {
    const transferTones = new Set(
      ["Received", "In Transit", "Pending", "Cancelled"].map((key) => TRANSFER_STATUS_BADGES[key].tone),
    );
    expect(transferTones.size).toBeGreaterThanOrEqual(3);

    const reconTones = new Set(
      ["Matched", "Pending", "Discrepancy", "Adjusted"].map((key) => RECONCILIATION_STATUS_BADGES[key].tone),
    );
    expect(reconTones.size).toBeGreaterThanOrEqual(3);
    expect(RECONCILIATION_STATUS_BADGES.Matched.tone).not.toBe(RECONCILIATION_STATUS_BADGES.Discrepancy.tone);
    expect(TRANSFER_STATUS_BADGES.Received.tone).not.toBe(TRANSFER_STATUS_BADGES["In Transit"].tone);
    expect(badgeToneClass("success")).toBeTruthy();
  });

  it("matches page search helper across multiple fields", () => {
    expect(matchesSearch("mcb", "CBL-1.5", "MCB Triple Pole")).toBe(true);
    expect(matchesSearch("", "anything")).toBe(true);
    expect(matchesSearch("nomatch", "CBL-1.5", "MCB")).toBe(false);
  });

  it("renders a single plus icon on primary actions", () => {
    render(<PrimaryActionButton onClick={() => {}}>Add Item</PrimaryActionButton>);
    const button = screen.getByRole("button", { name: /Add Item/i });
    expect(button.querySelectorAll("svg").length).toBe(1);
    expect(button.textContent).not.toMatch(/\+\+|Add\s*\+/);
  });

  it("propagates debounced header search through PageSearchProvider", () => {
    function Probe() {
      const { search, setSearch } = usePageSearch();
      return (
        <>
          <input aria-label="probe" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span data-testid="out">{search}</span>
        </>
      );
    }
    render(
      <PageSearchProvider>
        <Probe />
      </PageSearchProvider>,
    );
    fireEvent.change(screen.getByLabelText("probe"), { target: { value: "warehouse" } });
    expect(screen.getByTestId("out")).toHaveTextContent("warehouse");
  });

  it("shows Record Reconciliation (not Saving) when a duplicate pending record blocks submit", async () => {
    render(
      <StartReconciliationModal
        isOpen
        onClose={() => {}}
        onSubmit={vi.fn()}
        isSubmitting={false}
        warehouses={[{ id: "wh-1", name: "Pune Main Warehouse" }]}
        items={[
          {
            id: "item-1",
            itemCode: "CBL-1.5-3C",
            itemName: "Cable",
            currentStock: 120,
            unit: "m",
          },
        ]}
        existingRecords={[
          {
            id: "rec-dup",
            warehouseId: "wh-1",
            itemId: "item-1",
            itemCode: "CBL-1.5-3C",
            status: "Discrepancy",
          },
        ]}
      />,
    );

    const submit = await screen.findByRole("button", { name: "Record Reconciliation" });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Saving/i })).not.toBeInTheDocument();
  });

  it("records reconciliation through the mock API and returns the new record", async () => {
    const db = getMockDatabase();
    const warehouse = db.warehouses[0];
    const item = db.items.find(
      (i) =>
        !db.reconciliationRecords.some(
          (r) => r.warehouseId === warehouse.id && r.itemId === i.id && r.status !== "Adjusted",
        ),
    );
    expect(item).toBeTruthy();

    const res = await mockApiAdapter.startReconciliation({
      warehouseId: warehouse.id,
      itemId: item.id,
      systemQuantity: 50,
      actualPresentQuantity: 48,
      difference: -2,
      reconciliationDate: "11 Nov 2026",
      assignedTo: "Team Alpha (Store Keepers)",
      remarks: "Cycle count",
    });
    expect(res.success).toBe(true);
    expect(res.data.itemId).toBe(item.id);
    expect(res.data.status).toBe("Discrepancy");
  });

  it("uses navy primary styling on the login submit button", () => {
    render(<LoginPage onLogin={() => {}} />);
    const submit = screen.getByRole("button", { name: /Sign In/i });
    expect(submit.className).toContain("bg-navy");
    expect(submit.className).not.toContain("bg-brand");
  });
});