import { ROUTES } from "../../config/navigation.js";
import { formatInr } from "../../lib/formatters.js";
import { listApprovalHistory, listPendingApprovals } from "../approvals/approvalService.js";
import { listPurchaseOrders } from "../purchase-orders/purchaseOrderService.js";
import { listPurchaseRequisitions } from "../purchase-requisitions/purchaseRequisitionService.js";
import { listSuppliers } from "../suppliers/supplierService.js";

/**
 * Procurement notifications.
 *
 * Notifications are derived from the real Procurement API (the same services the screens use) and are
 * kept in localStorage under a Procurement-only key. Nothing here is shared with other modules.
 * To move to a backend notification feed, replace `fetchSnapshot` and the load/save functions;
 * the UI only talks to `notificationService`.
 */

export const NOTIFICATION_STORAGE_PREFIX = "procurement.notifications.v1";
export const MAX_STORED_NOTIFICATIONS = 100;
const SOURCE_PAGE_SIZE = 50;

export const NOTIFICATION_TYPES = {
  pendingRequisition: "pending-requisition",
  pendingPoApproval: "pending-po-approval",
  poUpdate: "po-update",
  supplierUpdate: "supplier-update",
  workflowDecision: "workflow-decision",
};

export const NOTIFICATION_PRIORITIES = { high: "High", medium: "Medium", low: "Low" };

const PRIORITY_BY_API_VALUE = {
  high: NOTIFICATION_PRIORITIES.high,
  medium: NOTIFICATION_PRIORITIES.medium,
  low: NOTIFICATION_PRIORITIES.low,
};

/** Each snapshot source feeds one notification type, so a failed source only pauses its own type. */
const SOURCE_TYPES = {
  requisitions: [NOTIFICATION_TYPES.pendingRequisition],
  pendingPoApprovals: [NOTIFICATION_TYPES.pendingPoApproval],
  purchaseOrders: [NOTIFICATION_TYPES.poUpdate],
  suppliers: [NOTIFICATION_TYPES.supplierUpdate],
  approvalHistory: [NOTIFICATION_TYPES.workflowDecision],
};

export function createEmptyState() {
  return { notifications: [], active: {}, occurrences: {} };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeState(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.notifications)) return createEmptyState();
  return {
    notifications: raw.notifications.filter((n) => isPlainObject(n) && typeof n.id === "string"),
    active: isPlainObject(raw.active) ? raw.active : {},
    occurrences: isPlainObject(raw.occurrences) ? raw.occurrences : {},
  };
}

// --- Persistence -----------------------------------------------------------

export function getStorageKey(userId) {
  return userId ? `${NOTIFICATION_STORAGE_PREFIX}:${userId}` : NOTIFICATION_STORAGE_PREFIX;
}

export function loadState(userId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(getStorageKey(userId));
    return raw ? normalizeState(JSON.parse(raw)) : createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function saveState(state, userId, storage = globalThis.localStorage) {
  try {
    storage?.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // Storage can be unavailable or full; notifications then live for the session only.
  }
}

// --- Condition detection (pure) -------------------------------------------

function makeCondition(type, sourceId, fields) {
  return { key: `${type}:${sourceId}`, type, sourceId, ...fields };
}

function priorityFrom(value, fallback = NOTIFICATION_PRIORITIES.medium) {
  return PRIORITY_BY_API_VALUE[value] ?? fallback;
}

/** Only full timestamps are real event times; date-only values fall back to the detection time. */
function eventTime(value) {
  if (typeof value !== "string" || !value.includes("T")) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

function recordRoute(type, id, number) {
  return { route: ROUTES.recordDetail, query: { type, id, number: number ?? "" } };
}

/**
 * Turns a snapshot of Procurement records into the currently unresolved conditions.
 * A source that is `null` (failed to load) contributes nothing.
 * Each condition is identified by `type:sourceId`.
 */
export function detectConditions({
  requisitions,
  pendingPoApprovals,
  purchaseOrders,
  suppliers,
  approvalHistory,
} = {}) {
  const conditions = [];

  for (const pr of requisitions ?? []) {
    if (pr.status !== "pending_approval") continue;
    const summary = pr.itemsSummary ? ` for ${pr.itemsSummary}` : "";
    const requester = pr.requestedBy?.displayName ? ` by ${pr.requestedBy.displayName}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.pendingRequisition, pr.id, {
        title: "Requisition Pending",
        message: `${pr.requisitionNumber}${summary}, requested${requester}, is awaiting approval.`,
        priority: priorityFrom(pr.priority),
        occurredAt: eventTime(pr.requestDate),
        ...recordRoute("purchaseRequisition", pr.id, pr.requisitionNumber),
      }),
    );
  }

  for (const approval of pendingPoApprovals ?? []) {
    if (approval.documentType !== "purchaseOrder") continue;
    const amount = approval.amount ? ` worth ${formatInr(approval.amount)}` : "";
    const requester = approval.requestedBy?.displayName ? ` from ${approval.requestedBy.displayName}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.pendingPoApproval, approval.id, {
        title: "PO Approval Pending",
        message: `${approval.document?.number ?? "Purchase order"}${amount}${requester} needs your approval.`,
        priority: priorityFrom(approval.priority),
        occurredAt: eventTime(approval.submittedAt),
        route: ROUTES.pendingApprovals,
        query: null,
      }),
    );
  }

  for (const po of purchaseOrders ?? []) {
    const supplier = po.supplier?.name ? ` (${po.supplier.name})` : "";
    if (po.status === "partially_received") {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.poUpdate, `${po.id}:${po.status}`, {
          title: "PO Partially Received",
          message: `${po.orderNumber}${supplier} has been partially received; the balance is still outstanding.`,
          priority: NOTIFICATION_PRIORITIES.low,
          occurredAt: null,
          ...recordRoute("purchaseOrder", po.id, po.orderNumber),
        }),
      );
    } else if (po.status === "cancelled") {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.poUpdate, `${po.id}:${po.status}`, {
          title: "PO Cancelled",
          message: `${po.orderNumber}${supplier} was cancelled.`,
          priority: NOTIFICATION_PRIORITIES.medium,
          occurredAt: null,
          ...recordRoute("purchaseOrder", po.id, po.orderNumber),
        }),
      );
    }
  }

  for (const supplier of suppliers ?? []) {
    if (supplier.status !== "inactive") continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.supplierUpdate, supplier.id, {
        title: "Supplier Inactive",
        message: `${supplier.name} (${supplier.code}) is inactive and cannot be used for new orders.`,
        priority: NOTIFICATION_PRIORITIES.low,
        occurredAt: null,
        route: ROUTES.supplierMaster,
        query: null,
      }),
    );
  }

  for (const item of approvalHistory ?? []) {
    const approved = item.decision === "approved";
    const by = item.decidedBy?.displayName ? ` by ${item.decidedBy.displayName}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.workflowDecision, item.id, {
        title: approved ? "Approval Granted" : "Approval Rejected",
        message: `${item.documentTypeLabel} ${item.document?.number ?? ""} was ${approved ? "approved" : "rejected"}${by}.`
          .replace(/\s{2,}/g, " "),
        priority: approved ? NOTIFICATION_PRIORITIES.low : NOTIFICATION_PRIORITIES.high,
        occurredAt: eventTime(item.decidedAt),
        route: ROUTES.approvalHistory,
        query: null,
      }),
    );
  }

  return conditions;
}

// --- Reconciliation of conditions with stored notifications (pure) --------

/**
 * Duplicate prevention:
 *  - `active` maps a condition key to the notification created for it.
 *  - A condition already in `active` never creates another notification, no matter how often this
 *    runs or whether the page was refreshed.
 *  - A condition that disappears is removed from `active` (resolved); if it returns, it gets a new
 *    notification with the next occurrence number.
 *  - `loadedTypes` lists the notification types whose source loaded successfully. Conditions of other
 *    types are left untouched so a failed request is never mistaken for a resolution.
 */
export function reconcileNotifications(state, conditions, { now = new Date(), loadedTypes } = {}) {
  const isLoaded = (type) => !loadedTypes || loadedTypes.includes(type);
  const detectedKeys = new Set(conditions.map((c) => c.key));
  const active = {};
  const occurrences = { ...state.occurrences };
  const created = [];
  let resolvedAny = false;

  for (const [key, id] of Object.entries(state.active)) {
    const type = key.slice(0, key.indexOf(":"));
    if (!isLoaded(type) || detectedKeys.has(key)) active[key] = id;
    else resolvedAny = true;
  }

  for (const condition of conditions) {
    if (active[condition.key]) continue;
    const occurrence = (occurrences[condition.key] ?? 0) + 1;
    occurrences[condition.key] = occurrence;
    const id = occurrence === 1 ? condition.key : `${condition.key}#${occurrence}`;
    active[condition.key] = id;
    const eventDate = condition.occurredAt ? new Date(condition.occurredAt) : now;
    created.push({
      id,
      conditionKey: condition.key,
      type: condition.type,
      sourceId: condition.sourceId,
      module: DEFAULT_MODULE,
      title: condition.title,
      message: condition.message,
      priority: condition.priority,
      route: condition.route,
      query: condition.query ?? null,
      createdAt: (eventDate > now ? now : eventDate).toISOString(),
      read: false,
    });
  }

  if (created.length === 0 && !resolvedAny) return state;

  const notifications = [...created, ...state.notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_STORED_NOTIFICATIONS);
  return { notifications, active, occurrences };
}

export function markAsRead(state, id) {
  if (!state.notifications.some((n) => n.id === id && !n.read)) return state;
  return { ...state, notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) };
}

export function markAllAsRead(state) {
  if (!state.notifications.some((n) => !n.read)) return state;
  return { ...state, notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })) };
}

/**
 * Removes read notifications from the list. Their conditions stay in `active`,
 * so a still-unresolved condition is not announced again.
 */
export function clearRead(state) {
  if (!state.notifications.some((n) => n.read)) return state;
  return { ...state, notifications: state.notifications.filter((n) => !n.read) };
}

export function getUnreadCount(state) {
  return state.notifications.filter((n) => !n.read).length;
}

// --- Modules, categories and tabs -----------------------------------------

export const DEFAULT_MODULE = "procurement";

/** Other ERP modules are listed so the filter is ready for them; they stay disabled until integrated. */
export const NOTIFICATION_MODULES = [
  { key: "all", label: "All modules", available: true },
  { key: "procurement", label: "Procurement", available: true },
  { key: "inventory", label: "Inventory", available: false },
];

export const NOTIFICATION_CATEGORIES = {
  [NOTIFICATION_TYPES.pendingRequisition]: "Requisition",
  [NOTIFICATION_TYPES.pendingPoApproval]: "Approval",
  [NOTIFICATION_TYPES.poUpdate]: "Purchase Order",
  [NOTIFICATION_TYPES.supplierUpdate]: "Supplier",
  [NOTIFICATION_TYPES.workflowDecision]: "Workflow",
};

/**
 * Tabs are views over real notifications, never separate data:
 *  Focus     - High priority
 *  Others    - everything below High priority
 *  Watching  - status changes on orders and suppliers
 *  @Mention  - items waiting for your action (requisitions and PO approvals)
 */
export const NOTIFICATION_TABS = [
  { key: "all", label: "All", matches: () => true },
  { key: "focus", label: "Focus", matches: (n) => n.priority === NOTIFICATION_PRIORITIES.high },
  { key: "others", label: "Others", matches: (n) => n.priority !== NOTIFICATION_PRIORITIES.high },
  {
    key: "watching",
    label: "Watching",
    matches: (n) => n.type === NOTIFICATION_TYPES.poUpdate || n.type === NOTIFICATION_TYPES.supplierUpdate,
  },
  {
    key: "mention",
    label: "@Mention",
    matches: (n) =>
      n.type === NOTIFICATION_TYPES.pendingRequisition || n.type === NOTIFICATION_TYPES.pendingPoApproval,
  },
];

export function getNotificationModule(notification) {
  return notification.module ?? DEFAULT_MODULE;
}

export function getNotificationCategory(notification) {
  return NOTIFICATION_CATEGORIES[notification.type] ?? "Procurement";
}

export function filterNotifications(notifications, { tab = "all", module = "all", unreadOnly = false } = {}) {
  const tabMatches = NOTIFICATION_TABS.find((t) => t.key === tab)?.matches ?? (() => true);
  return notifications.filter(
    (n) =>
      tabMatches(n) &&
      (module === "all" || getNotificationModule(n) === module) &&
      (!unreadOnly || !n.read),
  );
}

// --- Date grouping and relative time --------------------------------------

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const DATE_GROUPS = ["Today", "Yesterday", "Earlier this week", "Older"];

/** Buckets by the user's local calendar day: today, yesterday, previous 5 days, then older. */
export function getDateGroup(isoDate, now = new Date()) {
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(new Date(isoDate))) / 86400000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff <= 6) return "Earlier this week";
  return "Older";
}

export function groupByDate(notifications, now = new Date()) {
  return DATE_GROUPS.map((label) => ({
    label,
    items: notifications.filter((n) => getDateGroup(n.createdAt, now) === label),
  })).filter((group) => group.items.length > 0);
}

/** Compact relative time: "now", "2m", "1h", "1d", "2w". */
export function formatRelativeTime(isoDate, now = new Date()) {
  const seconds = Math.floor((now.getTime() - new Date(isoDate).getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

// --- Data source -----------------------------------------------------------

/**
 * Loads the records notifications are derived from. Each source fails independently: a failed
 * source is `null` and its types are left out of `loadedTypes`.
 */
export async function fetchSnapshot(signal) {
  const sources = {
    requisitions: () => listPurchaseRequisitions({ page: 1, pageSize: SOURCE_PAGE_SIZE, status: "pending_approval" }, signal),
    pendingPoApprovals: () =>
      listPendingApprovals({ page: 1, pageSize: SOURCE_PAGE_SIZE, documentType: "purchaseOrder" }, signal),
    purchaseOrders: () => listPurchaseOrders({ page: 1, pageSize: SOURCE_PAGE_SIZE }, signal),
    suppliers: () => listSuppliers({ page: 1, pageSize: SOURCE_PAGE_SIZE, status: "inactive" }, signal),
    approvalHistory: () =>
      listApprovalHistory({ page: 1, pageSize: 20, dateRange: "last_30_days" }, signal),
  };
  const names = Object.keys(sources);
  const results = await Promise.allSettled(names.map((name) => sources[name]()));

  const snapshot = {};
  const loadedTypes = [];
  names.forEach((name, index) => {
    const result = results[index];
    if (result.status === "fulfilled" && Array.isArray(result.value?.items)) {
      snapshot[name] = result.value.items;
      loadedTypes.push(...SOURCE_TYPES[name]);
    } else {
      snapshot[name] = null;
    }
  });
  return { snapshot, loadedTypes };
}

export const notificationService = {
  load: loadState,
  save: saveState,
  fetchSnapshot,
  detectConditions,
  reconcile: reconcileNotifications,
  markAsRead,
  markAllAsRead,
  clearRead,
  getUnreadCount,
};
