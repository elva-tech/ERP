// DEMO ONLY. In-memory implementation of the endpoints the Procurement frontend calls
// (src/features/**/*Service.js). Writes live in memory and are lost on restart or reset.
import { Buffer } from "node:buffer";
import {
  DEMO_RULES,
  DEMO_TODAY,
  DEPARTMENTS,
  FINANCIAL_YEAR,
  PAYMENT_SCHEDULES,
  PAYMENT_TERMS,
  PERFORMANCE_PERIODS,
  PROJECTS,
  REPORT_DEFINITIONS,
  REPORTING_PERIODS,
  RETURN_REASONS,
  SUPPLIER_CATEGORIES,
  TRADE_SPECIALTIES,
  UNITS,
  USERS,
} from "../data/catalog.mjs";
import { addDays, at, createDemoState, pad } from "../data/seed.mjs";
import { buildPdf, buildXlsx, toTextTable } from "./files.mjs";

const JSON_TYPE = "application/json; charset=utf-8";
const PDF_TYPE = "application/pdf";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const REPORT_READY_DELAY_MS = 4000;
/** Fictional demo sign-in. Not a real account; only the demo API accepts it. */
const DEMO_LOGINS = ["demo", "demo@elva.example"];
const DEMO_PASSWORD = "demo123";

const NAVIGATION_KEYS = [
  "dashboard", "supplierMaster", "supplierLedger", "supplierPerformance", "purchaseRequisitions", "purchaseOrders",
  "purchaseInvoices", "purchaseReturns", "purchaseReports", "subcontractors", "subcontractAgreements",
  "subcontractBills", "pendingApprovals", "approvalHistory", "spendAnalysis",
];

const DOCUMENT_TYPE_LABELS = {
  purchaseRequisition: "Purchase Requisition",
  purchaseOrder: "Purchase Order",
  subcontractBill: "Subcontract Bill",
  purchaseInvoice: "Purchase Invoice",
};

const PERIOD_RANGES = {
  "rp-2026-10": { from: "2026-10-01", to: "2026-10-31", slug: "October_2026" },
  "rp-2026-09": { from: "2026-09-01", to: "2026-09-30", slug: "September_2026" },
  "rp-q2": { from: "2026-07-01", to: "2026-09-30", slug: "Q2_FY_2026-27" },
  "rp-fy": { from: FINANCIAL_YEAR.start, to: DEMO_TODAY, slug: "FY_2026-27_YTD" },
};

class DemoHttpError extends Error {
  constructor(status, code, message, fieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const notFound = (what) => new DemoHttpError(404, "not_found", `${what} was not found in the demo data.`);
const conflict = (message) => new DemoHttpError(409, "conflict", message);

/** Collects field errors; throws one 422 with all of them. Demo validation only, not confirmed business rules. */
function createValidator() {
  const fieldErrors = {};
  return {
    add(field, message) {
      (fieldErrors[field] ??= []).push(message);
    },
    throwIfAny() {
      if (Object.keys(fieldErrors).length > 0) {
        throw new DemoHttpError(422, "validation_failed", "Some fields need attention (demo validation).", fieldErrors);
      }
    },
  };
}

// ---------- value helpers ----------
const money = (paise) => {
  const rounded = Math.round(paise);
  const abs = Math.abs(rounded);
  return `${rounded < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
};
const rupeesNumber = (paise) => Math.round(paise) / 100;
const percent1 = (value) => (Math.round(value * 10) / 10).toFixed(1);
const qtyText = (quantity) => String(Number(Number(quantity).toFixed(3)));
const blank = (value) => String(value ?? "").trim() === "";
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) && !Number.isNaN(Date.parse(value));
const isMoney = (value) => /^\d+(\.\d{1,2})?$/.test(String(value ?? "").trim());
const isPositiveDecimal = (value) => /^\d+(\.\d+)?$/.test(String(value ?? "").trim()) && Number(value) > 0;
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
const toPaise = (value) => Math.round(Number(value) * 100);
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
const nameOf = (list, id) => list.find((entry) => entry.id === id)?.name ?? null;
const options = (list) => list.map((entry) => ({ value: entry.id, label: entry.name }));
const nextNumber = (list, field, pattern) =>
  list.reduce((max, record) => Math.max(max, Number(pattern.exec(record[field])?.[1] ?? 0)), 0) + 1;

function paginate(items, query, defaultPageSize = 8) {
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.get("pageSize") ?? "", 10) || defaultPageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(query.get("page") ?? "", 10) || 1));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, totalItems, totalPages },
  };
}

/** Largest-remainder rounding so shares add up to exactly 100.0. */
function shares(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => "0.0");
  const raw = values.map((value) => (value / total) * 1000);
  const floors = raw.map(Math.floor);
  let remainder = 1000 - floors.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remainder > 0) {
        floors[index] += 1;
        remainder -= 1;
      }
    });
  return floors.map((value) => (value / 10).toFixed(1));
}

export function createDemoApi({ latencyMs = 250 } = {}) {
  let state = createDemoState();

  // ---------- lookups into state ----------
  const supplier = (id) => state.suppliers.find((s) => s.id === id);
  const purchaseOrder = (id) => state.purchaseOrders.find((po) => po.id === id);
  const requisition = (id) => state.requisitions.find((pr) => pr.id === id);
  const subcontractor = (id) => state.subcontractors.find((sc) => sc.id === id);
  const agreement = (id) => state.agreements.find((a) => a.id === id);
  const subcontractOrder = (id) => state.subcontractOrders.find((o) => o.id === id);
  const unitName = (id) => nameOf(UNITS, id);
  const party = (record) => (record ? { id: record.id, name: record.name } : null);

  // ---------- calculations a backend would own ----------
  const poSubtotal = (po) => po.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPricePaise), 0);
  const withGst = (paise) => paise + Math.round((paise * DEMO_RULES.gstRatePercent) / 100);
  const poTotal = (po) => withGst(poSubtotal(po));
  const countsAsSpend = (po) => po.status !== "draft" && po.status !== "cancelled";

  function itemsSummary(lines) {
    if (lines.length === 0) return null;
    const [first] = lines;
    const unit = unitName(first.unitId);
    const head = `${first.description} (${qtyText(first.quantity)}${unit ? ` ${unit}` : ""})`;
    return lines.length > 1 ? `${head} + ${lines.length - 1} more` : head;
  }

  /** `outstanding` is the ledger view (TDS counts as settled once deducted); `balanceDue` is what is left to pay. */
  function invoiceFigures(invoice) {
    const tax = Math.round((invoice.taxablePaise * invoice.taxRatePercent) / 100);
    const amount = invoice.taxablePaise + tax;
    const tds = Math.round((invoice.taxablePaise * DEMO_RULES.tdsRatePercent) / 100);
    const net = amount - tds;
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    const tdsDeducted = paid > 0 ? tds : 0;
    const outstanding = amount - tdsDeducted - paid;
    return { tax, amount, tds, net, paid, tdsDeducted, outstanding, balanceDue: net - paid };
  }

  function returnAmount(ret) {
    const po = purchaseOrder(ret.purchaseOrderId);
    const subtotal = ret.lines.reduce((sum, line) => {
      const poLine = po.lines.find((l) => l.lineId === line.lineId);
      return sum + Math.round(line.quantity * poLine.unitPricePaise);
    }, 0);
    return withGst(subtotal);
  }

  function returnedQuantity(po, lineId) {
    return state.purchaseReturns
      .filter((ret) => ret.purchaseOrderId === po.id && ret.status !== "rejected")
      .flatMap((ret) => ret.lines)
      .filter((line) => line.lineId === lineId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  const receivedQuantity = (po, line) =>
    Math.round(
      po.receipts.flatMap((receipt) => receipt.lines).filter((l) => l.lineId === line.lineId).reduce((sum, l) => sum + l.quantity, 0) * 1000,
    ) / 1000;
  const remainingQuantity = (po, line) => Math.max(0, Math.round((line.quantity - receivedQuantity(po, line)) * 1000) / 1000);

  /** Ledger postings for one supplier, oldest first. Credits raise the amount owed to the supplier. */
  function ledgerPostings(supplierId) {
    const postings = [];
    for (const invoice of state.invoices.filter((i) => i.supplierId === supplierId)) {
      const figures = invoiceFigures(invoice);
      const po = purchaseOrder(invoice.purchaseOrderId);
      postings.push({
        id: `${invoice.id}-booking`,
        date: invoice.invoiceDate,
        order: 1,
        voucherNumber: invoice.invoiceNumber,
        voucherType: "purchase",
        voucherTypeLabel: "Purchase",
        description: `Purchase invoice against ${po.orderNumber}`,
        credit: figures.amount,
        debit: 0,
        sourceDocument: { type: "purchaseInvoice", id: invoice.id },
      });
      if (invoice.payments.length > 0) {
        postings.push({
          id: `${invoice.id}-tds`,
          date: invoice.payments[0].paymentDate,
          order: 2,
          voucherNumber: invoice.tdsVoucher,
          voucherType: "journal",
          voucherTypeLabel: "TDS",
          description: `TDS @ ${DEMO_RULES.tdsRatePercent}% (demo rate) on ${invoice.invoiceNumber}`,
          credit: 0,
          debit: figures.tdsDeducted,
          sourceDocument: null,
        });
      }
      for (const payment of invoice.payments) {
        postings.push({
          id: `${invoice.id}-${payment.id}`,
          date: payment.paymentDate,
          order: 3,
          voucherNumber: payment.voucherNumber,
          voucherType: "payment",
          voucherTypeLabel: "Payment",
          description: `Payment against ${invoice.invoiceNumber} (ref ${payment.transactionId})`,
          credit: 0,
          debit: payment.amountPaise,
          sourceDocument: null,
        });
      }
    }
    for (const ret of state.purchaseReturns.filter((r) => r.supplierId === supplierId && r.debitNoteNumber)) {
      postings.push({
        id: `${ret.id}-debit-note`,
        date: ret.debitNoteDate,
        order: 4,
        voucherNumber: ret.debitNoteNumber,
        voucherType: "debit_note",
        voucherTypeLabel: "Debit Note",
        description: `Debit note for purchase return ${ret.returnNumber}`,
        credit: 0,
        debit: returnAmount(ret),
        sourceDocument: { type: "purchaseReturn", id: ret.id },
      });
    }
    return postings.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  }

  function ledgerEntryJson(posting, balance) {
    return {
      id: posting.id,
      documentDate: posting.date,
      voucherNumber: posting.voucherNumber,
      voucherType: posting.voucherType,
      voucherTypeLabel: posting.voucherTypeLabel,
      description: posting.description,
      debitAmount: posting.debit ? money(posting.debit) : null,
      creditAmount: posting.credit ? money(posting.credit) : null,
      runningBalance: money(Math.abs(balance)),
      runningBalanceSide: balance >= 0 ? "cr" : "dr",
      sourceDocument: posting.sourceDocument,
    };
  }

  function openingEntryJson(record) {
    return {
      id: `${record.id}-opening`,
      documentDate: FINANCIAL_YEAR.start,
      voucherNumber: "OPENING",
      voucherType: "opening",
      voucherTypeLabel: "Opening",
      description: "Opening balance brought forward",
      debitAmount: null,
      creditAmount: record.openingBalancePaise ? money(record.openingBalancePaise) : null,
      runningBalance: money(Math.abs(record.openingBalancePaise)),
      runningBalanceSide: "cr",
      sourceDocument: null,
    };
  }

  function supplierClosingBalance(record) {
    return ledgerPostings(record.id).reduce((balance, p) => balance + p.credit - p.debit, record.openingBalancePaise);
  }

  function agingFor(record) {
    const buckets = { b0: 0, b31: 0, b61: 0, b90: record.openingBalancePaise };
    for (const invoice of state.invoices.filter((i) => i.supplierId === record.id)) {
      const { outstanding } = invoiceFigures(invoice);
      if (outstanding <= 0) continue;
      const age = daysBetween(invoice.invoiceDate, DEMO_TODAY);
      if (age <= 30) buckets.b0 += outstanding;
      else if (age <= 60) buckets.b31 += outstanding;
      else if (age <= 90) buckets.b61 += outstanding;
      else buckets.b90 += outstanding;
    }
    let credits = state.purchaseReturns
      .filter((r) => r.supplierId === record.id && r.debitNoteNumber)
      .reduce((sum, r) => sum + returnAmount(r), 0);
    for (const key of ["b90", "b61", "b31", "b0"]) {
      const applied = Math.min(credits, buckets[key]);
      buckets[key] -= applied;
      credits -= applied;
    }
    return { ...buckets, total: buckets.b0 + buckets.b31 + buckets.b61 + buckets.b90 };
  }

  function spendByMonth() {
    const months = [];
    for (let date = FINANCIAL_YEAR.start; date <= DEMO_TODAY; ) {
      const key = date.slice(0, 7);
      const amount = state.purchaseOrders
        .filter((po) => countsAsSpend(po) && po.orderDate.startsWith(key))
        .reduce((sum, po) => sum + poTotal(po), 0);
      const label = new Date(`${date}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      months.push({ periodKey: key, label, amount: money(amount) });
      const next = new Date(`${key}-01T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      date = next.toISOString().slice(0, 10);
    }
    return months;
  }

  function spendByCategory() {
    const totals = new Map();
    for (const po of state.purchaseOrders.filter(countsAsSpend)) {
      const categoryId = supplier(po.supplierId).categoryId;
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + poTotal(po));
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3).map(([id, amount]) => ({ id, name: nameOf(SUPPLIER_CATEGORIES, id), amount }));
    const rest = sorted.slice(3).reduce((sum, [, amount]) => sum + amount, 0);
    if (rest > 0) top.push({ id: "others", name: "Others", amount: rest });
    const percents = shares(top.map((entry) => entry.amount));
    const totalAmount = top.reduce((sum, entry) => sum + entry.amount, 0);
    return { totalAmount, categories: top.map((entry, index) => ({ id: entry.id, name: entry.name, sharePercent: percents[index] })) };
  }

  const totalSpend = () => state.purchaseOrders.filter(countsAsSpend).reduce((sum, po) => sum + poTotal(po), 0);

  // ---------- JSON shapes (mirroring the service typedefs) ----------
  const supplierJson = (s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    categoryName: nameOf(SUPPLIER_CATEGORIES, s.categoryId),
    gstin: s.gstin || null,
    contactPerson: s.contactPerson || null,
    phone: s.phone || null,
    city: s.city || null,
    status: s.status,
  });

  const requisitionJson = (pr) => ({
    id: pr.id,
    requisitionNumber: pr.requisitionNumber,
    requestDate: pr.requestDate,
    requestedBy: pr.requestedBy,
    departmentName: nameOf(DEPARTMENTS, pr.departmentId),
    itemsSummary: itemsSummary(pr.lines),
    estimatedAmount: money(pr.lines.reduce((sum, line) => sum + line.estimatedCostPaise, 0)),
    priority: pr.priority,
    status: pr.status,
  });

  const purchaseOrderJson = (po) => ({
    id: po.id,
    orderNumber: po.orderNumber,
    orderDate: po.orderDate,
    supplier: party(supplier(po.supplierId)),
    itemsSummary: itemsSummary(po.lines),
    totalAmount: money(poTotal(po)),
    deliveryDate: po.deliveryDate,
    status: po.status,
  });

  const invoiceJson = (invoice) => {
    const figures = invoiceFigures(invoice);
    const po = purchaseOrder(invoice.purchaseOrderId);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      supplier: party(supplier(invoice.supplierId)),
      purchaseOrder: po ? { id: po.id, orderNumber: po.orderNumber } : null,
      invoiceAmount: money(figures.amount),
      tdsAmount: money(figures.tds),
      netPayable: money(figures.net),
      dueDate: invoice.dueDate,
      status: invoice.status,
    };
  };

  const returnJson = (ret) => {
    const po = purchaseOrder(ret.purchaseOrderId);
    const lines = ret.lines.map((line) => {
      const poLine = po.lines.find((l) => l.lineId === line.lineId);
      return { description: poLine.description, quantity: line.quantity, unitId: poLine.unitId };
    });
    return {
      id: ret.id,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate,
      supplier: party(supplier(ret.supplierId)),
      sourceDocument: { type: "purchaseOrder", id: po.id, number: po.orderNumber },
      reasonLabel: nameOf(RETURN_REASONS, ret.lines[0]?.reasonId),
      itemsSummary: itemsSummary(lines),
      amount: money(returnAmount(ret)),
      status: ret.status,
    };
  };

  /** Stored `completed` is manual; otherwise expired when past end date (PRD list badges). */
  function agreementEffectiveStatus(a) {
    if (a.status === "completed") return "completed";
    if (a.endDate < DEMO_TODAY) return "expired";
    return "active";
  }

  const activeAgreementCount = (scId) =>
    state.agreements.filter((a) => a.subcontractorId === scId && agreementEffectiveStatus(a) === "active").length;

  const subcontractorJson = (sc) => ({
    id: sc.id,
    code: sc.code,
    name: sc.name,
    tradeSpecialtyLabel: nameOf(TRADE_SPECIALTIES, sc.tradeSpecialtyId),
    gstin: sc.gstin || null,
    contactPerson: sc.contactPerson || null,
    phone: sc.phone || null,
    activeAgreementCount: activeAgreementCount(sc.id),
    rating: sc.rating,
    status: sc.status,
  });

  const agreementJson = (a) => ({
    id: a.id,
    agreementNumber: a.agreementNumber,
    agreementDate: a.agreementDate,
    subcontractor: party(subcontractor(a.subcontractorId)),
    projectName: nameOf(PROJECTS, a.projectId),
    scopeSummary: a.scopeOfWork.length > 70 ? `${a.scopeOfWork.slice(0, 67)}...` : a.scopeOfWork,
    agreementValue: money(a.agreementValuePaise),
    startDate: a.startDate,
    endDate: a.endDate,
    status: agreementEffectiveStatus(a),
  });

  const agreementDetailJson = (a) => ({
    ...agreementJson(a),
    title: a.title,
    scopeOfWork: a.scopeOfWork,
    termsAndConditions: a.termsAndConditions || null,
    paymentScheduleLabel: nameOf(PAYMENT_SCHEDULES, a.paymentScheduleId),
    attachments: (a.attachmentIds ?? [])
      .map((id) => state.attachments.find((attachment) => attachment.id === id))
      .filter(Boolean)
      .map((attachment) => ({ id: attachment.id, fileName: attachment.fileName, contentType: attachment.contentType })),
    allowedActions: agreementEffectiveStatus(a) === "active" ? ["complete"] : [],
  });

  const subcontractOrderJson = (o) => {
    const linked = agreement(o.agreementId);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      subcontractor: party(subcontractor(o.subcontractorId)),
      agreement: linked ? { id: linked.id, agreementNumber: linked.agreementNumber } : null,
      description: o.description,
      orderValue: money(o.orderValuePaise),
      deliveryDate: o.deliveryDate,
      progressPercent: o.progressPercent,
      status: o.status,
    };
  };

  const billFigures = (bill) => {
    const retention = Math.round((bill.billAmountPaise * DEMO_RULES.retentionRatePercent) / 100);
    return { retention, net: bill.billAmountPaise - retention };
  };

  const billJson = (bill) => {
    const order = subcontractOrder(bill.orderId);
    const { retention, net } = billFigures(bill);
    const cumulativePaid = state.subcontractBills
      .filter((b) => b.orderId === bill.orderId && b.status === "paid" && b.billDate <= bill.billDate)
      .reduce((sum, b) => sum + billFigures(b).net, 0);
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      subcontractor: party(subcontractor(bill.subcontractorId)),
      order: order ? { id: order.id, orderNumber: order.orderNumber } : null,
      billAmount: money(bill.billAmountPaise),
      retentionAmount: money(retention),
      netPayable: money(net),
      cumulativePaid: money(cumulativePaid),
      status: bill.status,
    };
  };

  // ---------- detail shapes (record "View" screens) ----------
  const lineValue = (quantity, pricePaise) => Math.round(quantity * pricePaise);

  const requisitionDetailJson = (pr) => {
    const approvals = state.approvals.filter((a) => a.documentType === "purchaseRequisition" && a.documentId === pr.id);
    const pending = approvals.find((a) => a.status === "pending");
    const linkedPo = state.purchaseOrders.find((po) => po.requisitionId === pr.id && po.status !== "cancelled");
    return {
      ...requisitionJson(pr),
      title: pr.title,
      requiredDate: pr.requiredDate,
      approver: Object.values(USERS).find((user) => user.id === pr.approverId) ?? null,
      justification: pr.justification || null,
      items: pr.lines.map((line) => ({
        description: line.description,
        quantity: qtyText(line.quantity),
        unitLabel: unitName(line.unitId),
        estimatedCost: money(line.estimatedCostPaise),
      })),
      purchaseOrder: linkedPo ? { id: linkedPo.id, orderNumber: linkedPo.orderNumber } : null,
      pendingApproval: pending ? { id: pending.id, version: pending.version } : null,
      approvalHistory: approvals
        .filter((a) => a.status !== "pending")
        .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))
        .map((a) => ({ id: a.id, decision: a.status, decidedBy: a.decidedBy, decidedAt: a.decidedAt, comment: a.comment })),
    };
  };

  /** Demo-only transition rules; the real rules are owned by the backend and returned as `allowedActions`. */
  const PO_ACTIONS = {
    draft: ["send", "receive", "complete", "cancel"],
    sent: ["receive", "complete", "cancel"],
    partially_received: ["receive", "complete", "cancel"],
    completed: [],
    cancelled: [],
  };

  const purchaseOrderDetailJson = (po) => {
    const pr = po.requisitionId ? requisition(po.requisitionId) : null;
    const subtotal = poSubtotal(po);
    const receivedValue = withGst(po.lines.reduce((sum, line) => sum + lineValue(receivedQuantity(po, line), line.unitPricePaise), 0));
    const hasRemaining = po.lines.some((line) => remainingQuantity(po, line) > 0);
    return {
      ...purchaseOrderJson(po),
      requisition: pr ? { id: pr.id, requisitionNumber: pr.requisitionNumber } : null,
      paymentTermsLabel: nameOf(PAYMENT_TERMS, po.paymentTermId),
      shippingAddress: po.shippingAddress || null,
      notes: po.notes || null,
      createdBy: po.createdBy,
      items: po.lines.map((line) => ({
        lineId: line.lineId,
        description: line.description,
        unitLabel: unitName(line.unitId),
        quantity: qtyText(line.quantity),
        receivedQuantity: qtyText(receivedQuantity(po, line)),
        remainingQuantity: qtyText(remainingQuantity(po, line)),
        unitPrice: money(line.unitPricePaise),
        amount: money(lineValue(line.quantity, line.unitPricePaise)),
      })),
      subtotal: money(subtotal),
      taxRatePercent: String(DEMO_RULES.gstRatePercent),
      taxAmount: money(poTotal(po) - subtotal),
      receivedAmount: money(receivedValue),
      receipts: [...po.receipts]
        .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate) || a.id.localeCompare(b.id))
        .map((receipt) => ({
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          receivedDate: receipt.receivedDate,
          amount: money(
            withGst(
              receipt.lines.reduce((sum, l) => sum + lineValue(l.quantity, po.lines.find((line) => line.lineId === l.lineId).unitPricePaise), 0),
            ),
          ),
          items: receipt.lines
            .filter((l) => l.quantity > 0)
            .map((l) => {
              const line = po.lines.find((entry) => entry.lineId === l.lineId);
              return { lineId: l.lineId, description: line.description, unitLabel: unitName(line.unitId), quantity: qtyText(l.quantity) };
            }),
          recordedBy: receipt.recordedBy,
          recordedAt: receipt.recordedAt,
        })),
      allowedActions: PO_ACTIONS[po.status].filter((action) => action !== "receive" || hasRemaining),
    };
  };

  const invoiceDetailJson = (invoice) => {
    const figures = invoiceFigures(invoice);
    return {
      ...invoiceJson(invoice),
      items: invoice.lines.map((line) => ({
        description: line.description,
        quantity: qtyText(line.quantity),
        rate: money(line.ratePaise),
        amount: money(lineValue(line.quantity, line.ratePaise)),
      })),
      taxableAmount: money(invoice.taxablePaise),
      taxRatePercent: String(invoice.taxRatePercent),
      taxAmount: money(figures.tax),
      tdsRatePercent: String(DEMO_RULES.tdsRatePercent),
      paidAmount: money(figures.paid),
      balanceDue: money(figures.balanceDue),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        paymentDate: payment.paymentDate,
        amount: money(payment.amountPaise),
        transactionId: payment.transactionId,
        recordedBy: payment.recordedBy,
        recordedAt: payment.recordedAt,
      })),
      attachments: invoice.attachmentIds
        .map((id) => state.attachments.find((attachment) => attachment.id === id))
        .filter(Boolean)
        .map((attachment) => ({ id: attachment.id, fileName: attachment.fileName })),
      allowedActions: figures.balanceDue > 0 ? ["recordPayment"] : [],
    };
  };

  function approvalDocument(approval) {
    switch (approval.documentType) {
      case "purchaseRequisition": {
        const pr = requisition(approval.documentId);
        const json = requisitionJson(pr);
        return { record: pr, number: pr.requisitionNumber, amount: json.estimatedAmount, priority: pr.priority, description: pr.title };
      }
      case "purchaseOrder": {
        const po = purchaseOrder(approval.documentId);
        const total = poTotal(po);
        return {
          record: po,
          number: po.orderNumber,
          amount: money(total),
          priority: total >= 25_00_000_00 ? "high" : "medium",
          description: `${itemsSummary(po.lines)} · ${supplier(po.supplierId).name}`,
        };
      }
      case "subcontractBill": {
        const bill = state.subcontractBills.find((b) => b.id === approval.documentId);
        const order = subcontractOrder(bill.orderId);
        return {
          record: bill,
          number: bill.billNumber,
          amount: money(bill.billAmountPaise),
          priority: bill.billAmountPaise >= 50_00_000_00 ? "high" : "medium",
          description: `${order.description} · ${subcontractor(bill.subcontractorId).name}`,
        };
      }
      case "purchaseInvoice": {
        const invoice = state.invoices.find((i) => i.id === approval.documentId);
        const daysToDue = daysBetween(DEMO_TODAY, invoice.dueDate);
        return {
          record: invoice,
          number: invoice.invoiceNumber,
          amount: money(invoiceFigures(invoice).amount),
          priority: daysToDue <= 15 ? "high" : daysToDue <= 30 ? "medium" : "low",
          description: `${supplier(invoice.supplierId).name} · against ${purchaseOrder(invoice.purchaseOrderId).orderNumber}`,
        };
      }
      default:
        throw new Error(`Unknown approval document type ${approval.documentType}`);
    }
  }

  const pendingApprovalJson = (approval) => {
    const doc = approvalDocument(approval);
    return {
      id: approval.id,
      documentType: approval.documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[approval.documentType],
      document: { id: approval.documentId, number: doc.number },
      requestedBy: approval.requestedBy,
      submittedAt: approval.submittedAt,
      amount: doc.amount,
      priority: doc.priority,
      description: doc.description,
      allowedActions: { approve: true, reject: true },
      version: approval.version,
    };
  };

  const historyJson = (approval) => {
    const doc = approvalDocument(approval);
    return {
      id: approval.id,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[approval.documentType],
      documentType: approval.documentType,
      document: { id: approval.documentId, number: doc.number },
      requestedBy: approval.requestedBy,
      amount: doc.amount,
      submittedAt: approval.submittedAt,
      decidedAt: approval.decidedAt,
      decidedBy: approval.decidedBy,
      decision: approval.status,
      comment: approval.comment,
    };
  };

  const pendingApprovals = () =>
    state.approvals.filter((a) => a.status === "pending").sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  function decidedApprovals(query) {
    const documentType = query.get("documentType") ?? "";
    const decision = query.get("decision") ?? "";
    const dateRange = query.get("dateRange") ?? "";
    const since =
      { last_30_days: addDays(DEMO_TODAY, -30), last_90_days: addDays(DEMO_TODAY, -90), current_financial_year: FINANCIAL_YEAR.start }[
        dateRange
      ] ?? null;
    return state.approvals
      .filter((a) => a.status !== "pending")
      .filter((a) => !documentType || a.documentType === documentType)
      .filter((a) => !decision || a.status === decision)
      .filter((a) => !since || a.decidedAt.slice(0, 10) >= since)
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  }

  // ---------- generated files ----------
  function reportRows(reportKey, range) {
    const inRange = (date) => date >= range.from && date <= range.to;
    switch (reportKey) {
      case "po-register":
      case "pending-deliveries": {
        const statuses = reportKey === "pending-deliveries" ? ["sent", "partially_received"] : null;
        return {
          header: ["PO Number", "Order Date", "Supplier", "Items", "Total (INR)", "Delivery Date", "Status"],
          rows: state.purchaseOrders
            .filter((po) => (statuses ? statuses.includes(po.status) : inRange(po.orderDate)))
            .map((po) => [po.orderNumber, po.orderDate, supplier(po.supplierId).name, itemsSummary(po.lines), rupeesNumber(poTotal(po)), po.deliveryDate, po.status]),
        };
      }
      case "invoice-register":
        return {
          header: ["Invoice No", "Invoice Date", "Supplier", "PO", "Invoice Amount", "TDS", "Net Payable", "Due Date", "Status"],
          rows: state.invoices
            .filter((i) => inRange(i.invoiceDate))
            .map((i) => {
              const f = invoiceFigures(i);
              return [i.invoiceNumber, i.invoiceDate, supplier(i.supplierId).name, purchaseOrder(i.purchaseOrderId).orderNumber, rupeesNumber(f.amount), rupeesNumber(f.tds), rupeesNumber(f.net), i.dueDate, i.status];
            }),
        };
      case "returns-summary":
        return {
          header: ["Return No", "Date", "Supplier", "PO", "Reason", "Amount (INR)", "Status"],
          rows: state.purchaseReturns
            .filter((r) => inRange(r.returnDate))
            .map((r) => {
              const json = returnJson(r);
              return [r.returnNumber, r.returnDate, json.supplier.name, json.sourceDocument.number, json.reasonLabel, rupeesNumber(returnAmount(r)), r.status];
            }),
        };
      case "category-spend": {
        const totals = new Map();
        for (const po of state.purchaseOrders.filter((p) => countsAsSpend(p) && inRange(p.orderDate))) {
          const name = nameOf(SUPPLIER_CATEGORIES, supplier(po.supplierId).categoryId);
          totals.set(name, (totals.get(name) ?? 0) + poTotal(po));
        }
        return {
          header: ["Category", "Purchase Value (INR)"],
          rows: [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => [name, rupeesNumber(amount)]),
        };
      }
      case "requisition-status":
        return {
          header: ["PR Number", "Date", "Requested By", "Department", "Priority", "Est. Amount (INR)", "Status"],
          rows: state.requisitions
            .filter((pr) => inRange(pr.requestDate))
            .map((pr) => {
              const json = requisitionJson(pr);
              return [pr.requisitionNumber, pr.requestDate, pr.requestedBy.displayName, json.departmentName, pr.priority, Number(json.estimatedAmount), pr.status];
            }),
        };
      default:
        return { header: ["Note"], rows: [["No rows for this report in the demo."]] };
    }
  }

  function buildFile({ title, sheetName, header, rows, format, fileStem }) {
    if (format === "xlsx") {
      return { buffer: buildXlsx(sheetName, header, rows), fileName: `${fileStem}.xlsx`, contentType: XLSX_TYPE };
    }
    const lines = rows.length ? toTextTable(header, rows) : ["No records for this selection."];
    return { buffer: buildPdf(title, lines), fileName: `${fileStem}.pdf`, contentType: PDF_TYPE };
  }

  function createGeneratedReport({ reportKey, periodId, format, generatedAt, readyAt }) {
    const definition = REPORT_DEFINITIONS.purchase.find((d) => d.key === reportKey);
    const range = PERIOD_RANGES[periodId] ?? PERIOD_RANGES["rp-fy"];
    const { header, rows } = reportRows(reportKey, range);
    const periodLabel = nameOf(REPORTING_PERIODS, periodId) ?? "FY 2026-27 (year to date)";
    const file = buildFile({
      title: `${definition.title} - ${periodLabel}`,
      sheetName: definition.title,
      header,
      rows,
      format,
      fileStem: `${definition.title.replace(/[^A-Za-z0-9-]+/g, "_")}_${range.slug}`,
    });
    const report = {
      id: `rep-${pad(state.generatedReports.length + 1, 3)}`,
      fileName: file.fileName,
      generatedAt,
      sizeBytes: file.buffer.length,
      format,
      file,
      readyAt,
    };
    state.generatedReports.push(report);
    return report;
  }

  function seedGeneratedReports() {
    const seeds = [
      ["po-register", "rp-2026-09", "pdf", at("2026-10-01", "09:15")],
      ["invoice-register", "rp-2026-09", "xlsx", at("2026-10-01", "09:20")],
      ["category-spend", "rp-q2", "xlsx", at("2026-10-05", "11:40")],
      ["returns-summary", "rp-q2", "pdf", at("2026-10-06", "10:05")],
      ["pending-deliveries", "rp-2026-10", "xlsx", at("2026-10-15", "18:05")],
      ["requisition-status", "rp-2026-10", "pdf", at("2026-10-20", "17:30")],
    ];
    for (const [reportKey, periodId, format, generatedAt] of seeds) {
      createGeneratedReport({ reportKey, periodId, format, generatedAt, readyAt: 0 });
    }
  }

  const reportStatus = (report) => (Date.now() >= report.readyAt ? "ready" : "processing");
  const generatedReportJson = (report) => ({
    id: report.id,
    fileName: report.fileName,
    generatedAt: report.generatedAt,
    sizeBytes: report.sizeBytes,
    format: report.format,
    status: reportStatus(report),
  });

  // ---------- lookups ----------
  function lookup(key) {
    switch (key) {
      case "supplierCategories":
        return { options: options(SUPPLIER_CATEGORIES) };
      case "paymentTerms":
        return { options: options(PAYMENT_TERMS) };
      case "departments":
        return { options: options(DEPARTMENTS) };
      case "requisitionPriorities":
        return { options: [{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }] };
      case "approvers":
        return {
          options: [
            { value: USERS.kavita.id, label: `${USERS.kavita.displayName} (Procurement Head)` },
            { value: USERS.arjun.id, label: `${USERS.arjun.displayName} (Finance Controller)` },
          ],
        };
      case "units":
        return { options: options(UNITS) };
      case "suppliers":
        return {
          options: state.suppliers
            .filter((s) => s.status === "active")
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => ({ value: s.id, label: s.name })),
        };
      case "approvedRequisitions":
        return {
          options: state.requisitions
            .filter((pr) => pr.status === "approved" && !state.purchaseOrders.some((po) => po.requisitionId === pr.id && po.status !== "cancelled"))
            .map((pr) => ({ value: pr.id, label: `${pr.requisitionNumber} · ${pr.title}` })),
        };
      case "purchaseOrders":
        return {
          options: state.purchaseOrders
            .filter((po) => po.status === "partially_received" || po.status === "completed")
            .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
            .map((po) => ({ value: po.id, label: `${po.orderNumber} · ${supplier(po.supplierId).name}` })),
        };
      case "returnReasons":
        return { options: options(RETURN_REASONS) };
      case "subcontractors":
        return {
          options: state.subcontractors
            .filter((sc) => sc.status === "active")
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((sc) => ({ value: sc.id, label: sc.name })),
        };
      case "projects":
        return { options: options(PROJECTS) };
      case "tradeSpecialties":
        return { options: options(TRADE_SPECIALTIES) };
      case "paymentSchedules":
        return { options: options(PAYMENT_SCHEDULES) };
      case "reportingPeriods":
        return { options: options(REPORTING_PERIODS), defaultValue: "rp-2026-10" };
      case "performancePeriods":
        return { options: options(PERFORMANCE_PERIODS), defaultValue: "pp-q2" };
      default:
        throw notFound(`Lookup "${key}"`);
    }
  }

  // ---------- validation helpers for line items ----------
  function validateLines(v, items, { priceField, requireUnit }) {
    const lines = (Array.isArray(items) ? items : [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !blank(item?.description) || !blank(item?.quantity) || !blank(item?.[priceField]));
    if (lines.length === 0) v.add("items", "Add at least one line item.");
    for (const { item, index } of lines) {
      if (blank(item.description)) v.add(`items[${index}].description`, "Enter a description.");
      if (!isPositiveDecimal(item.quantity)) v.add(`items[${index}].quantity`, "Quantity must be greater than zero.");
      if (!isMoney(item[priceField])) v.add(`items[${index}].${priceField}`, "Enter an amount with up to two decimals.");
      if (requireUnit && !UNITS.some((u) => u.id === item.unitId)) v.add(`items[${index}].unitId`, "Select a unit.");
    }
    return lines.map(({ item }) => item);
  }

  function requireDate(v, field, value, message = "Select a date.") {
    if (!isDate(value)) v.add(field, message);
  }

  // ---------- route handlers ----------
  const sessionJson = () => ({
    user: { id: USERS.demo.id, displayName: USERS.demo.displayName, roleLabel: "DEMO · Procurement Manager", avatarUrl: null },
    tenant: { id: "tenant-demo", name: "ELVA Demo Tenant (sample data)" },
    permissions: ["demo.all"],
    navigation: NAVIGATION_KEYS,
  });

  const routes = [
    ["GET", /^\/procurement\/session$/, sessionJson],
    ["POST", /^\/procurement\/session$/, ({ body }) => {
      const v = createValidator();
      if (blank(body.username)) v.add("username", "Enter your Employee ID or email.");
      if (typeof body.password !== "string" || body.password === "") v.add("password", "Enter your password.");
      v.throwIfAny();
      if (!DEMO_LOGINS.includes(String(body.username).trim().toLowerCase()) || body.password !== DEMO_PASSWORD) {
        throw new DemoHttpError(401, "invalid_credentials", "The Employee ID / email or password is incorrect.");
      }
      state.signedIn = true;
      return sessionJson();
    }],
    ["DELETE", /^\/procurement\/session$/, () => {
      state.signedIn = false;
      return { status: 204, body: null };
    }],

    ["GET", /^\/procurement\/lookups\/([^/]+)$/, ({ params }) => lookup(decodeURIComponent(params[0]))],

    // Suppliers
    ["GET", /^\/procurement\/suppliers$/, ({ query }) => {
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const categoryId = query.get("categoryId") ?? "";
      const status = query.get("status") ?? "";
      const rows = state.suppliers
        .filter((s) => !categoryId || s.categoryId === categoryId)
        .filter((s) => !status || s.status === status)
        .filter((s) => !search || [s.name, s.code, s.gstin, s.city].some((f) => String(f).toLowerCase().includes(search)))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(supplierJson);
      return paginate(rows, query);
    }],
    ["POST", /^\/procurement\/suppliers$/, ({ body }) => {
      const v = createValidator();
      if (blank(body.name)) v.add("name", "Enter the supplier name.");
      if (!SUPPLIER_CATEGORIES.some((c) => c.id === body.categoryId)) v.add("categoryId", "Select a category.");
      if (!PAYMENT_TERMS.some((t) => t.id === body.paymentTermId)) v.add("paymentTermId", "Select payment terms.");
      const gstin = String(body.gstin ?? "").trim().toUpperCase();
      const pan = String(body.pan ?? "").trim().toUpperCase();
      if (gstin && !GSTIN_PATTERN.test(gstin)) v.add("gstin", "Enter a 15-character GSTIN, e.g. 27ABCDE1234F1Z5.");
      if (gstin && state.suppliers.some((s) => s.gstin === gstin)) v.add("gstin", "A supplier with this GSTIN already exists.");
      if (pan && !PAN_PATTERN.test(pan)) v.add("pan", "Enter a 10-character PAN, e.g. ABCDE1234F.");
      if (!blank(body.email) && !isEmail(body.email)) v.add("email", "Enter a valid email address.");
      v.throwIfAny();
      const n = nextNumber(state.suppliers, "code", /SUP-(\d+)/);
      const created = {
        id: `sup-${pad(n, 3)}`,
        code: `SUP-${pad(n, 3)}`,
        name: body.name.trim(),
        categoryId: body.categoryId,
        gstin: gstin || null,
        pan: pan || null,
        contactPerson: String(body.contactPerson ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        email: String(body.email ?? "").trim(),
        address: String(body.address ?? "").trim(),
        city: String(body.city ?? "").trim(),
        state: String(body.state ?? "").trim(),
        paymentTermId: body.paymentTermId,
        status: "active",
        invoicePrefix: "NEW",
        openingBalancePaise: 0,
      };
      state.suppliers.push(created);
      return { status: 201, body: supplierJson(created) };
    }],
    ["POST", /^\/procurement\/suppliers\/([^/]+)\/status-changes$/, ({ params, body }) => {
      const record = supplier(params[0]);
      if (!record) throw notFound("Supplier");
      const v = createValidator();
      if (!["active", "inactive"].includes(body.status)) v.add("status", "Choose active or inactive.");
      v.throwIfAny();
      if (record.status === body.status) throw conflict(`Supplier is already ${body.status}.`);
      record.status = body.status;
      return supplierJson(record);
    }],

    // Supplier ledger
    ["GET", /^\/procurement\/suppliers\/([^/]+)\/ledger$/, ({ params, query }) => {
      const record = supplier(params[0]);
      if (!record) throw notFound("Supplier");
      const fromDate = isDate(query.get("fromDate")) ? query.get("fromDate") : "";
      const toDate = isDate(query.get("toDate")) ? query.get("toDate") : "";
      const periodFrom = fromDate || FINANCIAL_YEAR.start;
      const periodTo = toDate || DEMO_TODAY;
      let balance = record.openingBalancePaise;
      let openingBalance = record.openingBalancePaise;
      const rows = periodFrom <= FINANCIAL_YEAR.start ? [openingEntryJson(record)] : [];
      let totalDebits = 0;
      let totalCredits = 0;
      for (const posting of ledgerPostings(record.id)) {
        balance += posting.credit - posting.debit;
        if (posting.date < periodFrom) {
          openingBalance = balance;
          continue;
        }
        if (posting.date > periodTo) continue;
        totalDebits += posting.debit;
        totalCredits += posting.credit;
        rows.push(ledgerEntryJson(posting, balance));
      }
      const page = paginate(rows, query, 20);
      return {
        supplier: { id: record.id, code: record.code, name: record.name },
        period: { fromDate: periodFrom, toDate: periodTo },
        summary: {
          openingBalance: money(openingBalance),
          totalDebits: money(totalDebits),
          totalCredits: money(totalCredits),
          closingBalance: money(openingBalance + totalCredits - totalDebits),
        },
        ...page,
      };
    }],
    ["GET", /^\/procurement\/suppliers\/([^/]+)\/statement$/, ({ params }) => {
      const record = supplier(params[0]);
      if (!record) throw notFound("Supplier");
      let balance = record.openingBalancePaise;
      let purchases = 0;
      let payments = 0;
      const items = [openingEntryJson(record)];
      for (const posting of ledgerPostings(record.id)) {
        balance += posting.credit - posting.debit;
        purchases += posting.credit;
        payments += posting.debit;
        items.push(ledgerEntryJson(posting, balance));
      }
      return {
        supplier: {
          id: record.id,
          code: record.code,
          name: record.name,
          gstin: record.gstin || null,
          pan: record.pan || null,
          paymentTermsLabel: nameOf(PAYMENT_TERMS, record.paymentTermId),
        },
        financialYearLabel: FINANCIAL_YEAR.label,
        statementPeriodLabel: "01 Apr 2026 - 21 Oct 2026",
        totals: { totalPurchases: money(purchases), totalPayments: money(payments), outstanding: money(balance) },
        items,
      };
    }],
    ["GET", /^\/procurement\/suppliers\/([^/]+)\/ledger\/export$/, ({ params, query }) => {
      const record = supplier(params[0]);
      if (!record) throw notFound("Supplier");
      const format = query.get("format") === "pdf" ? "pdf" : "xlsx";
      const fromDate = isDate(query.get("fromDate")) ? query.get("fromDate") : FINANCIAL_YEAR.start;
      const toDate = isDate(query.get("toDate")) ? query.get("toDate") : DEMO_TODAY;
      let balance = record.openingBalancePaise;
      const rows = [[FINANCIAL_YEAR.start, "OPENING", "Opening", "Opening balance brought forward", 0, rupeesNumber(balance), rupeesNumber(balance), "Cr"]];
      for (const posting of ledgerPostings(record.id)) {
        balance += posting.credit - posting.debit;
        if (posting.date < fromDate || posting.date > toDate) continue;
        rows.push([posting.date, posting.voucherNumber, posting.voucherTypeLabel, posting.description, rupeesNumber(posting.debit), rupeesNumber(posting.credit), rupeesNumber(Math.abs(balance)), balance >= 0 ? "Cr" : "Dr"]);
      }
      return {
        file: buildFile({
          title: `Supplier Ledger - ${record.name} (${record.code})`,
          sheetName: "Supplier Ledger",
          header: ["Date", "Voucher", "Type", "Description", "Debit", "Credit", "Balance", "Side"],
          rows,
          format,
          fileStem: `Supplier_Ledger_${record.code}`,
        }),
      };
    }],

    // Supplier performance
    ["GET", /^\/procurement\/supplier-performance$/, ({ query }) => {
      const periodId = state.performance[query.get("periodId")] ? query.get("periodId") : "pp-q2";
      const categoryId = query.get("categoryId") ?? "";
      const rows = state.performance[periodId]
        .map(([n, onTime, quality, rejection, response, rating]) => ({ record: supplier(`sup-${pad(n, 3)}`), onTime, quality, rejection, response, rating }))
        .filter(({ record }) => record && (!categoryId || record.categoryId === categoryId))
        .map(({ record, onTime, quality, rejection, response, rating }) =>
          onTime === null || onTime === undefined
            ? { supplier: party(record), dataSufficiency: "insufficient", onTimeRate: null, qualityScore: null, rejectionRate: null, avgResponseHours: null, overallRating: null, filledStars: null }
            : {
                supplier: party(record),
                dataSufficiency: "sufficient",
                onTimeRate: percent1(onTime),
                qualityScore: String(quality),
                rejectionRate: percent1(rejection),
                avgResponseHours: percent1(response),
                overallRating: percent1(rating),
                filledStars: Math.round(rating),
              },
        );
      const sufficient = rows.filter((row) => row.dataSufficiency === "sufficient");
      const best = (pick, compare) => sufficient.reduce((winner, row) => (!winner || compare(Number(pick(row)), Number(pick(winner))) ? row : winner), null);
      const bestDelivery = best((r) => r.onTimeRate, (a, b) => a > b);
      const highestQuality = best((r) => r.rejectionRate, (a, b) => a < b);
      const fastestResponse = best((r) => r.avgResponseHours, (a, b) => a < b);
      return {
        lastUpdatedAt: at(DEMO_TODAY, "06:30"),
        period: { id: periodId, label: nameOf(PERFORMANCE_PERIODS, periodId) },
        highlights: {
          bestDelivery: bestDelivery ? { supplier: bestDelivery.supplier, onTimeRate: bestDelivery.onTimeRate } : null,
          highestQuality: highestQuality ? { supplier: highestQuality.supplier, rejectionRate: highestQuality.rejectionRate } : null,
          fastestResponse: fastestResponse ? { supplier: fastestResponse.supplier, avgResponseHours: fastestResponse.avgResponseHours } : null,
        },
        ...paginate(rows, query),
      };
    }],

    // Purchase requisitions
    ["GET", /^\/procurement\/purchase-requisitions$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const rows = state.requisitions
        .filter((pr) => !status || pr.status === status)
        .filter((pr) => !search || `${pr.requisitionNumber} ${pr.title}`.toLowerCase().includes(search))
        .sort((a, b) => b.requestDate.localeCompare(a.requestDate) || b.id.localeCompare(a.id))
        .map(requisitionJson);
      return paginate(rows, query);
    }],
    ["POST", /^\/procurement\/purchase-requisitions$/, ({ body }) => {
      const v = createValidator();
      if (blank(body.title)) v.add("title", "Enter a title.");
      if (!DEPARTMENTS.some((d) => d.id === body.departmentId)) v.add("departmentId", "Select a department.");
      if (!["high", "medium", "low"].includes(body.priority)) v.add("priority", "Select a priority.");
      requireDate(v, "requiredDate", body.requiredDate);
      if (![USERS.kavita.id, USERS.arjun.id].includes(body.approverId)) v.add("approverId", "Select an approver.");
      const lines = validateLines(v, body.items, { priceField: "estimatedCost", requireUnit: true });
      v.throwIfAny();
      const n = nextNumber(state.requisitions, "requisitionNumber", /PR\/26-27\/(\d+)/);
      const created = {
        id: `pr-${pad(n, 3)}`,
        requisitionNumber: `PR/26-27/${pad(n, 4)}`,
        requestDate: DEMO_TODAY,
        requestedBy: USERS.demo,
        departmentId: body.departmentId,
        title: body.title.trim(),
        priority: body.priority,
        status: "pending_approval",
        requiredDate: body.requiredDate,
        lines: lines.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitId: item.unitId,
          estimatedCostPaise: toPaise(item.estimatedCost),
        })),
        justification: String(body.justification ?? ""),
        approverId: body.approverId,
      };
      state.requisitions.push(created);
      state.approvals.push(newApproval("purchaseRequisition", created.id));
      return { status: 201, body: requisitionJson(created) };
    }],
    ["GET", /^\/procurement\/purchase-requisitions\/([^/]+)$/, ({ params }) => {
      const pr = requisition(params[0]);
      if (!pr) throw notFound("Purchase requisition");
      return requisitionDetailJson(pr);
    }],

    // Purchase orders
    ["GET", /^\/procurement\/purchase-orders$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const rows = state.purchaseOrders
        .filter((po) => !status || po.status === status)
        .filter((po) => !search || `${po.orderNumber} ${supplier(po.supplierId).name}`.toLowerCase().includes(search))
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.id.localeCompare(a.id))
        .map(purchaseOrderJson);
      return paginate(rows, query);
    }],
    ["POST", /^\/procurement\/purchase-orders$/, ({ body }) => {
      const v = createValidator();
      const record = supplier(body.supplierId);
      if (!record || record.status !== "active") v.add("supplierId", "Select an active supplier.");
      if (!blank(body.requisitionId)) {
        const allowed = lookup("approvedRequisitions").options.some((o) => o.value === body.requisitionId);
        if (!allowed) v.add("requisitionId", "Select an approved requisition that has no purchase order yet.");
      }
      requireDate(v, "deliveryDate", body.deliveryDate);
      if (!PAYMENT_TERMS.some((t) => t.id === body.paymentTermId)) v.add("paymentTermId", "Select payment terms.");
      const lines = validateLines(v, body.items, { priceField: "unitPrice", requireUnit: false });
      v.throwIfAny();
      const n = nextNumber(state.purchaseOrders, "orderNumber", /PO\/26-27\/(\d+)/);
      const id = `po-${pad(n, 3)}`;
      const created = {
        id,
        orderNumber: `PO/26-27/${pad(n, 4)}`,
        orderDate: DEMO_TODAY,
        supplierId: body.supplierId,
        requisitionId: blank(body.requisitionId) ? null : body.requisitionId,
        deliveryDate: body.deliveryDate,
        paymentTermId: body.paymentTermId,
        status: "draft",
        receipts: [],
        lines: lines.map((item, index) => ({
          lineId: `${id}-L${index + 1}`,
          itemKey: null,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitId: null,
          unitPricePaise: toPaise(item.unitPrice),
        })),
        shippingAddress: String(body.shippingAddress ?? ""),
        notes: String(body.notes ?? ""),
        createdBy: USERS.demo,
      };
      state.purchaseOrders.push(created);
      state.approvals.push(newApproval("purchaseOrder", created.id));
      return { status: 201, body: purchaseOrderJson(created) };
    }],
    ["GET", /^\/procurement\/purchase-orders\/([^/]+)$/, ({ params }) => {
      const po = purchaseOrder(params[0]);
      if (!po) throw notFound("Purchase order");
      return purchaseOrderDetailJson(po);
    }],
    ["POST", /^\/procurement\/purchase-orders\/([^/]+)\/status-changes$/, ({ params, body }) => {
      const po = purchaseOrder(params[0]);
      if (!po) throw notFound("Purchase order");
      const action = { sent: "send", completed: "complete", cancelled: "cancel" }[body.status];
      if (!action) {
        const v = createValidator();
        v.add("status", "Choose sent, completed or cancelled.");
        v.throwIfAny();
      }
      if (!PO_ACTIONS[po.status].includes(action)) {
        throw conflict(`A ${po.status.replace("_", " ")} purchase order cannot be marked ${body.status}.`);
      }
      po.status = body.status;
      return purchaseOrderDetailJson(po);
    }],
    ["POST", /^\/procurement\/purchase-orders\/([^/]+)\/receipts$/, ({ params, body }) => {
      const po = purchaseOrder(params[0]);
      if (!po) throw notFound("Purchase order");
      if (!PO_ACTIONS[po.status].includes("receive")) {
        throw conflict(`Goods cannot be received against a ${po.status.replace("_", " ")} purchase order.`);
      }
      const v = createValidator();
      requireDate(v, "receivedDate", body.receivedDate, "Select the date the goods were received.");
      const items = Array.isArray(body.items) ? body.items : [];
      const received = [];
      items.forEach((item, index) => {
        if (blank(item?.quantity)) return;
        const line = po.lines.find((l) => l.lineId === item.lineId);
        if (!line) v.add(`items[${index}].lineId`, "This line does not belong to the purchase order.");
        else if (!isPositiveDecimal(item.quantity)) v.add(`items[${index}].quantity`, "Quantity must be greater than zero.");
        else if (Number(item.quantity) > remainingQuantity(po, line) + 1e-9) {
          v.add(`items[${index}].quantity`, `Cannot exceed the remaining quantity of ${qtyText(remainingQuantity(po, line))}.`);
        } else received.push({ lineId: line.lineId, quantity: Number(item.quantity) });
      });
      if (items.every((item) => blank(item?.quantity))) v.add("items", "Enter the quantity received for at least one item.");
      v.throwIfAny();
      const n = state.purchaseOrders.reduce((count, order) => count + order.receipts.length, 0) + 1;
      po.receipts.push({
        id: `grn-${pad(n, 3)}`,
        receiptNumber: `GRN/26-27/${pad(n, 4)}`,
        receivedDate: body.receivedDate,
        lines: received,
        recordedBy: USERS.demo,
        recordedAt: new Date().toISOString(),
      });
      po.status = po.lines.every((line) => remainingQuantity(po, line) <= 0) ? "completed" : "partially_received";
      return { status: 201, body: purchaseOrderDetailJson(po) };
    }],

    // Purchase invoices + attachments
    ["GET", /^\/procurement\/purchase-invoices$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const rows = state.invoices
        .filter((i) => !status || i.status === status)
        .filter((i) => !search || `${i.invoiceNumber} ${supplier(i.supplierId).name}`.toLowerCase().includes(search))
        .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.id.localeCompare(a.id))
        .map(invoiceJson);
      return paginate(rows, query);
    }],
    ["GET", /^\/procurement\/purchase-invoices\/summary$/, () => {
      return {
        totalInvoices: state.invoices.length,
        totalAmount: money(state.invoices.reduce((sum, i) => sum + invoiceFigures(i).amount, 0)),
        overdueAmount: money(state.invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + invoiceFigures(i).outstanding, 0)),
      };
    }],
    ["POST", /^\/procurement\/attachments$/, ({ multipart }) => {
      const v = createValidator();
      const file = multipart?.file;
      if (!file || typeof file !== "object") v.add("file", "Choose a file to upload.");
      else {
        if (multipart.purpose === "subcontract_agreement" && file.contentType !== "application/pdf") {
          v.add("file", "Upload a PDF file for the signed copy.");
        } else if (!ATTACHMENT_TYPES.includes(file.contentType)) v.add("file", "Upload a PDF, JPG or PNG file.");
        if (file.size > MAX_ATTACHMENT_BYTES) v.add("file", "The file is larger than 10 MB.");
      }
      v.throwIfAny();
      const created = {
        id: `att-${pad(state.attachments.length + 1, 3)}`,
        fileName: file.fileName,
        sizeBytes: file.size,
        contentType: file.contentType,
        purpose: multipart.purpose ?? null,
        data: file.data,
      };
      state.attachments.push(created);
      const { id, fileName, sizeBytes, contentType } = created;
      return { status: 201, body: { id, fileName, sizeBytes, contentType } };
    }],
    ["GET", /^\/procurement\/attachments\/([^/]+)\/file$/, ({ params }) => {
      const attachment = state.attachments.find((a) => a.id === params[0]);
      if (!attachment?.data) throw notFound("Attachment");
      return {
        file: {
          buffer: attachment.data,
          fileName: attachment.fileName,
          contentType: attachment.contentType ?? "application/octet-stream",
        },
      };
    }],
    ["POST", /^\/procurement\/purchase-invoices$/, ({ body }) => {
      const v = createValidator();
      const record = supplier(body.supplierId);
      const po = purchaseOrder(body.purchaseOrderId);
      if (blank(body.invoiceNumber)) v.add("invoiceNumber", "Enter the supplier's invoice number.");
      else if (state.invoices.some((i) => i.supplierId === body.supplierId && i.invoiceNumber.toUpperCase() === body.invoiceNumber.trim().toUpperCase())) {
        v.add("invoiceNumber", "This invoice number is already recorded for the supplier.");
      }
      if (!record || record.status !== "active") v.add("supplierId", "Select an active supplier.");
      if (!po || !["partially_received", "completed"].includes(po.status)) v.add("purchaseOrderId", "Select a received purchase order.");
      else if (record && po.supplierId !== record.id) v.add("purchaseOrderId", "This purchase order belongs to a different supplier.");
      requireDate(v, "invoiceDate", body.invoiceDate);
      if (!blank(body.dueDate)) {
        requireDate(v, "dueDate", body.dueDate);
        if (isDate(body.invoiceDate) && body.dueDate < body.invoiceDate) v.add("dueDate", "Due date cannot be before the invoice date.");
      }
      const taxRate = Number(body.taxRatePercent);
      if (blank(body.taxRatePercent) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 28) v.add("taxRatePercent", "Enter a tax rate between 0 and 28.");
      const lines = validateLines(v, body.items, { priceField: "rate", requireUnit: false });
      const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds : [];
      if (attachmentIds.some((id) => !state.attachments.some((a) => a.id === id))) v.add("attachmentIds", "The attachment upload was not found. Upload it again.");
      v.throwIfAny();
      const taxablePaise = lines.reduce((sum, item) => sum + Math.round(Number(item.quantity) * toPaise(item.rate)), 0);
      const computedTotal = taxablePaise + Math.round((taxablePaise * taxRate) / 100);
      if (!blank(body.statedTotalAmount) && Math.abs(toPaise(body.statedTotalAmount) - computedTotal) > 100) {
        v.add("statedTotalAmount", `Does not match the calculated total of ₹${money(computedTotal)} (demo check).`);
        v.throwIfAny();
      }
      const term = PAYMENT_TERMS.find((t) => t.id === po.paymentTermId)?.days ?? 30;
      const created = {
        id: `inv-${pad(nextNumber(state.invoices, "id", /inv-(\d+)/), 3)}`,
        invoiceNumber: body.invoiceNumber.trim(),
        invoiceDate: body.invoiceDate,
        dueDate: blank(body.dueDate) ? addDays(body.invoiceDate, term) : body.dueDate,
        supplierId: record.id,
        purchaseOrderId: po.id,
        lines: lines.map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), ratePaise: toPaise(item.rate) })),
        taxablePaise,
        taxRatePercent: taxRate,
        status: "draft",
        payments: [],
        tdsVoucher: null,
        attachmentIds,
      };
      state.invoices.push(created);
      return { status: 201, body: invoiceJson(created) };
    }],
    ["GET", /^\/procurement\/purchase-invoices\/([^/]+)$/, ({ params }) => {
      const invoice = state.invoices.find((i) => i.id === params[0]);
      if (!invoice) throw notFound("Purchase invoice");
      return invoiceDetailJson(invoice);
    }],
    ["POST", /^\/procurement\/purchase-invoices\/([^/]+)\/payments$/, ({ params, body }) => {
      const invoice = state.invoices.find((i) => i.id === params[0]);
      if (!invoice) throw notFound("Purchase invoice");
      const { balanceDue } = invoiceFigures(invoice);
      if (balanceDue <= 0) throw conflict("This invoice is already fully paid.");
      const v = createValidator();
      if (!isMoney(body.amount) || toPaise(body.amount) <= 0) v.add("amount", "Enter an amount greater than zero, with up to two decimals.");
      else if (toPaise(body.amount) > balanceDue) v.add("amount", `Cannot exceed the balance due of ₹${money(balanceDue)}.`);
      if (blank(body.transactionId)) v.add("transactionId", "Enter the transaction ID.");
      requireDate(v, "paymentDate", body.paymentDate, "Select the payment date.");
      v.throwIfAny();
      const n = state.invoices.reduce((count, i) => count + i.payments.length, 0) + 1;
      if (invoice.payments.length === 0) {
        invoice.tdsVoucher = `JV/26-27/${pad(state.invoices.filter((i) => i.tdsVoucher).length + 1, 4)}`;
      }
      invoice.payments.push({
        id: `pay-${pad(n, 3)}`,
        voucherNumber: `PAY/26-27/${pad(n, 4)}`,
        paymentDate: body.paymentDate,
        amountPaise: toPaise(body.amount),
        transactionId: String(body.transactionId).trim(),
        recordedBy: USERS.demo,
        recordedAt: new Date().toISOString(),
      });
      invoice.status = invoiceFigures(invoice).balanceDue <= 0 ? "paid" : "partially_paid";
      return { status: 201, body: invoiceDetailJson(invoice) };
    }],

    // Purchase returns
    ["GET", /^\/procurement\/purchase-returns$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const rows = state.purchaseReturns
        .filter((r) => !status || r.status === status)
        .sort((a, b) => b.returnDate.localeCompare(a.returnDate) || b.id.localeCompare(a.id))
        .map(returnJson);
      return paginate(rows, query);
    }],
    ["GET", /^\/procurement\/purchase-returns\/summary$/, () => {
      const notRejected = state.purchaseReturns.filter((r) => r.status !== "rejected");
      return {
        processedCount: notRejected.length,
        totalValue: money(notRejected.reduce((sum, r) => sum + returnAmount(r), 0)),
        pendingCreditNoteCount: state.purchaseReturns.filter((r) => r.status === "pending_approval").length,
        rejectedCount: state.purchaseReturns.filter((r) => r.status === "rejected").length,
      };
    }],
    ["GET", /^\/procurement\/purchase-orders\/([^/]+)\/returnable-lines$/, ({ params }) => {
      const po = purchaseOrder(params[0]);
      if (!po) throw notFound("Purchase order");
      return {
        supplier: party(supplier(po.supplierId)),
        lines: po.lines.map((line) => ({
          lineId: line.lineId,
          itemName: line.description,
          quantityReceived: qtyText(Math.max(0, receivedQuantity(po, line) - returnedQuantity(po, line.lineId))),
          unitLabel: unitName(line.unitId),
        })),
      };
    }],
    ["POST", /^\/procurement\/purchase-returns$/, ({ body }) => {
      const v = createValidator();
      const po = purchaseOrder(body.purchaseOrderId);
      if (!po || !["partially_received", "completed"].includes(po.status)) v.add("purchaseOrderId", "Select a received purchase order.");
      requireDate(v, "returnDate", body.returnDate);
      if (!["replacement", "refund"].includes(body.resolution)) v.add("resolution", "Choose replacement or refund.");
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) v.add("items", "Enter the quantity being returned for at least one item.");
      if (po) {
        items.forEach((item, index) => {
          const line = po.lines.find((l) => l.lineId === item.lineId);
          if (!line) v.add(`items[${index}].lineId`, "This line does not belong to the purchase order.");
          else {
            const available = receivedQuantity(po, line) - returnedQuantity(po, line.lineId);
            if (!isPositiveDecimal(item.quantity)) v.add(`items[${index}].quantity`, "Quantity must be greater than zero.");
            else if (Number(item.quantity) > available + 1e-9) v.add(`items[${index}].quantity`, `Only ${qtyText(available)} can be returned for ${line.description}.`);
          }
          if (!RETURN_REASONS.some((r) => r.id === item.reasonId)) v.add(`items[${index}].reasonId`, "Select a reason.");
        });
      }
      v.throwIfAny();
      const n = nextNumber(state.purchaseReturns, "returnNumber", /PRN\/26-27\/(\d+)/);
      const created = {
        id: `ret-${pad(n, 3)}`,
        returnNumber: `PRN/26-27/${pad(n, 4)}`,
        returnDate: body.returnDate,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        resolution: body.resolution,
        status: "pending_approval",
        notes: String(body.notes ?? ""),
        lines: items.map((item) => ({ lineId: item.lineId, quantity: Number(item.quantity), reasonId: item.reasonId })),
        debitNoteNumber: null,
        debitNoteDate: null,
      };
      state.purchaseReturns.push(created);
      return { status: 201, body: returnJson(created) };
    }],

    // Subcontractors
    ["GET", /^\/procurement\/subcontractors$/, ({ query }) => {
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const rows = state.subcontractors
        .filter((sc) => !search || `${sc.name} ${sc.code}`.toLowerCase().includes(search))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(subcontractorJson);
      return paginate(rows, query);
    }],
    ["GET", /^\/procurement\/subcontractors\/summary$/, () => ({
      registeredCount: state.subcontractors.length,
      activeAgreementCount: state.agreements.filter((a) => agreementEffectiveStatus(a) === "active").length,
      topRatedCount: state.subcontractors.filter((sc) => sc.status === "active" && Number(sc.rating) >= DEMO_RULES.topRatedThreshold).length,
      topRatedThreshold: DEMO_RULES.topRatedThreshold.toFixed(1),
      suspendedOrBlacklistedCount: state.subcontractors.filter((sc) => sc.status === "suspended").length,
    })],
    ["POST", /^\/procurement\/subcontractors$/, ({ body }) => {
      const v = createValidator();
      if (blank(body.name)) v.add("name", "Enter the contractor name.");
      if (!TRADE_SPECIALTIES.some((t) => t.id === body.tradeSpecialtyId)) v.add("tradeSpecialtyId", "Select a trade or specialty.");
      const gstin = String(body.gstin ?? "").trim().toUpperCase();
      const pan = String(body.pan ?? "").trim().toUpperCase();
      if (gstin && !GSTIN_PATTERN.test(gstin)) v.add("gstin", "Enter a 15-character GSTIN, e.g. 27ABCDE1234F1Z5.");
      if (pan && !PAN_PATTERN.test(pan)) v.add("pan", "Enter a 10-character PAN, e.g. ABCDE1234F.");
      if (!blank(body.email) && !isEmail(body.email)) v.add("email", "Enter a valid email address.");
      if (!blank(body.licenseExpiryDate)) requireDate(v, "licenseExpiryDate", body.licenseExpiryDate);
      const rating = body.initialRating;
      if (rating !== null && rating !== undefined && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) v.add("initialRating", "Choose a rating from 1 to 5.");
      v.throwIfAny();
      const n = nextNumber(state.subcontractors, "code", /SC-(\d+)/);
      const created = {
        id: `sc-${pad(n, 3)}`,
        code: `SC-${pad(n, 3)}`,
        name: body.name.trim(),
        firmName: String(body.firmName ?? "").trim(),
        tradeSpecialtyId: body.tradeSpecialtyId,
        gstin: gstin || null,
        pan: pan || null,
        contactPerson: String(body.contactPerson ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        email: String(body.email ?? "").trim(),
        address: String(body.address ?? "").trim(),
        licenseNumber: String(body.licenseNumber ?? "").trim(),
        licenseExpiryDate: body.licenseExpiryDate || null,
        rating: rating ? rating.toFixed(1) : null,
        status: "active",
      };
      state.subcontractors.push(created);
      return { status: 201, body: subcontractorJson(created) };
    }],

    // Subcontract agreements
    ["GET", /^\/procurement\/subcontract-agreements$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const rows = state.agreements
        .filter((a) => !status || agreementEffectiveStatus(a) === status)
        .sort((a, b) => b.agreementDate.localeCompare(a.agreementDate) || b.id.localeCompare(a.id))
        .map(agreementJson);
      return paginate(rows, query);
    }],
    ["GET", /^\/procurement\/subcontract-agreements\/summary$/, () => {
      const renewalCutoff = addDays(DEMO_TODAY, 30);
      return {
        activeCount: state.agreements.filter((a) => agreementEffectiveStatus(a) === "active").length,
        cumulativeValue: money(state.agreements.reduce((sum, a) => sum + a.agreementValuePaise, 0)),
        completedCount: state.agreements.filter((a) => a.status === "completed").length,
        completedPeriodLabel: "FY 2026-27",
        expiredOrPendingRenewalCount: state.agreements.filter(
          (a) => agreementEffectiveStatus(a) === "expired" || (agreementEffectiveStatus(a) === "active" && a.endDate <= renewalCutoff),
        ).length,
      };
    }],
    ["GET", /^\/procurement\/subcontract-agreements\/([^/]+)$/, ({ params }) => {
      const record = agreement(params[0]);
      if (!record) throw notFound("Subcontract agreement");
      return agreementDetailJson(record);
    }],
    ["POST", /^\/procurement\/subcontract-agreements\/([^/]+)\/status-changes$/, ({ params, body }) => {
      const record = agreement(params[0]);
      if (!record) throw notFound("Subcontract agreement");
      if (body.status !== "completed") {
        const v = createValidator();
        v.add("status", "Only completed is supported.");
        v.throwIfAny();
      }
      if (agreementEffectiveStatus(record) !== "active") {
        throw conflict("Only an active agreement can be marked completed.");
      }
      record.status = "completed";
      return agreementDetailJson(record);
    }],
    ["POST", /^\/procurement\/subcontract-agreements$/, ({ body }) => {
      const v = createValidator();
      const sc = subcontractor(body.subcontractorId);
      if (blank(body.title)) v.add("title", "Enter an agreement title.");
      if (!sc || sc.status !== "active") v.add("subcontractorId", "Select an active subcontractor.");
      if (!PROJECTS.some((p) => p.id === body.projectId)) v.add("projectId", "Select a project.");
      requireDate(v, "startDate", body.startDate);
      requireDate(v, "endDate", body.endDate);
      if (isDate(body.startDate) && isDate(body.endDate) && body.endDate < body.startDate) v.add("endDate", "End date cannot be before the start date.");
      if (!isMoney(body.agreementValue) || toPaise(body.agreementValue) <= 0) v.add("agreementValue", "Enter an agreement value greater than zero.");
      if (!PAYMENT_SCHEDULES.some((p) => p.id === body.paymentScheduleId)) v.add("paymentScheduleId", "Select a payment schedule.");
      const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds : [];
      if (attachmentIds.some((id) => !state.attachments.some((a) => a.id === id))) v.add("attachmentIds", "The attachment upload was not found. Upload it again.");
      v.throwIfAny();
      const n = nextNumber(state.agreements, "agreementNumber", /SCA\/26-27\/(\d+)/);
      const created = {
        id: `sca-${pad(n, 3)}`,
        agreementNumber: `SCA/26-27/${pad(n, 3)}`,
        agreementDate: DEMO_TODAY,
        subcontractorId: sc.id,
        projectId: body.projectId,
        title: body.title.trim(),
        scopeOfWork: blank(body.scopeOfWork) ? body.title.trim() : body.scopeOfWork.trim(),
        agreementValuePaise: toPaise(body.agreementValue),
        startDate: body.startDate,
        endDate: body.endDate,
        status: "active",
        paymentScheduleId: body.paymentScheduleId,
        termsAndConditions: String(body.termsAndConditions ?? ""),
        attachmentIds,
      };
      state.agreements.push(created);
      return { status: 201, body: agreementJson(created) };
    }],

    // Subcontract orders and bills (read only in the UI)
    ["GET", /^\/procurement\/subcontract-orders$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const rows = state.subcontractOrders
        .filter((o) => !status || o.status === status)
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.id.localeCompare(a.id))
        .map(subcontractOrderJson);
      return paginate(rows, query);
    }],
    ["GET", /^\/procurement\/subcontract-bills$/, ({ query }) => {
      const status = query.get("status") ?? "";
      const rows = state.subcontractBills
        .filter((b) => !status || b.status === status)
        .sort((a, b) => b.billDate.localeCompare(a.billDate) || b.id.localeCompare(a.id))
        .map(billJson);
      return { ...paginate(rows, query), retentionRatePercent: String(DEMO_RULES.retentionRatePercent) };
    }],
    ["GET", /^\/procurement\/subcontract-bills\/summary$/, () => {
      const month = DEMO_TODAY.slice(0, 7);
      return {
        billedThisMonth: money(state.subcontractBills.filter((b) => b.billDate.startsWith(month)).reduce((sum, b) => sum + b.billAmountPaise, 0)),
        pendingVerificationCount: state.subcontractBills.filter((b) => b.status === "submitted").length,
        approvedForPayment: money(state.subcontractBills.filter((b) => b.status === "approved").reduce((sum, b) => sum + billFigures(b).net, 0)),
        retentionHeld: money(state.subcontractBills.filter((b) => b.status !== "submitted").reduce((sum, b) => sum + billFigures(b).retention, 0)),
      };
    }],

    // Approvals
    ["GET", /^\/procurement\/approvals\/pending$/, ({ query }) => {
      const documentType = query.get("documentType") ?? "";
      const all = pendingApprovals();
      const rows = all.filter((a) => !documentType || a.documentType === documentType).map(pendingApprovalJson);
      return { ...paginate(rows, query), totalPending: all.length };
    }],
    ["POST", /^\/procurement\/approvals\/([^/]+)\/decisions$/, ({ params, body }) => {
      const approval = state.approvals.find((a) => a.id === params[0]);
      if (!approval) throw notFound("Approval request");
      const v = createValidator();
      if (!["approved", "rejected"].includes(body.decision)) v.add("decision", "Choose approve or reject.");
      if (body.decision === "rejected" && blank(body.comment)) v.add("comment", "Enter a reason for rejecting.");
      v.throwIfAny();
      if (approval.status !== "pending") throw conflict("This request has already been decided.");
      if (body.expectedVersion !== null && body.expectedVersion !== undefined && body.expectedVersion !== approval.version) {
        throw conflict("This request was changed by someone else. Reload and try again.");
      }
      approval.status = body.decision;
      approval.decidedAt = new Date().toISOString();
      approval.decidedBy = USERS.demo;
      approval.comment = blank(body.comment) ? null : body.comment.trim();
      approval.version += 1;
      applyDecision(approval);
      return historyJson(approval);
    }],
    ["GET", /^\/procurement\/approvals\/history$/, ({ query }) => paginate(decidedApprovals(query).map(historyJson), query)],
    ["GET", /^\/procurement\/approvals\/history\/export$/, ({ query }) => ({
      file: buildFile({
        title: "Approval History",
        sheetName: "Approval History",
        header: ["Document Type", "Document No", "Requested By", "Amount (INR)", "Submitted", "Decided", "Processed By", "Decision", "Comment"],
        rows: decidedApprovals(query).map((a) => {
          const json = historyJson(a);
          return [json.documentTypeLabel, json.document.number, json.requestedBy.displayName, Number(json.amount), json.submittedAt.slice(0, 10), json.decidedAt.slice(0, 10), json.decidedBy.displayName, json.decision, json.comment ?? ""];
        }),
        format: "xlsx",
        fileStem: "Approval_History",
      }),
    })],

    // Dashboard
    ["GET", /^\/procurement\/dashboard$/, () => {
      const month = DEMO_TODAY.slice(0, 7);
      const payables = state.suppliers.reduce((sum, s) => sum + Math.max(0, supplierClosingBalance(s)), 0);
      const pending = pendingApprovals();
      return {
        kpis: {
          purchaseValue: money(totalSpend()),
          pendingRequisitions: state.requisitions.filter((pr) => pr.status === "pending_approval").length,
          pendingOrders: state.purchaseOrders.filter((po) => ["draft", "sent", "partially_received"].includes(po.status)).length,
          pendingApprovals: pending.length,
          supplierPayables: money(payables),
          monthlySpend: money(state.purchaseOrders.filter((po) => countsAsSpend(po) && po.orderDate.startsWith(month)).reduce((sum, po) => sum + poTotal(po), 0)),
        },
        monthlySpend: spendByMonth(),
        categoryBreakdown: (() => {
          const { totalAmount, categories } = spendByCategory();
          return { totalAmount: money(totalAmount), categories };
        })(),
        recentOrders: [...state.purchaseOrders]
          .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.id.localeCompare(a.id))
          .slice(0, 5)
          .map((po) => ({ id: po.id, orderNumber: po.orderNumber, supplierName: supplier(po.supplierId).name, totalAmount: money(poTotal(po)), orderDate: po.orderDate, status: po.status })),
        pendingApprovals: pending.slice(0, 4).map((approval) => {
          const doc = approvalDocument(approval);
          return {
            id: approval.id,
            document: { type: approval.documentType, id: approval.documentId, number: doc.number },
            title: doc.description,
            subtitle: `${DOCUMENT_TYPE_LABELS[approval.documentType]} · ${approval.requestedBy.displayName}`,
            amount: doc.amount,
          };
        }),
      };
    }],

    // Reports
    ["GET", /^\/procurement\/reports\/definitions$/, ({ query }) => ({ items: REPORT_DEFINITIONS[query.get("group") ?? ""] ?? [] })],
    ["GET", /^\/procurement\/reports\/generated$/, ({ query }) =>
      paginate([...state.generatedReports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)).map(generatedReportJson), query, 5)],
    ["POST", /^\/procurement\/reports\/generate$/, ({ body }) => {
      const v = createValidator();
      const definition = REPORT_DEFINITIONS.purchase.find((d) => d.key === body.reportKey);
      if (!definition) v.add("reportKey", "Unknown report.");
      else if (!definition.formats.includes(body.format)) v.add("format", "This report is not available in that format.");
      if (body.periodId && !PERIOD_RANGES[body.periodId]) v.add("periodId", "Unknown reporting period.");
      v.throwIfAny();
      const report = createGeneratedReport({
        reportKey: body.reportKey,
        periodId: body.periodId || "rp-fy",
        format: body.format,
        generatedAt: new Date().toISOString(),
        readyAt: Date.now() + REPORT_READY_DELAY_MS,
      });
      return { status: 201, body: generatedReportJson(report) };
    }],
    ["GET", /^\/procurement\/reports\/generated\/([^/]+)\/file$/, ({ params }) => {
      const report = state.generatedReports.find((r) => r.id === params[0]);
      if (!report) throw notFound("Generated report");
      if (reportStatus(report) !== "ready") throw conflict("The report is still being generated.");
      return { file: report.file };
    }],
    ["GET", /^\/procurement\/reports\/supplier-overview$/, () => {
      const volume = new Map();
      for (const po of state.purchaseOrders.filter(countsAsSpend)) volume.set(po.supplierId, (volume.get(po.supplierId) ?? 0) + poTotal(po));
      const top = [...volume.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const axisStep = 10_00_000_00;
      const axisMax = Math.ceil((top[0]?.[1] ?? 0) / axisStep) * axisStep;
      const aging = state.suppliers
        .map((s) => ({ s, aging: agingFor(s) }))
        .filter(({ aging: a }) => a.total > 0)
        .sort((a, b) => b.aging.total - a.aging.total)
        .map(({ s, aging: a }) => ({
          supplier: party(s),
          bucket0To30: money(a.b0),
          bucket31To60: money(a.b31),
          bucket61To90: money(a.b61),
          bucket90Plus: money(a.b90),
          totalOutstanding: money(a.total),
        }));
      return {
        topSuppliersByVolume: { axisMax: money(axisMax), items: top.map(([id, amount]) => ({ supplier: party(supplier(id)), amount: money(amount) })) },
        paymentAging: { items: aging },
      };
    }],
    ["GET", /^\/procurement\/reports\/spend-analysis$/, () => {
      const spend = totalSpend();
      const spendOrders = state.purchaseOrders.filter(countsAsSpend);
      const linked = spendOrders.filter((po) => po.requisitionId);
      const estimates = linked.reduce((sum, po) => sum + requisition(po.requisitionId).lines.reduce((s, l) => s + l.estimatedCostPaise, 0), 0);
      const savings = linked.reduce(
        (sum, po) => sum + Math.max(0, requisition(po.requisitionId).lines.reduce((s, l) => s + l.estimatedCostPaise, 0) - poSubtotal(po)),
        0,
      );
      const average = spendOrders.length ? Math.round(spend / spendOrders.length) : 0;
      const change = (current, previous) => ((current - previous) / previous) * 100;
      const trend = (value, suffix, tone = "neutral") => ({
        direction: value >= 0 ? "up" : "down",
        tone,
        label: `${value >= 0 ? "+" : ""}${percent1(value)}% ${suffix}`,
      });
      const departmentTotals = DEPARTMENTS.map((d) => {
        const prs = state.requisitions.filter((pr) => pr.departmentId === d.id && pr.status !== "draft");
        return {
          departmentId: d.id,
          departmentName: d.name,
          requisitionCount: prs.length,
          totalPaise: prs.reduce((sum, pr) => sum + pr.lines.reduce((s, l) => s + l.estimatedCostPaise, 0), 0),
        };
      })
        .filter((d) => d.requisitionCount > 0)
        .sort((a, b) => b.totalPaise - a.totalPaise);
      const departmentShares = shares(departmentTotals.map((d) => d.totalPaise));
      const { categories } = spendByCategory();
      return {
        kpis: {
          totalAnnualSpend: { value: money(spend), trend: trend(change(spend, DEMO_RULES.previousYearSamePeriodSpendPaise), "vs same period last FY") },
          costSavings: {
            value: money(savings),
            trend: { direction: "up", tone: "positive", label: `${percent1(estimates ? (savings / estimates) * 100 : 0)}% below requisition estimates` },
          },
          averageOrderValue: { value: money(average), trend: trend(change(average, DEMO_RULES.previousYearAverageOrderValuePaise), "vs last FY") },
          budgetUtilization: {
            value: percent1((spend / DEMO_RULES.annualBudgetPaise) * 100),
            trend: { direction: null, tone: "neutral", label: `of ₹${(DEMO_RULES.annualBudgetPaise / 1_00_00_000_00).toFixed(2)} Cr demo budget` },
          },
        },
        categoryDistribution: categories,
        monthlyTrend: spendByMonth(),
        departments: departmentTotals.map((d, index) => ({
          departmentId: d.departmentId,
          departmentName: d.departmentName,
          requisitionCount: d.requisitionCount,
          totalValue: money(d.totalPaise),
          sharePercent: departmentShares[index],
        })),
      };
    }],
  ];

  function newApproval(documentType, documentId) {
    return {
      id: `apr-${pad(nextNumber(state.approvals, "id", /apr-(\d+)/), 3)}`,
      documentType,
      documentId,
      requestedBy: USERS.demo,
      submittedAt: new Date().toISOString(),
      status: "pending",
      version: 1,
      comment: null,
    };
  }

  /** Demo-only document transitions after a decision. Real approval effects are UNRESOLVED (contract §15). */
  function applyDecision(approval) {
    const approved = approval.status === "approved";
    const { record } = approvalDocument(approval);
    switch (approval.documentType) {
      case "purchaseRequisition":
        record.status = approved ? "approved" : "rejected";
        break;
      case "purchaseOrder":
        if (record.status === "draft") record.status = approved ? "sent" : "cancelled";
        break;
      case "subcontractBill":
        record.status = approved ? "approved" : "submitted";
        break;
      default:
        break;
    }
  }

  // ---------- demo controls ----------
  function demoControl(path, query) {
    switch (path) {
      case "/__demo/reset":
        state = createDemoState();
        seedGeneratedReports();
        return { ok: true, message: "Demo data reset to the seed state." };
      case "/__demo/session": {
        const value = query.get("state");
        if (value === "signed-out") state.signedIn = false;
        if (value === "signed-in") state.signedIn = true;
        return { ok: true, signedIn: state.signedIn };
      }
      case "/__demo/outage": {
        const value = query.get("state");
        if (value === "on") state.outage = true;
        if (value === "off") state.outage = false;
        return { ok: true, outage: state.outage };
      }
      case "/__demo/status":
        return {
          demo: true,
          today: DEMO_TODAY,
          signedIn: state.signedIn,
          outage: state.outage,
          counts: {
            suppliers: state.suppliers.length,
            requisitions: state.requisitions.length,
            purchaseOrders: state.purchaseOrders.length,
            invoices: state.invoices.length,
            returns: state.purchaseReturns.length,
            subcontractors: state.subcontractors.length,
            agreements: state.agreements.length,
            pendingApprovals: pendingApprovals().length,
            generatedReports: state.generatedReports.length,
          },
        };
      default:
        return null;
    }
  }

  // ---------- HTTP plumbing ----------
  function send(res, status, body, extraHeaders = {}) {
    const payload = body === null ? "" : JSON.stringify(body);
    res.writeHead(status, {
      ...(body === null ? {} : { "Content-Type": JSON_TYPE }),
      "Cache-Control": "no-store",
      "X-Demo-Data": "true",
      "X-Request-Id": `demo-${++state.requestSeq}`,
      ...extraHeaders,
    });
    res.end(payload);
  }

  function sendFile(res, file) {
    res.writeHead(200, {
      "Content-Type": file.contentType,
      "Content-Length": file.buffer.length,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "no-store",
      "X-Demo-Data": "true",
    });
    res.end(file.buffer);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(new DemoHttpError(413, "payload_too_large", "The request body is too large for the demo API."));
          req.destroy();
        } else chunks.push(chunk);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }

  function parseMultipart(buffer, contentType) {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
    if (!match) return {};
    const boundary = Buffer.from(`--${match[1] ?? match[2]}`);
    const fields = {};
    let start = buffer.indexOf(boundary);
    while (start !== -1) {
      const next = buffer.indexOf(boundary, start + boundary.length);
      if (next === -1) break;
      const part = buffer.subarray(start + boundary.length + 2, next - 2);
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd !== -1) {
        const headers = part.subarray(0, headerEnd).toString("utf8");
        const data = part.subarray(headerEnd + 4);
        const name = /;\s*name="([^"]*)"/i.exec(headers)?.[1];
        const fileName = /filename="([^"]*)"/i.exec(headers)?.[1];
        const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim();
        if (name) fields[name] = fileName !== undefined ? { fileName, contentType: type ?? "application/octet-stream", size: data.length, data } : data.toString("utf8");
      }
      start = next;
    }
    return fields;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  seedGeneratedReports();

  return async function handleDemoRequest(req, res) {
    const url = new URL(req.url ?? "/", "http://demo.local");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = (req.method ?? "GET").toUpperCase();

    try {
      const control = path.startsWith("/__demo/") ? demoControl(path, url.searchParams) : null;
      if (control) return send(res, 200, control);

      if (latencyMs > 0) await sleep(latencyMs);
      if (state.outage) throw new DemoHttpError(503, "demo_outage", "Simulated outage (demo). Turn it off at /demo-api/__demo/outage?state=off.");
      const isSessionChange = path === "/procurement/session" && (method === "POST" || method === "DELETE");
      if (!state.signedIn && !isSessionChange) {
        throw new DemoHttpError(401, "unauthenticated", "Demo session is signed out. Sign in with demo / demo123, or open /demo-api/__demo/session?state=signed-in.");
      }

      const route = routes.find(([routeMethod, pattern]) => routeMethod === method && pattern.test(path));
      if (!route) {
        const pathExists = routes.some(([, pattern]) => pattern.test(path));
        throw new DemoHttpError(pathExists ? 405 : 404, "demo_not_implemented", `The demo API does not implement ${method} ${path}.`);
      }

      const idempotencyKey = req.headers["idempotency-key"];
      const cacheKey = idempotencyKey ? `${method} ${path} ${idempotencyKey}` : null;
      if (cacheKey && state.idempotency.has(cacheKey)) {
        const cached = state.idempotency.get(cacheKey);
        return send(res, cached.status, cached.body, { "Idempotent-Replayed": "true" });
      }

      let body = {};
      let multipart = null;
      if (method === "POST") {
        const raw = await readBody(req);
        const type = req.headers["content-type"] ?? "";
        if (type.startsWith("multipart/form-data")) multipart = parseMultipart(raw, type);
        else if (raw.length > 0) {
          try {
            body = JSON.parse(raw.toString("utf8"));
          } catch {
            throw new DemoHttpError(400, "invalid_json", "The request body is not valid JSON.");
          }
        }
      }

      const params = route[1].exec(path).slice(1);
      const result = route[2]({ params, query: url.searchParams, body: body ?? {}, multipart });
      if (result?.file) return sendFile(res, result.file);
      const status = result?.status && result.body !== undefined ? result.status : 200;
      const payload = result?.status && result.body !== undefined ? result.body : result;
      if (cacheKey) state.idempotency.set(cacheKey, { status, body: payload });
      return send(res, status, payload);
    } catch (error) {
      if (error instanceof DemoHttpError) {
        return send(res, error.status, {
          error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors, requestId: `demo-${state.requestSeq + 1}` },
        });
      }
      console.error("[demo-api]", error);
      return send(res, 500, { error: { code: "demo_internal_error", message: "The demo API hit an unexpected error. See the terminal." } });
    }
  };
}
