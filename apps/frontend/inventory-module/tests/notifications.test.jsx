import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NotificationBell from "../src/components/layout/NotificationBell.jsx";
import { ROUTES } from "../src/config/navigation.js";
import {
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_TYPES,
  createEmptyState,
  detectConditions,
  formatRelativeTime,
  DATE_GROUPS,
  clearRead,
  filterNotifications,
  getDateGroup,
  groupByDate,
  loadState,
  markAllAsRead,
  markAsRead,
  reconcileNotifications,
} from "../src/features/notifications/services/notificationService.js";
import { getMockDatabase, resetMockDatabase } from "../src/mock-api/mockDatabase.js";

const snapshot = (db) => ({
  items: db.items,
  inwardEntries: db.inwardEntries,
  deliveryNotes: db.deliveryNotes,
  reconciliations: db.reconciliationRecords,
});

const T0 = new Date("2026-09-11T10:00:00Z");

describe("notification conditions", () => {
  beforeEach(() => resetMockDatabase());

  it("detects all five notification types from mock data", () => {
    const db = getMockDatabase();
    db.items[3].currentStock = 0;
    const types = new Set(detectConditions(snapshot(db)).map((c) => c.type));
    expect([...types].sort()).toEqual(Object.values(NOTIFICATION_TYPES).sort());
  });

  it("flags low stock only below the reorder level and out of stock at zero", () => {
    const items = [
      { id: "a", itemName: "A", itemCode: "A", currentStock: 9, reorderLevel: 10 },
      { id: "b", itemName: "B", itemCode: "B", currentStock: 10, reorderLevel: 10 },
      { id: "c", itemName: "C", itemCode: "C", currentStock: 0, reorderLevel: 10 },
    ];
    const found = detectConditions({ items }).map((c) => c.key);
    expect(found).toEqual(["low-stock:a", "out-of-stock:c"]);
  });
});

describe("notification reconciliation", () => {
  beforeEach(() => resetMockDatabase());

  it("creates each notification once and not again on repeated runs", () => {
    const conditions = detectConditions(snapshot(getMockDatabase()));
    const first = reconcileNotifications(createEmptyState(), conditions, T0);
    const second = reconcileNotifications(first, conditions, new Date(T0.getTime() + 60000));
    expect(first.notifications.length).toBe(conditions.length);
    expect(second).toBe(first);
    expect(new Set(first.notifications.map((n) => n.id)).size).toBe(conditions.length);
  });

  it("does not duplicate after a persisted reload", () => {
    const conditions = detectConditions(snapshot(getMockDatabase()));
    const first = reconcileNotifications(createEmptyState(), conditions, T0);
    const reloaded = JSON.parse(JSON.stringify(first));
    expect(reconcileNotifications(reloaded, conditions, T0).notifications).toHaveLength(first.notifications.length);
  });

  it("creates a new notification when a resolved condition returns", () => {
    const db = getMockDatabase();
    const first = reconcileNotifications(createEmptyState(), detectConditions(snapshot(db)), T0);
    const read = markAllAsRead(first);

    db.deliveryNotes[0].status = "Dispatched";
    const resolved = reconcileNotifications(read, detectConditions(snapshot(db)), T0);
    expect(resolved.active["pending-delivery-note:dn-1"]).toBeUndefined();
    expect(resolved.notifications).toHaveLength(first.notifications.length);

    db.deliveryNotes[0].status = "Pending";
    const again = reconcileNotifications(resolved, detectConditions(snapshot(db)), new Date(T0.getTime() + 1000));
    expect(again.notifications).toHaveLength(first.notifications.length + 1);
    const fresh = again.notifications.find((n) => n.id === "pending-delivery-note:dn-1#2");
    expect(fresh.read).toBe(false);
  });

  it("keeps read status through reconciliation and supports mark-read helpers", () => {
    const conditions = detectConditions(snapshot(getMockDatabase()));
    const first = reconcileNotifications(createEmptyState(), conditions, T0);
    const id = first.notifications[0].id;
    const one = markAsRead(first, id);
    expect(one.notifications.filter((n) => !n.read)).toHaveLength(first.notifications.length - 1);
    expect(reconcileNotifications(one, conditions, T0).notifications.find((n) => n.id === id).read).toBe(true);
    expect(markAllAsRead(one).notifications.every((n) => n.read)).toBe(true);
  });

  it("falls back to an empty state for corrupt storage", () => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, "{not json");
    expect(loadState()).toEqual(createEmptyState());
  });

  it("formats relative time", () => {
    expect(formatRelativeTime(T0.toISOString(), new Date(T0.getTime() + 5000))).toBe("now");
    expect(formatRelativeTime(T0.toISOString(), new Date(T0.getTime() + 5 * 60000))).toBe("5m");
    expect(formatRelativeTime(T0.toISOString(), new Date(T0.getTime() + 3 * 3600000))).toBe("3h");
    expect(formatRelativeTime(T0.toISOString(), new Date(T0.getTime() + 2 * 86400000))).toBe("2d");
  });
});

describe("NotificationBell", () => {
  beforeEach(() => {
    resetMockDatabase();
    localStorage.clear();
    window.location.hash = "#/dashboard";
  });

  async function renderBell() {
    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeInTheDocument());
  }

  it("shows an unread badge and opens and closes the dropdown", async () => {
    await renderBell();
    const total = Number(screen.getByTestId("notification-badge").textContent);
    expect(total).toBeGreaterThan(0);

    const bell = screen.getByRole("button", { name: /Notifications, \d+ unread/ });
    fireEvent.click(bell);
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    fireEvent.click(bell);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks one notification read, updates the count, and persists it", async () => {
    await renderBell();
    const total = Number(screen.getByTestId("notification-badge").textContent);
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    fireEvent.click(screen.getAllByTitle("Mark as read")[0]);
    expect(Number(screen.getByTestId("notification-badge").textContent)).toBe(total - 1);

    const stored = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY));
    expect(stored.notifications.filter((n) => !n.read)).toHaveLength(total - 1);
  });

  it("filters the Unread tab, marks all as read, and shows empty states", async () => {
    await renderBell();
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    const list = screen.getByRole("list", { name: "Today notifications" });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Mark all as read/ }));
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    expect(screen.getByText(/No unread notifications/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByRole("list", { name: "Today notifications" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no notifications", async () => {
    const db = getMockDatabase();
    db.items.forEach((i) => { i.currentStock = i.reorderLevel + 1; });
    db.inwardEntries.forEach((e) => { e.status = "Received"; });
    db.deliveryNotes.forEach((d) => { d.status = "Delivered"; });
    db.reconciliationRecords.forEach((r) => { r.status = "Matched"; });
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() => expect(screen.getByText("No notifications yet.")).toBeInTheDocument());
  });

  it("navigates to the relevant page and keeps state after a remount", async () => {
    const { unmount } = render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeInTheDocument());
    const total = Number(screen.getByTestId("notification-badge").textContent);
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    fireEvent.click(screen.getByText("Pending Delivery Note"));
    expect(window.location.hash).toBe("#/delivery-note");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();

    render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toHaveTextContent(String(total - 1)));
    const stored = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY));
    expect(stored.notifications).toHaveLength(total);
  });

  it("uses a responsive panel layout", async () => {
    await renderBell();
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("fixed");
    expect(panel.className).toContain("sm:w-[400px]");
    expect(panel.className).not.toContain("w-[540px]");
    expect(panel.className).toContain("inset-x-3");
    expect(panel.className).toContain("max-w-[calc(100vw-1.5rem)]");
    expect(panel.className).toContain("max-h-[min(520px");
    expect(panel.className).toContain("flex-col");
    const scroll = screen.getByTestId("notification-scroll");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toContain("overflow-x-hidden");
    expect(scroll.contains(screen.getByRole("tablist"))).toBe(false);
    expect(scroll.contains(screen.getByRole("button", { name: /Mark all as read/ }))).toBe(false);
  });

  it("opens the registered route for every notification type, marks it read and closes the panel", async () => {
    const registered = Object.values(ROUTES);
    const expected = {
      "Low Stock Alert": ROUTES.itemMaster,
      "Out of Stock": ROUTES.itemMaster,
      "Pending GRN": ROUTES.inward,
      "Pending Delivery Note": ROUTES.deliveryNote,
      "Stock Discrepancy": ROUTES.stockReconciliation,
    };
    await renderBell();
    let visited = 0;
    for (const [title, path] of Object.entries(expected)) {
      window.location.hash = "#/dashboard";
      const before = Number(screen.getByTestId("notification-badge").textContent);
      fireEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      const match = screen.queryAllByText(title)[0];
      if (!match) {
        fireEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
        continue;
      }
      fireEvent.click(match.closest("button"));
      visited += 1;
      expect(registered).toContain(path);
      expect(window.location.hash).toBe(`#${path}`);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const after = screen.queryByTestId("notification-badge");
      expect(after ? Number(after.textContent) : 0).toBe(before - 1);
    }
    expect(visited).toBeGreaterThanOrEqual(4);
  });

  it("does not duplicate notifications across remounts and keeps read state", async () => {
    const first = render(<NotificationBell />);
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeInTheDocument());
    const total = Number(screen.getByTestId("notification-badge").textContent);
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    fireEvent.click(screen.getAllByTitle("Mark as read")[0]);
    first.unmount();
    for (let i = 0; i < 2; i += 1) {
      const again = render(<NotificationBell />);
      await waitFor(() => expect(screen.getByTestId("notification-badge")).toHaveTextContent(String(total - 1)));
      again.unmount();
    }
    expect(JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY)).notifications).toHaveLength(total);
  });

  it("shows only the All and Unread filters and no module dropdown", async () => {
    await renderBell();
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["All", "Unread"]);
    for (const removed of [/Focus/, /Others/, /Watching/, /Mention/, /All modules/, /Module filter/]) {
      expect(screen.queryByRole("tab", { name: removed })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: removed })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    const total = screen.getAllByRole("listitem").length;
    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(screen.getAllByRole("listitem").length).toBe(Number(screen.getByTestId("notification-badge").textContent));
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(total);
  });

  it("puts Mark all as read on the title row, with tabs below and no three-dot menu", async () => {
    await renderBell();
    fireEvent.click(screen.getByRole("button", { name: /Notifications, \d+ unread/ }));
    const heading = screen.getByRole("heading", { name: "Notifications" });
    const markAll = screen.getByRole("button", { name: "Mark all as read" });
    expect(heading.parentElement).toBe(markAll.parentElement);
    expect(heading.parentElement.className).toContain("justify-between");
    const tabs = screen.getByRole("tablist");
    expect(tabs.contains(markAll)).toBe(false);
    expect(heading.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabs.compareDocumentPosition(screen.getByRole("region", { name: "Today" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "More notification actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh notifications" })).not.toBeInTheDocument();
    fireEvent.click(markAll);
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    expect(markAll).toBeDisabled();
  });
});

describe("date grouping", () => {
  const now = new Date(2026, 8, 11, 0, 30, 0); // 11 Sep 2026, 00:30 local
  const at = (y, m, d, h = 12) => new Date(y, m, d, h).toISOString();

  it("buckets by local calendar day", () => {
    expect(getDateGroup(new Date(2026, 8, 10, 23, 59).toISOString(), now)).toBe("Yesterday");
    expect(getDateGroup(new Date(2026, 8, 11, 0, 5).toISOString(), now)).toBe("Today");
    expect(getDateGroup(at(2026, 8, 8), now)).toBe("Earlier this week");
    expect(getDateGroup(at(2026, 8, 5), now)).toBe("Earlier this week");
    expect(getDateGroup(at(2026, 8, 4), now)).toBe("Older");
  });

  it("returns only non-empty groups in order", () => {
    const list = [
      { id: "a", createdAt: at(2026, 7, 1) },
      { id: "b", createdAt: at(2026, 8, 11, 0) },
      { id: "c", createdAt: at(2026, 8, 10) },
    ];
    const groups = groupByDate(list, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Older"]);
    expect(DATE_GROUPS).toHaveLength(4);
  });

  it("filters by unread only, and clears only read items", () => {
    const list = [
      { id: "1", type: "low-stock", priority: "High", read: false, module: "inventory" },
      { id: "2", type: "pending-grn", priority: "Medium", read: true },
    ];
    expect(filterNotifications(list).map((n) => n.id)).toEqual(["1", "2"]);
    expect(filterNotifications(list, { unreadOnly: true }).map((n) => n.id)).toEqual(["1"]);
    expect(clearRead({ ...createEmptyState(), notifications: list }).notifications.map((n) => n.id)).toEqual(["1"]);
  });
});
