import { ROUTES } from "../../config/navigation.js";
import { normalizePage } from "../../lib/apiTypes.js";
import { formatInr } from "../../lib/formatters.js";
import { listApprovalHistory, listPendingApprovals } from "../approvals/approvalService.js";
import { listPurchaseInvoices } from "../purchase-invoices/purchaseInvoiceService.js";
import { listPurchaseOrders } from "../purchase-orders/purchaseOrderService.js";
import { listPurchaseRequisitions } from "../purchase-requisitions/purchaseRequisitionService.js";
import { listPurchaseReturns } from "../purchase-returns/purchaseReturnService.js";
import { listSubcontractAgreements } from "../subcontract-agreements/subcontractAgreementService.js";
import { listSubcontractBills } from "../subcontract-bills/subcontractBillService.js";

/**
 * Procurement notifications.
 *
 * Derived from the same list APIs as the screens; persisted per user in localStorage.
 * Backend feed: replace `fetchSnapshot` and load/save; UI uses `notificationService` only.
 */

export const NOTIFICATION_STORAGE_PREFIX = "procurement.notifications.v1";
export const MAX_STORED_NOTIFICATIONS = 100;
const SOURCE_PAGE_SIZE = 50;

export const NOTIFICATION_TYPES = {
  pendingRequisition: "pending-requisition",
  requisitionUpdate: "requisition-update",
  pendingPoApproval: "pending-po-approval",
  poUpdate: "po-update",
  invoiceException: "invoice-exception",
  returnUpdate: "return-update",
  agreementUpdate: "agreement-update",
  subcontractBillUpdate: "subcontract-bill-update",
};

export const NOTIFICATION_PRIORITIES = { high: "High", medium: "Medium", low: "Low" };

const PRIORITY_BY_API_VALUE = {
  high: NOTIFICATION_PRIORITIES.high,
  medium: NOTIFICATION_PRIORITIES.medium,
  low: NOTIFICATION_PRIORITIES.low,
};

const SOURCE_TYPES = {
  requisitions: [NOTIFICATION_TYPES.pendingRequisition],
  pendingPoApprovals: [NOTIFICATION_TYPES.pendingPoApproval],
  purchaseOrders: [NOTIFICATION_TYPES.poUpdate],
  approvalHistory: [NOTIFICATION_TYPES.requisitionUpdate, NOTIFICATION_TYPES.poUpdate],
  purchaseInvoices: [NOTIFICATION_TYPES.invoiceException],
  purchaseReturns: [NOTIFICATION_TYPES.returnUpdate],
  subcontractAgreements: [NOTIFICATION_TYPES.agreementUpdate],
  subcontractBills: [NOTIFICATION_TYPES.subcontractBillUpdate],
};

const KNOWN_TYPES = new Set(Object.values(NOTIFICATION_TYPES));

export function createEmptyState() {
  return { notifications: [], active: {}, occurrences: {} };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeOfKey(key) {
  return key.slice(0, key.indexOf(":"));
}

function normalizeState(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.notifications)) return createEmptyState();
  const pickKnown = (value) =>
    isPlainObject(value)
      ? Object.fromEntries(Object.entries(value).filter(([key]) => KNOWN_TYPES.has(typeOfKey(key))))
      : {};
  return {
    notifications: raw.notifications.filter(
      (n) => isPlainObject(n) && typeof n.id === "string" && KNOWN_TYPES.has(n.type),
    ),
    active: pickKnown(raw.active),
    occurrences: pickKnown(raw.occurrences),
  };
}

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

function makeCondition(type, sourceId, fields) {
  return { key: `${type}:${sourceId}`, type, sourceId, ...fields };
}

function priorityFrom(value, fallback = NOTIFICATION_PRIORITIES.medium) {
  return PRIORITY_BY_API_VALUE[value] ?? fallback;
}

function eventTime(value) {
  if (typeof value !== "string" || !value.includes("T")) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

function recordRoute(type, id, number) {
  return { route: ROUTES.recordDetail, query: { type, id, number: number ?? "" } };
}

function listRoute(route) {
  return { route, query: null };
}

const DECISION_LABELS = { approved: "Approved", rejected: "Rejected", returned: "Returned" };
const DECISION_PRIORITIES = {
  approved: NOTIFICATION_PRIORITIES.low,
  rejected: NOTIFICATION_PRIORITIES.high,
  returned: NOTIFICATION_PRIORITIES.medium,
};

function isInvoiceException(invoice) {
  const flags = [invoice.matchStatus, invoice.status, invoice.exceptionStatus];
  return (
    invoice.hasMismatch === true ||
    invoice.hasException === true ||
    (Array.isArray(invoice.exceptions) && invoice.exceptions.length > 0) ||
    flags.some((value) => value === "mismatch" || value === "exception")
  );
}

const RETURN_UPDATES = {
  pending_approval: {
    title: "Purchase Return Awaiting Approval",
    verb: "is awaiting approval",
    priority: NOTIFICATION_PRIORITIES.medium,
  },
  rejected: { title: "Purchase Return Rejected", verb: "was rejected", priority: NOTIFICATION_PRIORITIES.high },
  credit_note_issued: {
    title: "Purchase Return Approved",
    verb: "was approved and a credit note was issued",
    priority: NOTIFICATION_PRIORITIES.low,
  },
};

const AGREEMENT_UPDATES = {
  active: { title: "Subcontract Agreement Active", verb: "is now active", priority: NOTIFICATION_PRIORITIES.low },
  completed: {
    title: "Subcontract Agreement Completed",
    verb: "was marked completed",
    priority: NOTIFICATION_PRIORITIES.low,
  },
  expired: {
    title: "Subcontract Agreement Expired",
    verb: "has expired",
    priority: NOTIFICATION_PRIORITIES.high,
  },
};

const BILL_UPDATES = {
  submitted: {
    title: "Subcontract Bill Needs Review",
    verb: "was submitted and needs review",
    priority: NOTIFICATION_PRIORITIES.medium,
  },
  verified: {
    title: "Subcontract Bill Verified",
    verb: "was verified and awaits approval",
    priority: NOTIFICATION_PRIORITIES.medium,
  },
  approved: { title: "Subcontract Bill Approved", verb: "was approved", priority: NOTIFICATION_PRIORITIES.low },
};

export function detectConditions({
  requisitions,
  pendingPoApprovals,
  purchaseOrders,
  approvalHistory,
  purchaseInvoices,
  purchaseReturns,
  subcontractAgreements,
  subcontractBills,
} = {}) {
  const conditions = [];

  for (const pr of requisitions ?? []) {
    if (pr.status !== "pending_approval") continue;
    const summary = pr.itemsSummary ? ` for ${pr.itemsSummary}` : "";
    const requester = pr.requestedBy?.displayName ? ` by ${pr.requestedBy.displayName}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.pendingRequisition, pr.id, {
        title: "Requisition Pending Approval",
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
        ...listRoute(ROUTES.pendingApprovals),
      }),
    );
  }

  for (const item of approvalHistory ?? []) {
    const label = DECISION_LABELS[item.decision];
    if (!label) continue;
    const number = item.document?.number ?? "";
    const by = item.decidedBy?.displayName ? ` by ${item.decidedBy.displayName}` : "";
    const message = `${number} was ${item.decision}${by}.`.trim();
    const decidedAt = eventTime(item.decidedAt);
    const priority = DECISION_PRIORITIES[item.decision];

    if (item.documentType === "purchaseRequisition") {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.requisitionUpdate, item.id, {
          title: `Requisition ${label}`,
          message: number ? `Requisition ${message}` : `A requisition was ${item.decision}${by}.`,
          priority,
          occurredAt: decidedAt,
          ...(item.document?.id
            ? recordRoute("purchaseRequisition", item.document.id, number)
            : listRoute(ROUTES.purchaseRequisitions)),
        }),
      );
    } else if (item.documentType === "purchaseOrder") {
      conditions.push(
        makeCondition(NOTIFICATION_TYPES.poUpdate, `approval:${item.id}`, {
          title: `PO Approval ${label}`,
          message: number ? `Purchase order ${message}` : `A purchase order was ${item.decision}${by}.`,
          priority,
          occurredAt: decidedAt,
          ...(item.document?.id
            ? recordRoute("purchaseOrder", item.document.id, number)
            : listRoute(ROUTES.purchaseOrders)),
        }),
      );
    }
  }

  for (const po of purchaseOrders ?? []) {
    if (po.status !== "sent") continue;
    const supplier = po.supplier?.name ? ` to ${po.supplier.name}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.poUpdate, `issued:${po.id}`, {
        title: "PO Issued",
        message: `${po.orderNumber} was issued${supplier}.`,
        priority: NOTIFICATION_PRIORITIES.low,
        occurredAt: null,
        ...recordRoute("purchaseOrder", po.id, po.orderNumber),
      }),
    );
  }

  for (const invoice of purchaseInvoices ?? []) {
    if (!isInvoiceException(invoice)) continue;
    const supplier = invoice.supplier?.name ? ` from ${invoice.supplier.name}` : "";
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.invoiceException, invoice.id, {
        title: "Invoice Mismatch",
        message: `${invoice.invoiceNumber}${supplier} has a mismatch or exception that needs review.`,
        priority: NOTIFICATION_PRIORITIES.high,
        occurredAt: eventTime(invoice.updatedAt),
        ...recordRoute("purchaseInvoice", invoice.id, invoice.invoiceNumber),
      }),
    );
  }

  for (const item of purchaseReturns ?? []) {
    const update = RETURN_UPDATES[item.status];
    if (!update) continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.returnUpdate, `${item.id}:${item.status}`, {
        title: update.title,
        message: `${item.returnNumber} ${update.verb}.`,
        priority: update.priority,
        occurredAt: eventTime(item.updatedAt),
        ...listRoute(ROUTES.purchaseReturns),
      }),
    );
  }

  for (const agreement of subcontractAgreements ?? []) {
    const update = AGREEMENT_UPDATES[agreement.status];
    if (!update) continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.agreementUpdate, `${agreement.id}:${agreement.status}`, {
        title: update.title,
        message: `${agreement.agreementNumber} ${update.verb}.`,
        priority: update.priority,
        occurredAt: eventTime(agreement.updatedAt),
        ...recordRoute("subcontractAgreement", agreement.id, agreement.agreementNumber),
      }),
    );
  }

  for (const bill of subcontractBills ?? []) {
    const update = BILL_UPDATES[bill.status];
    if (!update) continue;
    conditions.push(
      makeCondition(NOTIFICATION_TYPES.subcontractBillUpdate, `${bill.id}:${bill.status}`, {
        title: update.title,
        message: `${bill.billNumber} ${update.verb}.`,
        priority: update.priority,
        occurredAt: eventTime(bill.updatedAt),
        ...listRoute(ROUTES.subcontractBills),
      }),
    );
  }

  return conditions;
}

export function reconcileNotifications(state, conditions, { now = new Date(), loadedTypes } = {}) {
  const isLoaded = (type) => !loadedTypes || loadedTypes.includes(type);
  const detectedKeys = new Set(conditions.map((c) => c.key));
  const active = {};
  const occurrences = { ...state.occurrences };
  const created = [];
  let resolvedAny = false;

  for (const [key, id] of Object.entries(state.active)) {
    if (!isLoaded(typeOfKey(key)) || detectedKeys.has(key)) active[key] = id;
    else resolvedAny = true;
  }

  for (const condition of conditions) {
    if (!isLoaded(condition.type)) continue;
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

export function getUnreadCount(state) {
  return state.notifications.filter((n) => !n.read).length;
}

export function filterNotifications(notifications, { unreadOnly = false } = {}) {
  return unreadOnly ? notifications.filter((n) => !n.read) : notifications;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const DATE_GROUPS = ["Today", "Yesterday", "Earlier this week", "Older"];

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

/** Fetches every page for a paginated list API (uses existing pagination contract). */
async function fetchAllPages(listFn, query, signal) {
  const pageSize = SOURCE_PAGE_SIZE;
  const first = await listFn({ ...query, page: 1, pageSize }, signal);
  if (signal?.aborted) return null;
  const normalized = normalizePage(first);
  const items = [...normalized.items];
  for (let page = 2; page <= normalized.pagination.totalPages; page += 1) {
    const next = await listFn({ ...query, page, pageSize }, signal);
    if (signal?.aborted) return null;
    items.push(...normalizePage(next).items);
  }
  return items;
}

export async function fetchSnapshot(signal) {
  const sources = {
    requisitions: () => fetchAllPages(listPurchaseRequisitions, { status: "pending_approval" }, signal),
    pendingPoApprovals: () => fetchAllPages(listPendingApprovals, { documentType: "purchaseOrder" }, signal),
    purchaseOrders: () => fetchAllPages(listPurchaseOrders, { status: "sent" }, signal),
    approvalHistory: () => fetchAllPages(listApprovalHistory, { dateRange: "last_30_days" }, signal),
    purchaseInvoices: () => fetchAllPages(listPurchaseInvoices, {}, signal),
    purchaseReturns: () => fetchAllPages(listPurchaseReturns, {}, signal),
    subcontractAgreements: () => fetchAllPages(listSubcontractAgreements, {}, signal),
    subcontractBills: () => fetchAllPages(listSubcontractBills, {}, signal),
  };
  const names = Object.keys(sources);
  const results = await Promise.allSettled(names.map((name) => sources[name]()));

  const snapshot = {};
  const loadedSources = new Set();
  names.forEach((name, index) => {
    const result = results[index];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      snapshot[name] = result.value;
      loadedSources.add(name);
    } else {
      snapshot[name] = null;
    }
  });

  const loadedTypes = [...KNOWN_TYPES].filter((type) => {
    const feeding = names.filter((name) => SOURCE_TYPES[name].includes(type));
    return feeding.length > 0 && feeding.every((name) => loadedSources.has(name));
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
  getUnreadCount,
};