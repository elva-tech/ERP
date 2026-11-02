import { ROUTES } from "../../../config/navigation.js";
import { deliveryNoteService } from "../../delivery-notes/services/deliveryNoteService.js";
import { inwardService } from "../../inward/services/inwardService.js";
import { itemService } from "../../items/services/itemService.js";
import { reconciliationService } from "../../reconciliation/services/reconciliationService.js";

export const NOTIFICATION_STORAGE_KEY = "inventory.notifications.v1";
export const MAX_STORED_NOTIFICATIONS = 100;

export const NOTIFICATION_TYPES = {
  lowStock: "low-stock",
  outOfStock: "out-of-stock",
  pendingGrn: "pending-grn",
  pendingDeliveryNote: "pending-delivery-note",
  stockDiscrepancy: "stock-discrepancy",
};

export const NOTIFICATION_PRIORITIES = { high: "High", medium: "Medium", low: "Low" };

const PENDING_GRN_STATUSES = ["quality check", "draft", "pending"];
const PENDING_DELIVERY_NOTE_STATUSES = ["pending"];

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

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(NOTIFICATION_STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable or full; notifications then live for the session only.
  }
}

// --- Condition detection (pure) -------------------------------------------

function makeCondition(type, sourceId, fields) {
  return { key: `${type}:${sourceId}`, type, sourceId, ...fields };
}

/**
 * Turns a snapshot of inventory records into the list of conditions that are
 * currently unresolved. Each condition is identified by `type:sourceId`.
 */
export function detectConditions({ items = [], inwardEntries = [], deliveryNotes = [], reconciliations = [] } = {}) {
  const conditions = [];

  for (const item of items) {
    const stock = Number(item.currentStock);
    const reorderLevel = Number(item.reorderLevel);
    if (!Number.isFinite(stock)) continue;
    const label = `${item.itemName} (${item.itemCode})`;
    const unit = item.unit ? ` ${item.unit}` : "";

    if (stock <= 0) {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.outOfStock, item.id, {
          title: "Out of Stock",
          message: `${label} is out of stock.`,
          priority: NOTIFICATION_PRIORITIES.high,
          route: ROUTES.itemMaster,
        }),
      );
    } else if (Number.isFinite(reorderLevel) && stock < reorderLevel) {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.lowStock, item.id, {
          title: "Low Stock Alert",
          message: `${label} has ${stock}${unit} left, below the reorder level of ${reorderLevel}.`,
          priority: stock <= reorderLevel / 2 ? NOTIFICATION_PRIORITIES.high : NOTIFICATION_PRIORITIES.medium,
          route: ROUTES.itemMaster,
        }),
      );
    }
  }

  for (const entry of inwardEntries) {
    if (!PENDING_GRN_STATUSES.includes(String(entry.status).toLowerCase())) continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.pendingGrn, entry.id, {
        title: "Pending GRN",
        message: `${entry.grnNo} from ${entry.supplier} is pending (${entry.status}).`,
        priority: NOTIFICATION_PRIORITIES.medium,
        route: ROUTES.inward,
      }),
    );
  }

  for (const note of deliveryNotes) {
    if (!PENDING_DELIVERY_NOTE_STATUSES.includes(String(note.status).toLowerCase())) continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.pendingDeliveryNote, note.id, {
        title: "Pending Delivery Note",
        message: `${note.dnNo} for ${note.customer} is awaiting dispatch.`,
        priority: NOTIFICATION_PRIORITIES.medium,
        route: ROUTES.deliveryNote,
      }),
    );
  }

  for (const record of reconciliations) {
    if (String(record.status).toLowerCase() !== "discrepancy") continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.stockDiscrepancy, record.id, {
        title: "Stock Discrepancy",
        message: `${record.itemName} (${record.itemCode}) at ${record.warehouseName}: system ${record.systemQty}, physical ${record.physicalQty} (variance ${record.variance}).`,
        priority: NOTIFICATION_PRIORITIES.high,
        route: ROUTES.stockReconciliation,
      }),
    );
  }

  return conditions;
}

// --- Reconciliation of conditions with stored notifications (pure) --------

/**
 * Duplicate prevention:
 *  - `active` maps a condition key to the notification created for it.
 *  - A condition already in `active` never creates another notification, no
 *    matter how often this runs or whether the page was refreshed.
 *  - A condition that disappears is removed from `active` (resolved); if it
 *    returns, it gets a new notification with the next occurrence number.
 */
export function reconcileNotifications(state, conditions, now = new Date()) {
  const detectedKeys = new Set(conditions.map((c) => c.key));
  const active = {};
  const occurrences = { ...state.occurrences };
  const created = [];

  for (const condition of conditions) {
    if (state.active[condition.key]) {
      active[condition.key] = state.active[condition.key];
      continue;
    }
    const occurrence = (occurrences[condition.key] ?? 0) + 1;
    occurrences[condition.key] = occurrence;
    const id = occurrence === 1 ? condition.key : `${condition.key}#${occurrence}`;
    active[condition.key] = id;
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
      createdAt: now.toISOString(),
      read: false,
    });
  }

  const resolvedAny = Object.keys(state.active).some((key) => !detectedKeys.has(key));
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

export const NOTIFICATION_MODULES = [
  { key: "all", label: "All modules", available: true },
  { key: "inventory", label: "Inventory", available: true },
  { key: "procurement", label: "Procurement", available: false },
];

export const DEFAULT_MODULE = "inventory";

export const NOTIFICATION_CATEGORIES = {
  [NOTIFICATION_TYPES.lowStock]: "Stock",
  [NOTIFICATION_TYPES.outOfStock]: "Stock",
  [NOTIFICATION_TYPES.pendingGrn]: "Inward",
  [NOTIFICATION_TYPES.pendingDeliveryNote]: "Delivery",
  [NOTIFICATION_TYPES.stockDiscrepancy]: "Reconciliation",
};

/**
 * Tabs are views over real notifications, never separate data:
 *  Focus     - High priority alerts
 *  Others    - everything below High priority
 *  Watching  - stock levels (low stock and out of stock)
 *  @Mention  - documents waiting on you (pending GRNs and delivery notes)
 */
export const NOTIFICATION_TABS = [
  { key: "all", label: "All", matches: () => true },
  { key: "focus", label: "Focus", matches: (n) => n.priority === NOTIFICATION_PRIORITIES.high },
  { key: "others", label: "Others", matches: (n) => n.priority !== NOTIFICATION_PRIORITIES.high },
  {
    key: "watching",
    label: "Watching",
    matches: (n) => n.type === NOTIFICATION_TYPES.lowStock || n.type === NOTIFICATION_TYPES.outOfStock,
  },
  {
    key: "mention",
    label: "@Mention",
    matches: (n) => n.type === NOTIFICATION_TYPES.pendingGrn || n.type === NOTIFICATION_TYPES.pendingDeliveryNote,
  },
];

export function getNotificationModule(notification) {
  return notification.module ?? DEFAULT_MODULE;
}

export function getNotificationCategory(notification) {
  return NOTIFICATION_CATEGORIES[notification.type] ?? "Inventory";
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
 * Loads the records notifications are derived from. This is the only place
 * that talks to the API, so a backend notifications endpoint can replace it
 * (and the persistence functions above) without touching the UI.
 */
export async function fetchSnapshot(signal) {
  const [items, inward, deliveryNotes, reconciliations] = await Promise.all([
    itemService.getItems({ limit: 1000 }, signal),
    inwardService.getInwardEntries({}, signal),
    deliveryNoteService.getDeliveryNotes({}, signal),
    reconciliationService.getReconciliations({}, signal),
  ]);
  return {
    items: items?.data ?? [],
    inwardEntries: inward?.data ?? [],
    deliveryNotes: deliveryNotes?.data ?? [],
    reconciliations: reconciliations?.data ?? [],
  };
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
  filter: filterNotifications,
  groupByDate,
};
