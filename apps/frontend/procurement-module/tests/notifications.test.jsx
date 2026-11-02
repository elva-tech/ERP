import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPurchaseRequisitions: vi.fn(),
  listPurchaseOrders: vi.fn(),
  listPendingApprovals: vi.fn(),
  listApprovalHistory: vi.fn(),
  listSuppliers: vi.fn(),
}));

vi.mock("../src/features/purchase-requisitions/purchaseRequisitionService.js", () => ({
  listPurchaseRequisitions: mocks.listPurchaseRequisitions,
}));
vi.mock("../src/features/purchase-orders/purchaseOrderService.js", () => ({
  listPurchaseOrders: mocks.listPurchaseOrders,
}));
vi.mock("../src/features/approvals/approvalService.js", () => ({
  listPendingApprovals: mocks.listPendingApprovals,
  listApprovalHistory: mocks.listApprovalHistory,
}));
vi.mock("../src/features/suppliers/supplierService.js", () => ({
  listSuppliers: mocks.listSuppliers,
}));

import NotificationBell from "../src/components/layout/NotificationBell.jsx";
import {
  createEmptyState,
  detectConditions,
  filterNotifications,
  formatRelativeTime,
  getDateGroup,
  getStorageKey,
  groupByDate,
  loadState,
  markAllAsRead,
  markAsRead,
  reconcileNotifications,
} from "../src/features/notifications/notificationService.js";

const iso = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString();
const page = (items) => ({ items, pagination: { page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 } });

function data(overrides = {}) {
  return {
    requisitions: [
      {
        id: "pr1",
        requisitionNumber: "PR-001",
        itemsSummary: "Cement",
        requestedBy: { displayName: "Asha" },
        requestDate: iso(30),
        priority: "high",
        status: "pending_approval",
      },
    ],
    pendingPoApprovals: [
      {
        id: "ap1",
        documentType: "purchaseOrder",
        document: { id: "po1", number: "PO-010" },
        requestedBy: { displayName: "Ravi" },
        submittedAt: iso(120),
        amount: "50000",
        priority: "medium",
      },
    ],
    purchaseOrders: [
      { id: "po2", orderNumber: "PO-020", supplier: { name: "Acme" }, status: "partially_received" },
      { id: "po3", orderNumber: "PO-030", supplier: { name: "Beta" }, status: "cancelled" },
      { id: "po4", orderNumber: "PO-040", supplier: { name: "Gamma" }, status: "sent" },
    ],
    suppliers: [{ id: "s1", name: "Delta Ltd", code: "SUP-1", status: "inactive" }],
    approvalHistory: [
      {
        id: "h1",
        documentTypeLabel: "Purchase Requisition",
        document: { number: "PR-002" },
        decidedBy: { displayName: "Meera" },
        decidedAt: iso(60 * 30),
        decision: "rejected",
      },
    ],
    ...overrides,
  };
}

function mockApi(d) {
  mocks.listPurchaseRequisitions.mockImplementation(async () => page(d.requisitions));
  mocks.listPendingApprovals.mockImplementation(async () => page(d.pendingPoApprovals));
  mocks.listPurchaseOrders.mockImplementation(async () => page(d.purchaseOrders));
  mocks.listSuppliers.mockImplementation(async () => page(d.suppliers));
  mocks.listApprovalHistory.mockImplementation(async () => page(d.approvalHistory));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
});

describe("notification service", () => {
  it("detects all five Procurement notification types from real records", () => {
    const conditions = detectConditions(data());
    expect(conditions.map((c) => c.key).sort()).toEqual([
      "pending-po-approval:ap1",
      "pending-requisition:pr1",
      "po-update:po2:partially_received",
      "po-update:po3:cancelled",
      "supplier-update:s1",
      "workflow-decision:h1",
    ]);
  });

  it("ignores resolved or irrelevant records and failed (null) sources", () => {
    const conditions = detectConditions({
      requisitions: [{ id: "x", status: "approved" }],
      pendingPoApprovals: [{ id: "y", documentType: "purchaseInvoice" }],
      purchaseOrders: [{ id: "z", status: "completed" }],
      suppliers: [{ id: "q", status: "active" }],
      approvalHistory: null,
    });
    expect(conditions).toEqual([]);
  });

  it("creates a notification once and never duplicates an unresolved condition", () => {
    const conditions = detectConditions(data());
    const first = reconcileNotifications(createEmptyState(), conditions);
    expect(first.notifications).toHaveLength(6);
    const again = reconcileNotifications(first, conditions);
    expect(again).toBe(first);
    const afterReload = reconcileNotifications(JSON.parse(JSON.stringify(first)), conditions);
    expect(afterReload.notifications).toHaveLength(6);
  });

  it("creates a new notification when a resolved condition returns", () => {
    const conditions = detectConditions(data());
    let state = reconcileNotifications(createEmptyState(), conditions);
    state = reconcileNotifications(state, []);
    expect(Object.keys(state.active)).toHaveLength(0);
    state = reconcileNotifications(state, conditions);
    expect(state.notifications).toHaveLength(12);
    expect(state.notifications.some((n) => n.id === "pending-requisition:pr1#2")).toBe(true);
  });

  it("does not resolve conditions of sources that failed to load", () => {
    const conditions = detectConditions(data());
    let state = reconcileNotifications(createEmptyState(), conditions);
    state = reconcileNotifications(state, [], { loadedTypes: ["supplier-update"] });
    expect(state.active["pending-requisition:pr1"]).toBeDefined();
    expect(state.active["supplier-update:s1"]).toBeUndefined();
  });

  it("uses real event timestamps for createdAt and never a future time", () => {
    const state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    const pr = state.notifications.find((n) => n.sourceId === "pr1");
    expect(Date.now() - new Date(pr.createdAt).getTime()).toBeGreaterThanOrEqual(29 * 60000);
  });

  it("marks read and keeps state immutable", () => {
    const state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    const one = markAsRead(state, state.notifications[0].id);
    expect(one.notifications.filter((n) => !n.read)).toHaveLength(5);
    expect(state.notifications.every((n) => !n.read)).toBe(true);
    expect(markAllAsRead(one).notifications.every((n) => n.read)).toBe(true);
  });

  it("filters by tab, module and unread", () => {
    let state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    const types = (opts) => filterNotifications(state.notifications, opts).map((n) => n.type);
    expect(types({ tab: "focus" }).sort()).toEqual(["pending-requisition", "workflow-decision"]);
    expect(types({ tab: "watching" }).sort()).toEqual(["po-update", "po-update", "supplier-update"]);
    expect(types({ tab: "mention" }).sort()).toEqual(["pending-po-approval", "pending-requisition"]);
    expect(types({ tab: "others" })).toHaveLength(4);
    expect(types({ module: "inventory" })).toEqual([]);
    state = markAllAsRead(state);
    expect(types({ unreadOnly: true })).toEqual([]);
  });

  it("groups by local calendar day and formats relative time", () => {
    const now = new Date(2025, 5, 18, 12, 0, 0);
    const ago = (ms) => new Date(now.getTime() - ms).toISOString();
    expect(getDateGroup(ago(5 * 60000), now)).toBe("Today");
    expect(getDateGroup(new Date(2025, 5, 17, 23, 59).toISOString(), now)).toBe("Yesterday");
    expect(getDateGroup(new Date(2025, 5, 14, 9, 0).toISOString(), now)).toBe("Earlier this week");
    expect(getDateGroup(new Date(2025, 5, 1, 9, 0).toISOString(), now)).toBe("Older");
    const labels = groupByDate(
      [{ createdAt: ago(60000) }, { createdAt: ago(86400000 * 20) }],
      now,
    ).map((g) => g.label);
    expect(labels).toEqual(["Today", "Older"]);
    expect(formatRelativeTime(ago(10000), now)).toBe("now");
    expect(formatRelativeTime(ago(2 * 60000), now)).toBe("2m");
    expect(formatRelativeTime(ago(60 * 60000), now)).toBe("1h");
    expect(formatRelativeTime(ago(5 * 3600000), now)).toBe("5h");
    expect(formatRelativeTime(ago(86400000), now)).toBe("1d");
  });

  it("falls back to empty state for corrupt storage and uses a Procurement-only key", () => {
    localStorage.setItem(getStorageKey(null), "{not json");
    expect(loadState(null)).toEqual(createEmptyState());
    expect(getStorageKey("u1").startsWith("procurement.")).toBe(true);
  });
});

describe("NotificationBell", () => {
  async function renderBell(d = data()) {
    mockApi(d);
    const utils = render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeInTheDocument());
    return utils;
  }
  const open = () => fireEvent.click(screen.getByRole("button", { name: /^Notifications/ }));

  it("shows the unread badge and opens/closes the panel", async () => {
    await renderBell();
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("6");
    open();
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
    open();
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
  });

  it("renders the reference layout: five tabs, toolbar, date groups, scroll list only", async () => {
    await renderBell();
    open();
    const panel = screen.getByTestId("notification-panel");
    expect(within(panel).getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "All",
      "Focus",
      "Others",
      "Watching",
      "@Mention",
    ]);
    expect(within(panel).getByRole("button", { name: "Refresh notifications" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Module filter/ })).toBeInTheDocument();
    expect(within(panel).getByRole("checkbox", { name: "Unread" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "More notification actions" })).toBeInTheDocument();
    expect(screen.getByTestId("notification-scroll").className).toContain("overflow-y-auto");
    expect(panel.className).toContain("md:w-[540px]");
    expect(panel.className).toContain("inset-x-3");
    expect(within(panel).getByText("Today")).toBeInTheDocument();
    expect(within(panel).getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(6);
    expect(within(panel).getByText("30m")).toBeInTheDocument();
    expect(within(panel).getByText("2h")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByRole("tab", { name: "Focus" }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: "Watching" }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(3);
    fireEvent.click(screen.getByRole("tab", { name: "@Mention" }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(2);
  });

  it("marks one notification as read and updates the badge", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getAllByRole("button", { name: /^Mark (?!all ).* as read$/ })[0]);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("5");
  });

  it("filters with the Unread checkbox and shows empty states", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(6);
    fireEvent.click(screen.getByRole("checkbox", { name: "Unread" }));
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });

  it("module dropdown filters and disables modules that are not integrated", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByRole("button", { name: /Module filter/ }));
    expect(screen.getByRole("option", { name: /Inventory/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("option", { name: /^Procurement/ }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(6);
  });

  it("three-dot menu: clear read and refresh", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getAllByRole("button", { name: /^Mark (?!all ).* as read$/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "More notification actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Clear read/ }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(5);
    const calls = mocks.listSuppliers.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "More notification actions" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Refresh/ }));
    });
    expect(mocks.listSuppliers.mock.calls.length).toBe(calls + 1);
    // The cleared notification's condition is still unresolved, so it is not recreated.
    expect(screen.getAllByTestId("notification-item")).toHaveLength(5);
  });

  it("refresh button does not duplicate notifications", async () => {
    await renderBell();
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh notifications" }));
    });
    expect(screen.getAllByTestId("notification-item")).toHaveLength(6);
  });

  it("navigates to the relevant Procurement screen and marks as read", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByText("Supplier Inactive"));
    expect(window.location.hash).toBe("#/supplier-master");
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("5");
    open();
    fireEvent.click(screen.getByText("Requisition Pending"));
    expect(window.location.hash).toContain("type=purchaseRequisition");
    expect(window.location.hash).toContain("id=pr1");
  });

  it("persists read state across remounts without duplicating notifications", async () => {
    const first = await renderBell();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    first.unmount();
    mockApi(data());
    render(<NotificationBell />);
    await waitFor(() => expect(mocks.listSuppliers.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    open();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(6);
    expect(localStorage.getItem("procurement.notifications.v1")).toBeTruthy();
  });

  it("shows the empty state with no notifications and keeps working when the API fails", async () => {
    mocks.listPurchaseRequisitions.mockRejectedValue(new Error("down"));
    mocks.listPendingApprovals.mockRejectedValue(new Error("down"));
    mocks.listPurchaseOrders.mockRejectedValue(new Error("down"));
    mocks.listSuppliers.mockRejectedValue(new Error("down"));
    mocks.listApprovalHistory.mockRejectedValue(new Error("down"));
    render(<NotificationBell />);
    await waitFor(() => expect(mocks.listSuppliers).toHaveBeenCalled());
    open();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("creates a new notification when a resolved condition occurs again", async () => {
    const d = data();
    mockApi(d);
    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toHaveTextContent("6"));
    open();
    mocks.listSuppliers.mockImplementation(async () => page([]));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh notifications" }));
    });
    mocks.listSuppliers.mockImplementation(async () => page(d.suppliers));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh notifications" }));
    });
    expect(screen.getAllByTestId("notification-item")).toHaveLength(7);
  });
});
