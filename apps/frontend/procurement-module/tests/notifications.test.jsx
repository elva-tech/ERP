import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SOURCES = [
  "listPurchaseRequisitions",
  "listPurchaseOrders",
  "listPendingApprovals",
  "listApprovalHistory",
  "listPurchaseInvoices",
  "listPurchaseReturns",
  "listSubcontractAgreements",
  "listSubcontractBills",
];

const mocks = vi.hoisted(() => ({
  listPurchaseRequisitions: vi.fn(),
  listPurchaseOrders: vi.fn(),
  listPendingApprovals: vi.fn(),
  listApprovalHistory: vi.fn(),
  listPurchaseInvoices: vi.fn(),
  listPurchaseReturns: vi.fn(),
  listSubcontractAgreements: vi.fn(),
  listSubcontractBills: vi.fn(),
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
vi.mock("../src/features/purchase-invoices/purchaseInvoiceService.js", () => ({
  listPurchaseInvoices: mocks.listPurchaseInvoices,
}));
vi.mock("../src/features/purchase-returns/purchaseReturnService.js", () => ({
  listPurchaseReturns: mocks.listPurchaseReturns,
}));
vi.mock("../src/features/subcontract-agreements/subcontractAgreementService.js", () => ({
  listSubcontractAgreements: mocks.listSubcontractAgreements,
}));
vi.mock("../src/features/subcontract-bills/subcontractBillService.js", () => ({
  listSubcontractBills: mocks.listSubcontractBills,
}));

import NotificationBell from "../src/components/layout/NotificationBell.jsx";
import { ROUTES } from "../src/config/navigation.js";
import {
  createEmptyState,
  detectConditions,
  fetchSnapshot,
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

const EXPECTED_KEYS = [
  "agreement-update:ag1:active",
  "invoice-exception:inv1",
  "pending-po-approval:ap1",
  "pending-requisition:pr1",
  "po-update:approval:h2",
  "po-update:issued:po4",
  "requisition-update:h1",
  "return-update:ret1:pending_approval",
  "subcontract-bill-update:b1:submitted",
];

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
      { id: "po4", orderNumber: "PO-040", supplier: { name: "Gamma" }, status: "sent" },
      { id: "po5", orderNumber: "PO-050", supplier: { name: "Beta" }, status: "draft" },
    ],
    approvalHistory: [
      {
        id: "h1",
        documentType: "purchaseRequisition",
        document: { id: "pr2", number: "PR-002" },
        decidedBy: { displayName: "Meera" },
        decidedAt: iso(60 * 30),
        decision: "rejected",
      },
      {
        id: "h2",
        documentType: "purchaseOrder",
        document: { id: "po6", number: "PO-060" },
        decidedAt: iso(90),
        decision: "approved",
      },
      { id: "h3", documentType: "subcontractBill", document: { id: "b9", number: "SB-9" }, decision: "approved" },
    ],
    purchaseInvoices: [
      { id: "inv1", invoiceNumber: "INV-1", supplier: { name: "Acme" }, status: "draft", matchStatus: "mismatch" },
      { id: "inv2", invoiceNumber: "INV-2", status: "paid" },
    ],
    purchaseReturns: [{ id: "ret1", returnNumber: "RET-1", status: "pending_approval" }],
    subcontractAgreements: [{ id: "ag1", agreementNumber: "SCA-1", status: "active" }],
    subcontractBills: [{ id: "b1", billNumber: "SB-1", status: "submitted" }],
    ...overrides,
  };
}

function mockApi(d) {
  mocks.listPurchaseRequisitions.mockImplementation(async () => page(d.requisitions));
  mocks.listPendingApprovals.mockImplementation(async () => page(d.pendingPoApprovals));
  mocks.listPurchaseOrders.mockImplementation(async () => page(d.purchaseOrders));
  mocks.listApprovalHistory.mockImplementation(async () => page(d.approvalHistory));
  mocks.listPurchaseInvoices.mockImplementation(async () => page(d.purchaseInvoices));
  mocks.listPurchaseReturns.mockImplementation(async () => page(d.purchaseReturns));
  mocks.listSubcontractAgreements.mockImplementation(async () => page(d.subcontractAgreements));
  mocks.listSubcontractBills.mockImplementation(async () => page(d.subcontractBills));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.location.hash = "";
});

describe("notification service", () => {
  it("detects every Procurement notification type from mock records", () => {
    const conditions = detectConditions(data());
    expect(conditions.map((c) => c.key).sort()).toEqual(EXPECTED_KEYS);
    expect(conditions.find((c) => c.key === "requisition-update:h1").title).toBe("Requisition Rejected");
    expect(conditions.find((c) => c.key === "po-update:approval:h2").title).toBe("PO Approval Approved");
    expect(conditions.find((c) => c.key === "po-update:issued:po4").title).toBe("PO Issued");
    expect(conditions.find((c) => c.key === "invoice-exception:inv1").title).toBe("Invoice Mismatch");
  });

  it("covers returned requisitions, return approval and bill approval updates", () => {
    const conditions = detectConditions({
      approvalHistory: [{ id: "r1", documentType: "purchaseRequisition", document: { id: "p", number: "PR-9" }, decision: "returned" }],
      purchaseReturns: [{ id: "x", returnNumber: "RET-2", status: "credit_note_issued" }],
      subcontractBills: [{ id: "y", billNumber: "SB-2", status: "approved" }],
    });
    expect(conditions.map((c) => c.title).sort()).toEqual([
      "Purchase Return Approved",
      "Requisition Returned",
      "Subcontract Bill Approved",
    ]);
  });

  it("routes each notification to its Procurement screen or transaction", () => {
    const byKey = Object.fromEntries(detectConditions(data()).map((c) => [c.key, c]));
    expect(byKey["pending-requisition:pr1"].query).toMatchObject({ type: "purchaseRequisition", id: "pr1" });
    expect(byKey["po-update:issued:po4"].query).toMatchObject({ type: "purchaseOrder", id: "po4" });
    expect(byKey["invoice-exception:inv1"].query).toMatchObject({ type: "purchaseInvoice", id: "inv1" });
    expect(byKey["agreement-update:ag1:active"].query).toMatchObject({ type: "subcontractAgreement", id: "ag1" });
    expect(byKey["pending-po-approval:ap1"].route).toBe("/pending-approvals");
    expect(byKey["return-update:ret1:pending_approval"].route).toBe("/purchase-returns");
    expect(byKey["subcontract-bill-update:b1:submitted"].route).toBe("/subcontract-bills");
  });

  it("ignores resolved or irrelevant records and failed (null) sources", () => {
    const conditions = detectConditions({
      requisitions: [{ id: "x", status: "approved" }],
      pendingPoApprovals: [{ id: "y", documentType: "purchaseInvoice" }],
      purchaseOrders: [{ id: "z", status: "completed" }],
      purchaseInvoices: [{ id: "i", status: "paid" }],
      purchaseReturns: [{ id: "r", status: "other" }],
      subcontractBills: [{ id: "b", status: "paid" }],
      approvalHistory: null,
    });
    expect(conditions).toEqual([]);
  });

  it("creates a notification once and never duplicates an unresolved condition", () => {
    const conditions = detectConditions(data());
    const first = reconcileNotifications(createEmptyState(), conditions);
    expect(first.notifications).toHaveLength(9);
    expect(reconcileNotifications(first, conditions)).toBe(first);
    const afterReload = reconcileNotifications(JSON.parse(JSON.stringify(first)), conditions);
    expect(afterReload.notifications).toHaveLength(9);
  });

  it("treats a status change as a new event and a returning condition as a new notification", () => {
    const first = reconcileNotifications(
      createEmptyState(),
      detectConditions({ subcontractBills: [{ id: "b1", billNumber: "SB-1", status: "submitted" }] }),
    );
    const second = reconcileNotifications(
      first,
      detectConditions({ subcontractBills: [{ id: "b1", billNumber: "SB-1", status: "approved" }] }),
    );
    expect(second.notifications.map((n) => n.title).sort()).toEqual([
      "Subcontract Bill Approved",
      "Subcontract Bill Needs Review",
    ]);
    expect(Object.keys(second.active)).toEqual(["subcontract-bill-update:b1:approved"]);
    const conditions = detectConditions(data());
    let state = reconcileNotifications(createEmptyState(), conditions);
    state = reconcileNotifications(state, []);
    expect(Object.keys(state.active)).toHaveLength(0);
    state = reconcileNotifications(state, conditions);
    expect(state.notifications).toHaveLength(18);
    expect(state.notifications.some((n) => n.id === "pending-requisition:pr1#2")).toBe(true);
  });

  it("does not resolve conditions of sources that failed to load", () => {
    const conditions = detectConditions(data());
    let state = reconcileNotifications(createEmptyState(), conditions);
    state = reconcileNotifications(state, [], { loadedTypes: ["invoice-exception"] });
    expect(state.active["pending-requisition:pr1"]).toBeDefined();
    expect(state.active["invoice-exception:inv1"]).toBeUndefined();
  });

  it("only treats a type as loaded when every source feeding it loaded", async () => {
    mockApi(data());
    mocks.listApprovalHistory.mockRejectedValue(new Error("down"));
    const { snapshot, loadedTypes } = await fetchSnapshot();
    expect(snapshot.approvalHistory).toBeNull();
    expect(loadedTypes).not.toContain("po-update");
    expect(loadedTypes).not.toContain("requisition-update");
    expect(loadedTypes).toContain("invoice-exception");
  });

  it("uses real event timestamps for createdAt and never a future time", () => {
    const state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    const pr = state.notifications.find((n) => n.sourceId === "pr1");
    expect(Date.now() - new Date(pr.createdAt).getTime()).toBeGreaterThanOrEqual(29 * 60000);
  });

  it("marks read and keeps state immutable", () => {
    const state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    const one = markAsRead(state, state.notifications[0].id);
    expect(one.notifications.filter((n) => !n.read)).toHaveLength(8);
    expect(state.notifications.every((n) => !n.read)).toBe(true);
    expect(markAllAsRead(one).notifications.every((n) => n.read)).toBe(true);
  });

  it("filters by All and Unread only", () => {
    const state = reconcileNotifications(createEmptyState(), detectConditions(data()));
    expect(filterNotifications(state.notifications)).toHaveLength(9);
    expect(filterNotifications(markAllAsRead(state).notifications, { unreadOnly: true })).toEqual([]);
  });

  it("groups by local calendar day and formats relative time", () => {
    const now = new Date(2025, 5, 18, 12, 0, 0);
    const ago = (ms) => new Date(now.getTime() - ms).toISOString();
    expect(getDateGroup(ago(5 * 60000), now)).toBe("Today");
    expect(getDateGroup(new Date(2025, 5, 17, 23, 59).toISOString(), now)).toBe("Yesterday");
    expect(getDateGroup(new Date(2025, 5, 14, 9, 0).toISOString(), now)).toBe("Earlier this week");
    expect(getDateGroup(new Date(2025, 5, 1, 9, 0).toISOString(), now)).toBe("Older");
    const labels = groupByDate([{ createdAt: ago(60000) }, { createdAt: ago(86400000 * 20) }], now).map((g) => g.label);
    expect(labels).toEqual(["Today", "Older"]);
    expect(formatRelativeTime(ago(10000), now)).toBe("now");
    expect(formatRelativeTime(ago(2 * 60000), now)).toBe("2m");
    expect(formatRelativeTime(ago(60 * 60000), now)).toBe("1h");
    expect(formatRelativeTime(ago(86400000), now)).toBe("1d");
  });

  it("falls back to empty state for corrupt storage, drops retired types, and uses a Procurement-only key", () => {
    localStorage.setItem(getStorageKey(null), "{not json");
    expect(loadState(null)).toEqual(createEmptyState());
    localStorage.setItem(
      getStorageKey(null),
      JSON.stringify({
        notifications: [
          { id: "supplier-update:s1", type: "supplier-update" },
          { id: "invoice-exception:i", type: "invoice-exception" },
        ],
        active: { "supplier-update:s1": "supplier-update:s1", "invoice-exception:i": "invoice-exception:i" },
        occurrences: {},
      }),
    );
    const loaded = loadState(null);
    expect(loaded.notifications.map((n) => n.id)).toEqual(["invoice-exception:i"]);
    expect(Object.keys(loaded.active)).toEqual(["invoice-exception:i"]);
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
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("9");
    open();
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
    open();
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
  });

  it("renders a compact panel with only All and Unread filters", async () => {
    await renderBell();
    open();
    const panel = screen.getByTestId("notification-panel");
    expect(within(panel).getAllByRole("tab").map((t) => t.textContent)).toEqual(["All", "Unread"]);
    for (const removed of [/Focus/, /Others/, /Watching/, /Mention/, /All modules/, /Module filter/]) {
      expect(within(panel).queryByText(removed)).not.toBeInTheDocument();
      expect(within(panel).queryByRole("button", { name: removed })).not.toBeInTheDocument();
    }
    expect(within(panel).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
    expect(screen.getByTestId("notification-scroll").className).toContain("overflow-y-auto");
    expect(panel.className).toContain("sm:w-[400px]");
    expect(panel.className).toContain("inset-x-3");
    expect(panel.className).toContain("max-h-[min(520px");
    expect(panel.className).toContain("md:absolute");
    expect(panel.className).toContain("md:right-0");
    expect(panel.className).toContain("overflow-hidden");
    expect(panel.className).not.toContain("w-[540px]");
    expect(screen.getAllByTestId("notification-item")).toHaveLength(9);
    expect(within(panel).getByText("Requisition Pending Approval")).toBeInTheDocument();
    expect(within(panel).getByText("30m")).toBeInTheDocument();
    expect(within(panel).getAllByText("High").length).toBeGreaterThan(0);
  });

  it("filters with the Unread tab and shows empty states", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(9);
    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByTestId("notification-item")).toHaveLength(9);
  });

  it("marks one notification as read and updates the badge", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getAllByRole("button", { name: /^Mark (?!all ).* as read$/ })[0]);
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("8");
  });

  it("navigates to the relevant Procurement screen and marks as read", async () => {
    await renderBell();
    open();
    fireEvent.click(screen.getByText("Subcontract Bill Needs Review"));
    expect(window.location.hash).toBe("#/subcontract-bills");
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-badge")).toHaveTextContent("8");
    open();
    fireEvent.click(screen.getByText("Invoice Mismatch"));
    expect(window.location.hash).toContain("type=purchaseInvoice");
    expect(window.location.hash).toContain("id=inv1");
  });

  it("keeps the header and filters outside the scrolling list", async () => {
    await renderBell();
    open();
    const panel = screen.getByTestId("notification-panel");
    const scroll = screen.getByTestId("notification-scroll");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toContain("overflow-x-hidden");
    expect(scroll.className).toContain("flex-1");
    expect(panel.className).toContain("flex-col");
    expect(scroll.contains(within(panel).getByRole("tablist"))).toBe(false);
    expect(scroll.contains(within(panel).getByRole("button", { name: "Mark all as read" }))).toBe(false);
    expect(scroll.contains(within(panel).getByRole("heading", { name: "Notifications" }))).toBe(false);
    expect(scroll.querySelectorAll("[data-testid='notification-item']")).toHaveLength(9);
  });

  it("opens the registered route for every notification type, marks it read and closes the panel", async () => {
    const detailTypes = ["purchaseRequisition", "purchaseOrder", "purchaseInvoice", "subcontractAgreement"];
    const registered = Object.values(ROUTES);
    const expected = {
      "Requisition Pending Approval": "/record?type=purchaseRequisition&id=pr1",
      "Requisition Rejected": "/record?type=purchaseRequisition&id=pr2",
      "PO Approval Pending": "/pending-approvals",
      "PO Approval Approved": "/record?type=purchaseOrder&id=po6",
      "PO Issued": "/record?type=purchaseOrder&id=po4",
      "Invoice Mismatch": "/record?type=purchaseInvoice&id=inv1",
      "Purchase Return Awaiting Approval": "/purchase-returns",
      "Subcontract Agreement Active": "/record?type=subcontractAgreement&id=ag1",
      "Subcontract Bill Needs Review": "/subcontract-bills",
    };
    await renderBell();
    let unread = 9;
    for (const [title, target] of Object.entries(expected)) {
      window.location.hash = "#/dashboard";
      open();
      fireEvent.click(screen.getByText(title));
      const [path, query = ""] = window.location.hash.slice(1).split("?");
      expect(registered).toContain(path);
      if (path === ROUTES.recordDetail) expect(detailTypes).toContain(new URLSearchParams(query).get("type"));
      expect(window.location.hash.slice(1).startsWith(target)).toBe(true);
      expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
      unread -= 1;
      if (unread > 0) expect(screen.getByTestId("notification-badge")).toHaveTextContent(String(unread));
    }
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });

  it("persists read state across remounts without duplicating notifications", async () => {
    const first = await renderBell();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    first.unmount();
    mockApi(data());
    render(<NotificationBell />);
    await waitFor(() => expect(mocks.listSubcontractBills.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    open();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(9);
    expect(localStorage.getItem("procurement.notifications.v1")).toBeTruthy();
  });

  it("shows the empty state with no notifications and keeps working when the API fails", async () => {
    for (const name of SOURCES) mocks[name].mockRejectedValue(new Error("down"));
    render(<NotificationBell />);
    await waitFor(() => expect(mocks.listSubcontractBills).toHaveBeenCalled());
    open();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("does not duplicate on repeated syncs", async () => {
    await renderBell();
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await waitFor(() => expect(mocks.listSubcontractBills.mock.calls.length).toBeGreaterThanOrEqual(2));
    open();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(9);
  });
});
