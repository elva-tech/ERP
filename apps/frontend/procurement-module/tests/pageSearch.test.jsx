import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PageSearchField from "../src/components/layout/PageSearchField.jsx";
import { PageSearchProvider } from "../src/features/search/pageSearchContext.jsx";
import { useServerList } from "../src/hooks/useServerList.js";

const listFn = vi.fn(async ({ search }) => ({
  items: [{ id: "1", orderNumber: search || "PO-100" }],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
}));

function TestListPage() {
  const list = useServerList(listFn, { status: "", search: "" }, { pageSearch: true });
  return <div data-testid="count">{list.items.length}</div>;
}

describe("page header search", () => {
  it("filters the active list via useServerList", async () => {
    render(
      <PageSearchProvider activePath="/purchase-orders">
        <PageSearchField placeholder="Search" />
        <TestListPage />
      </PageSearchProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "PO-102" } });

    await waitFor(() => {
      expect(listFn).toHaveBeenCalled();
      const lastCall = listFn.mock.calls.at(-1)?.[0];
      expect(lastCall?.search).toBe("PO-102");
    });
  });
});