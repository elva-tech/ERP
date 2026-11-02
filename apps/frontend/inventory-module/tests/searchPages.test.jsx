import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TopBar from "../src/components/layout/TopBar.jsx";
import { PageSearchProvider } from "../src/hooks/usePageSearch.jsx";
import ItemMasterPage from "../src/pages/ItemMasterPage.jsx";
import WarehouseDashboardPage from "../src/pages/WarehouseDashboardPage.jsx";
import StockLedgerPage from "../src/pages/StockLedgerPage.jsx";
import InwardPage from "../src/pages/InwardPage.jsx";
import OutwardPage from "../src/pages/OutwardPage.jsx";

const WAIT = { timeout: 3000 };

// Mirrors the app: the header search box and the page share one PageSearchProvider.
function renderPage(element) {
  return render(
    <PageSearchProvider>
      <TopBar title="Page" searchPlaceholder="Search items, warehouses, transactions..." />
      {element}
    </PageSearchProvider>,
  );
}

// `searchboxes` / `comboboxes` describe the page's ORIGINAL toolbar (header search included).
const PAGES = {
  "Item Master": {
    element: () => <ItemMasterPage onShowToast={() => {}} />,
    ready: "MCB-TP-32",
    searchboxes: 2,
    filters: ["Category", "Status"],
    cases: [
      ["mcb-tp", "CBL-1.5-3C", "MCB-TP-32"],
      ["SWITCHGEAR", "CBL-1.5-3C", "MCB-TP-32"],
      ["853620", "CBL-1.5-3C", "MCB-TP-32"],
    ],
  },
  Warehouses: {
    element: () => <WarehouseDashboardPage onNavigate={() => {}} onShowToast={() => {}} />,
    ready: "Mumbai Yard Warehouse",
    searchboxes: 1,
    filters: [],
    cases: [
      ["MUMBAI", "Pune Main Warehouse", "Mumbai Yard Warehouse"],
      ["nagpur", "Pune Main Warehouse", "Nagpur Site Warehouse"],
    ],
  },
  Stock: {
    element: () => <StockLedgerPage onShowToast={() => {}} />,
    ready: "GRN-2609-0184",
    searchboxes: 1,
    comboboxes: 4,
    cases: [
      ["hinjawadi", "GRN-2609-0184", "DN-2609-0092"],
      ["sales RETURN", "GRN-2609-0184", "SR-2609-0014"],
    ],
  },
  Inward: {
    element: () => <InwardPage onShowToast={() => {}} />,
    ready: "GRN-2609-0181",
    searchboxes: 1,
    filters: ["Warehouse", "Date range"],
    cases: [
      ["finolex", "GRN-2609-0181", "GRN-2609-0184"],
      ["GRN-2609-0181", "GRN-2609-0172", "GRN-2609-0181"],
      ["mumbai", "GRN-2609-0184", "GRN-2609-0181"],
      ["distribution board", "GRN-2609-0184", "GRN-2609-0172"],
    ],
  },
  Outward: {
    element: () => <OutwardPage onShowToast={() => {}} />,
    ready: "DN-2609-0092",
    searchboxes: 1,
    filters: ["Warehouse", "Date range", "Status"],
    cases: [
      ["BANER", "DN-2609-0092", "DN-2609-0096"],
      ["delivered", "DN-2609-0096", "DN-2609-0092"],
      ["electrical department", "DN-2609-0096", "DN-2609-0081"],
    ],
  },
};

const pageText = () => document.body.textContent;
const headerSearch = () => screen.getAllByRole("searchbox")[0];

describe.each(Object.entries(PAGES))("%s search", (_name, page) => {
  it("keeps the original toolbar controls and adds no extra search bar", async () => {
    renderPage(page.element());
    await waitFor(() => expect(pageText()).toContain(page.ready), WAIT);

    expect(screen.getAllByRole("searchbox")).toHaveLength(page.searchboxes);
    for (const label of page.filters ?? []) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    const expectedSelects = page.comboboxes ?? (page.filters ?? []).length;
    expect(screen.queryAllByRole("combobox")).toHaveLength(expectedSelects);
  });

  it("filters by partial, case-insensitive keywords and restores everything on clear", async () => {
    renderPage(page.element());
    await waitFor(() => expect(pageText()).toContain(page.ready), WAIT);
    const input = headerSearch();

    for (const [keyword, hidden, shown] of page.cases) {
      fireEvent.change(input, { target: { value: keyword } });
      await waitFor(() => expect(pageText()).not.toContain(hidden), WAIT);
      expect(pageText()).toContain(shown);

      fireEvent.change(input, { target: { value: "" } });
      await waitFor(() => expect(pageText()).toContain(hidden), WAIT);
      expect(pageText()).toContain(shown);
    }
  });

  it("shows no rows when nothing matches", async () => {
    renderPage(page.element());
    await waitFor(() => expect(pageText()).toContain(page.ready), WAIT);

    fireEvent.change(headerSearch(), { target: { value: "zzz-no-such-record" } });
    await waitFor(() => expect(pageText()).not.toContain(page.ready), WAIT);
  });
});

describe("search combined with the existing filters", () => {
  it("Item Master: search narrows within the selected category", async () => {
    renderPage(<ItemMasterPage onShowToast={() => {}} />);
    await waitFor(() => expect(pageText()).toContain("MCB-TP-32"), WAIT);

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Switchgear" } });
    await waitFor(() => expect(pageText()).not.toContain("CBL-1.5-3C"), WAIT);

    fireEvent.change(headerSearch(), { target: { value: "cable" } });
    await waitFor(() => expect(pageText()).not.toContain("MCB-TP-32"), WAIT);
    expect(pageText()).not.toContain("CBL-1.5-3C");

    fireEvent.change(headerSearch(), { target: { value: "" } });
    await waitFor(() => expect(pageText()).toContain("MCB-TP-32"), WAIT);
    expect(pageText()).not.toContain("CBL-1.5-3C");
  });

  it("Item Master: the in-page search and the header search stay in sync", async () => {
    renderPage(<ItemMasterPage onShowToast={() => {}} />);
    await waitFor(() => expect(pageText()).toContain("MCB-TP-32"), WAIT);
    const [header, inPage] = screen.getAllByRole("searchbox");

    fireEvent.change(inPage, { target: { value: "mcb" } });
    await waitFor(() => expect(pageText()).not.toContain("CBL-1.5-3C"), WAIT);
    await waitFor(() => expect(header.value).toBe("mcb"), WAIT);

    fireEvent.change(header, { target: { value: "" } });
    await waitFor(() => expect(pageText()).toContain("CBL-1.5-3C"), WAIT);
    await waitFor(() => expect(inPage.value).toBe(""), WAIT);
  });

  it("Outward: search narrows within the selected status", async () => {
    renderPage(<OutwardPage onShowToast={() => {}} />);
    await waitFor(() => expect(pageText()).toContain("DN-2609-0092"), WAIT);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Delivered" } });
    await waitFor(() => expect(pageText()).not.toContain("DN-2609-0096"), WAIT);

    fireEvent.change(headerSearch(), { target: { value: "baner" } });
    await waitFor(() => expect(pageText()).toContain("DN-2609-0092"), WAIT);
    expect(pageText()).not.toContain("DN-2609-0096");
  });

  it("Inward: search narrows within the selected warehouse", async () => {
    renderPage(<InwardPage onShowToast={() => {}} />);
    await waitFor(() => expect(pageText()).toContain("GRN-2609-0181"), WAIT);

    fireEvent.change(headerSearch(), { target: { value: "grn-2609" } });
    await waitFor(() => expect(pageText()).toContain("GRN-2609-0184"), WAIT);

    const select = screen.getByLabelText("Warehouse");
    const mumbai = Array.from(select.options).find((o) => o.textContent === "Mumbai Yard Warehouse");
    fireEvent.change(select, { target: { value: mumbai.value } });
    await waitFor(() => expect(pageText()).not.toContain("GRN-2609-0184"), WAIT);
    expect(pageText()).toContain("GRN-2609-0181");
  });
});
