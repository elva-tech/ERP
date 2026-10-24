// DEMO ONLY. Builds a fresh in-memory dataset. Every call returns new objects, so "reset" is just calling it again.
import { DEMO_RULES, DEMO_TODAY, ITEMS, SUBCONTRACTORS, SUPPLIERS, USERS } from "./catalog.mjs";

const pad = (n, width) => String(n).padStart(width, "0");
const rupees = (value) => Math.round(value * 100);

function poLine(poId, index, itemKey, quantity) {
  const item = ITEMS[itemKey];
  return {
    lineId: `${poId}-L${index + 1}`,
    itemKey,
    description: item.description,
    quantity,
    unitId: item.unitId,
    unitPricePaise: rupees(item.price),
  };
}

// [n, supplier n, order date, status, lines [[item, qty]], requisition n | null, delivery date, payment term]
const PURCHASE_ORDERS = [
  [1, 1, "2026-04-08", "completed", [["tmt12", 40]], 1, "2026-04-20"],
  [2, 2, "2026-04-15", "completed", [["opc53", 2000], ["agg20", 300]], 2, "2026-04-25"],
  [3, 3, "2026-04-22", "completed", [["xlpe95", 800], ["db12", 12]], 3, "2026-05-05"],
  [4, 1, "2026-05-06", "completed", [["ismb200", 25]], null, "2026-05-18"],
  [5, 5, "2026-05-12", "completed", [["helmet", 300], ["shoes", 300]], 4, "2026-05-22"],
  [6, 4, "2026-05-20", "completed", [["cpvc25", 1500], ["valve50", 60]], null, "2026-06-01"],
  [7, 1, "2026-06-03", "completed", [["tmt12", 55], ["msplate10", 10]], 5, "2026-06-15"],
  [8, 7, "2026-06-10", "completed", [["ismb200", 30]], null, "2026-06-24"],
  [9, 6, "2026-06-18", "completed", [["trailer", 12]], null, "2026-06-30"],
  [10, 8, "2026-07-02", "completed", [["agg20", 900], ["msand", 600]], 6, "2026-07-14"],
  [11, 1, "2026-07-14", "completed", [["tmt12", 60]], null, "2026-07-26"],
  [12, 9, "2026-07-21", "partially_received", [["xlpe95", 1200], ["flood200", 40]], 7, "2026-08-10"],
  [13, 2, "2026-08-04", "partially_received", [["opc53", 3500]], null, "2026-08-20"],
  [14, 1, "2026-08-11", "partially_received", [["ismb200", 40], ["msplate10", 15]], 8, "2026-09-05"],
  [15, 11, "2026-08-25", "completed", [["harness", 120], ["helmet", 200]], null, "2026-09-02"],
  [16, 4, "2026-09-01", "partially_received", [["gi50", 900], ["valve50", 80]], null, "2026-09-25"],
  [17, 1, "2026-09-15", "partially_received", [["tmt12", 70]], 9, "2026-10-10"],
  [18, 3, "2026-09-22", "sent", [["db12", 20], ["flood200", 30]], 10, "2026-10-28"],
  [19, 7, "2026-10-05", "sent", [["msplate10", 20]], null, "2026-10-30"],
  [20, 6, "2026-10-09", "sent", [["crane", 15]], null, "2026-11-05"],
  [21, 8, "2026-10-14", "draft", [["msand", 800]], 11, "2026-11-10"],
  [22, 5, "2026-10-17", "draft", [["shoes", 250], ["harness", 60]], null, "2026-11-08"],
  [23, 1, "2026-10-19", "sent", [["tmt12", 30]], null, "2026-11-12"],
  [24, 10, "2026-05-28", "cancelled", [["cpvc25", 800]], null, "2026-06-10"],
];

const RECEIVED_RATIO = { completed: 1, partially_received: 0.6, sent: 0, draft: 0, cancelled: 0 };

// [n, request date, requester key, department, priority, status, title, lines (when not linked to a PO)]
const REQUISITIONS = [
  [1, "2026-04-02", "neha", "dept-projects", "high", "approved", "TMT bars for Tower B podium slab"],
  [2, "2026-04-09", "neha", "dept-projects", "medium", "approved", "Cement and aggregate for podium works"],
  [3, "2026-04-16", "vikram", "dept-maintenance", "medium", "approved", "Cabling for site distribution boards"],
  [4, "2026-05-06", "rohit", "dept-qa", "high", "approved", "PPE replenishment for Q1 audit"],
  [5, "2026-05-27", "neha", "dept-projects", "high", "approved", "Reinforcement steel, floors 1-4"],
  [6, "2026-06-25", "neha", "dept-projects", "medium", "approved", "Aggregates for logistics park roads"],
  [7, "2026-07-14", "vikram", "dept-maintenance", "medium", "approved", "Yard cabling and flood lighting"],
  [8, "2026-08-04", "neha", "dept-projects", "high", "approved", "Structural steel for depot sheds"],
  [9, "2026-09-08", "neha", "dept-projects", "high", "approved", "Reinforcement steel, floors 5-8"],
  [10, "2026-09-15", "vikram", "dept-maintenance", "low", "approved", "Distribution boards and lights, block C"],
  [11, "2026-10-06", "neha", "dept-projects", "medium", "approved", "M-sand for plastering, Tower B"],
  [12, "2026-10-08", "sana", "dept-stores", "low", "approved", "Stores racking hardware", [["Heavy-duty storage rack, 5 tier", 12, "unit-nos", 186000]]],
  [13, "2026-10-10", "rohit", "dept-qa", "medium", "approved", "Calibration weights for site lab", [["Calibration weight set, class M1", 4, "unit-nos", 74000]]],
  [14, "2026-10-12", "neha", "dept-projects", "high", "pending_approval", "Shuttering plywood for floors 9-12", [["Shuttering plywood, 12 mm", 600, "unit-nos", 1104000]]],
  [15, "2026-10-14", "vikram", "dept-maintenance", "medium", "pending_approval", "DG set annual maintenance spares", [["DG set filter and service kit", 6, "unit-nos", 252000]]],
  [16, "2026-10-15", "sana", "dept-stores", "low", "pending_approval", "Packing material for returns", [["Stretch film roll, 23 micron", 80, "unit-nos", 52000]]],
  [17, "2026-10-16", "rohit", "dept-qa", "high", "pending_approval", "Concrete cube testing moulds", [["Cube mould, 150 mm cast iron", 40, "unit-nos", 168000]]],
  [18, "2026-10-18", "neha", "dept-projects", "medium", "pending_approval", "Waterproofing chemicals, basement", [["Crystalline waterproofing compound", 90, "unit-bag", 405000]]],
  [19, "2026-10-20", "vikram", "dept-maintenance", "high", "pending_approval", "Replacement pump for dewatering", [["Submersible dewatering pump, 10 HP", 2, "unit-nos", 318000]]],
  [20, "2026-06-11", "sana", "dept-stores", "low", "rejected", "Office furniture for site office", [["Workstation desk with drawer", 15, "unit-nos", 270000]]],
  [21, "2026-08-19", "vikram", "dept-maintenance", "medium", "rejected", "Second welding generator", [["Diesel welding generator, 400 A", 1, "unit-nos", 485000]]],
  [22, "2026-09-29", "rohit", "dept-qa", "low", "rejected", "Additional lab printers", [["Laser printer, A4 mono", 3, "unit-nos", 66000]]],
  [23, "2026-10-19", "neha", "dept-projects", "medium", "pending_approval", "Scaffolding couplers top-up", [["Scaffolding coupler, forged", 500, "unit-nos", 230000]]],
  [24, "2026-10-21", "sana", "dept-stores", "low", "pending_approval", "Spill kits for stores", [["Oil spill kit, 50 litre", 6, "unit-nos", 57000]]],
];

const REJECTION_COMMENTS = {
  20: "Existing furniture can be relocated from the closed site office.",
  21: "Hire a generator for the peak period instead of buying.",
  22: "Use the shared printer in the site office.",
};

// [n, PO n, supplier invoice no. suffix, invoice date, share of PO value, status, paid date]
const INVOICES = [
  [1, 1, "0112", "2026-04-18", 1, "paid", "2026-06-01"],
  [2, 2, "0087", "2026-04-24", 1, "paid", "2026-05-22"],
  [3, 3, "0203", "2026-05-02", 1, "paid", "2026-05-30"],
  [4, 4, "0139", "2026-05-16", 1, "paid", "2026-06-29"],
  [5, 5, "0045", "2026-05-21", 1, "paid", "2026-06-19"],
  [6, 6, "0071", "2026-05-30", 1, "paid", "2026-07-12"],
  [7, 7, "0164", "2026-06-12", 0.5, "paid", "2026-07-25"],
  [8, 7, "0171", "2026-06-26", 0.5, "paid", "2026-08-08"],
  [9, 8, "0032", "2026-06-22", 1, "paid", "2026-08-20"],
  [10, 9, "0118", "2026-06-30", 1, "partially_paid", "2026-08-28"],
  [11, 10, "0054", "2026-07-12", 1, "paid", "2026-08-10"],
  [12, 11, "0198", "2026-07-24", 1, "partially_paid", "2026-09-05"],
  [13, 12, "0091", "2026-08-06", 0.6, "overdue", null],
  [14, 13, "0142", "2026-08-14", 0.6, "overdue", null],
  [15, 14, "0223", "2026-09-10", 0.6, "overdue", null],
  [16, 15, "0019", "2026-09-04", 1, "paid", "2026-10-03"],
  [17, 16, "0098", "2026-09-18", 0.6, "draft", null],
  [18, 17, "0241", "2026-09-28", 0.6, "draft", null],
  [19, 14, "0256", "2026-10-12", 0.2, "draft", null],
  [20, 13, "0158", "2026-10-16", 0.2, "draft", null],
];

// [n, PO n, return date, [[line index, qty, reason]], resolution, status]
const RETURNS = [
  [1, 1, "2026-04-25", [[0, 1.5, "rr-spec"]], "refund", "credit_note_issued"],
  [2, 5, "2026-05-28", [[0, 20, "rr-damaged"]], "refund", "credit_note_issued"],
  [3, 7, "2026-06-20", [[1, 0.8, "rr-quality"]], "refund", "credit_note_issued"],
  [4, 10, "2026-07-20", [[0, 40, "rr-excess"]], "refund", "rejected"],
  [5, 12, "2026-08-18", [[1, 4, "rr-damaged"]], "replacement", "pending_approval"],
  [6, 14, "2026-09-05", [[0, 1.2, "rr-spec"]], "refund", "pending_approval"],
  [7, 16, "2026-09-25", [[1, 6, "rr-quality"]], "replacement", "pending_approval"],
  [8, 13, "2026-10-10", [[0, 120, "rr-damaged"]], "replacement", "rejected"],
];

// [n, subcontractor n, project, title/scope, value (rupees), agreement date, start, end, status, payment schedule]
const AGREEMENTS = [
  [1, 1, "prj-001", "RCC framework, Tower B floors 1-12", 48500000, "2026-04-05", "2026-04-10", "2027-03-31", "active", "ps-monthly"],
  [2, 2, "prj-001", "MEP rough-in and first fix, Tower B", 21800000, "2026-05-02", "2026-05-15", "2027-02-28", "active", "ps-monthly"],
  [3, 3, "prj-002", "Roof waterproofing, warehouse blocks A-C", 6450000, "2026-04-18", "2026-04-20", "2026-08-31", "completed", "ps-milestone"],
  [4, 4, "prj-001", "Lobby and amenity interior finishing", 9800000, "2026-07-08", "2026-08-01", "2027-01-31", "active", "ps-milestone"],
  [5, 5, "prj-003", "Depot inspection pit structural works", 17500000, "2026-06-01", "2026-06-10", "2026-11-15", "active", "ps-monthly"],
  [6, 6, "prj-002", "Yard lighting and cable trenching", 5200000, "2025-11-20", "2025-12-01", "2026-06-30", "expired", "ps-monthly"],
  [7, 7, "prj-003", "Depot plumbing and drainage", 7350000, "2026-08-12", "2026-08-20", "2027-02-15", "active", "ps-advance"],
  [8, 8, "prj-001", "Facade glazing, Tower B", 26400000, "2026-09-03", "2026-09-15", "2027-06-30", "active", "ps-milestone"],
  [9, 9, "prj-002", "Site grading and excavation, phase 1", 3900000, "2026-03-10", "2026-03-15", "2026-07-15", "completed", "ps-milestone"],
];

// [n, agreement n, description, value (rupees), order date, delivery date, status, progress %]
const SUBCONTRACT_ORDERS = [
  [1, 1, "Columns and slabs, floors 1-4", 14200000, "2026-04-15", "2026-08-31", "completed", "100"],
  [2, 1, "Columns and slabs, floors 5-8", 15600000, "2026-08-20", "2026-12-15", "active", "45"],
  [3, 2, "Conduiting and sleeves, floors 1-6", 7400000, "2026-05-20", "2026-10-31", "active", "80"],
  [4, 3, "Membrane waterproofing, block A", 2300000, "2026-04-25", "2026-06-15", "completed", "100"],
  [5, 5, "Inspection pit excavation and PCC", 6100000, "2026-06-15", "2026-09-30", "completed", "100"],
  [6, 5, "Pit walls and base slab", 8900000, "2026-09-25", "2026-11-15", "active", "30"],
  [7, 4, "Lobby false ceiling and flooring", 4200000, "2026-08-05", "2026-11-30", "active", "55"],
  [8, 7, "Underground drainage network", 3600000, "2026-10-12", "2026-12-20", "draft", null],
  [9, 6, "Cable trenching, zone 3", 1400000, "2026-04-12", "2026-05-30", "cancelled", "20"],
  [10, 8, "Facade brackets and anchors", 5800000, "2026-09-20", "2026-12-31", "active", "15"],
];

// [n, order n, bill date, amount (rupees), status]
const SUBCONTRACT_BILLS = [
  [1, 1, "2026-05-31", 4800000, "paid"],
  [2, 1, "2026-07-05", 5200000, "paid"],
  [3, 1, "2026-09-02", 4200000, "paid"],
  [4, 3, "2026-07-31", 3100000, "paid"],
  [5, 4, "2026-06-20", 2300000, "paid"],
  [6, 5, "2026-08-10", 3500000, "paid"],
  [7, 5, "2026-10-03", 2600000, "approved"],
  [8, 3, "2026-10-06", 2800000, "verified"],
  [9, 2, "2026-10-10", 6900000, "verified"],
  [10, 7, "2026-10-15", 2300000, "submitted"],
  [11, 6, "2026-10-18", 2650000, "submitted"],
];

const supplierId = (n) => `sup-${pad(n, 3)}`;
const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const at = (isoDate, time) => `${isoDate}T${time}:00+05:30`;
const round3 = (value) => Math.round(value * 1000) / 1000;

export function createDemoState() {
  const suppliers = SUPPLIERS.map((supplier) => ({ ...supplier }));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  let receiptSeq = 0;
  const purchaseOrders = PURCHASE_ORDERS.map(([n, sup, orderDate, status, lines, reqN, deliveryDate]) => {
    const id = `po-${pad(n, 3)}`;
    const poLines = lines.map(([itemKey, qty], index) => poLine(id, index, itemKey, qty));
    const ratio = RECEIVED_RATIO[status];
    const receivedDate = deliveryDate < DEMO_TODAY ? deliveryDate : addDays(orderDate, 7);
    const receipts =
      ratio > 0
        ? [
            {
              id: `grn-${pad(++receiptSeq, 3)}`,
              receiptNumber: `GRN/26-27/${pad(receiptSeq, 4)}`,
              receivedDate,
              lines: poLines.map((line) => ({ lineId: line.lineId, quantity: round3(line.quantity * ratio) })),
              recordedBy: USERS.sana,
              recordedAt: at(receivedDate, "16:20"),
            },
          ]
        : [];
    return {
      id,
      orderNumber: `PO/26-27/${pad(n, 4)}`,
      orderDate,
      supplierId: supplierId(sup),
      requisitionId: reqN ? `pr-${pad(reqN, 3)}` : null,
      deliveryDate,
      paymentTermId: supplierById.get(supplierId(sup)).paymentTermId,
      status,
      receipts,
      lines: poLines,
      shippingAddress: "Central Stores, Demo Industrial Estate",
      notes: "",
      createdBy: USERS.demo,
    };
  });
  const poById = new Map(purchaseOrders.map((po) => [po.id, po]));

  const requisitions = REQUISITIONS.map(([n, requestDate, requester, departmentId, priority, status, title, ownLines]) => {
    const id = `pr-${pad(n, 3)}`;
    const linkedPo = purchaseOrders.find((po) => po.requisitionId === id);
    const lines = linkedPo
      ? linkedPo.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitId: line.unitId,
          estimatedCostPaise: Math.round(line.quantity * line.unitPricePaise * 1.06),
        }))
      : ownLines.map(([description, quantity, unitId, costRupees]) => ({
          description,
          quantity,
          unitId,
          estimatedCostPaise: rupees(costRupees),
        }));
    return {
      id,
      requisitionNumber: `PR/26-27/${pad(n, 4)}`,
      requestDate,
      requestedBy: USERS[requester],
      departmentId,
      title,
      priority,
      status,
      requiredDate: addDays(requestDate, 14),
      lines,
      justification: `${title} (demo record).`,
      approverId: USERS.kavita.id,
    };
  });

  let paymentSeq = 0;
  let journalSeq = 0;
  const invoices = INVOICES.map(([n, poN, suffix, invoiceDate, share, status, paidDate]) => {
    const po = poById.get(`po-${pad(poN, 3)}`);
    const supplier = supplierById.get(po.supplierId);
    const lines = po.lines.map((line) => ({
      description: line.description,
      quantity: round3(line.quantity * share),
      ratePaise: line.unitPricePaise,
    }));
    const taxablePaise = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.ratePaise), 0);
    const term = { "pt-net30": 30, "pt-net45": 45, "pt-net60": 60 }[po.paymentTermId];
    const isPaid = status === "paid" || status === "partially_paid";
    const net =
      taxablePaise +
      Math.round((taxablePaise * DEMO_RULES.gstRatePercent) / 100) -
      Math.round((taxablePaise * DEMO_RULES.tdsRatePercent) / 100);
    const payments = isPaid
      ? [
          {
            id: `pay-${pad(++paymentSeq, 3)}`,
            voucherNumber: `PAY/26-27/${pad(paymentSeq, 4)}`,
            paymentDate: paidDate,
            amountPaise: status === "paid" ? net : Math.round(net / 2),
            transactionId: `DEMO-UTR-${pad(paymentSeq * 7919, 6)}`,
            recordedBy: USERS.arjun,
            recordedAt: at(paidDate, "15:10"),
          },
        ]
      : [];
    return {
      id: `inv-${pad(n, 3)}`,
      invoiceNumber: `${supplier.invoicePrefix}/26-27/${suffix}`,
      invoiceDate,
      dueDate: addDays(invoiceDate, term),
      supplierId: po.supplierId,
      purchaseOrderId: po.id,
      lines,
      taxablePaise,
      taxRatePercent: DEMO_RULES.gstRatePercent,
      status,
      payments,
      tdsVoucher: isPaid ? `JV/26-27/${pad(++journalSeq, 4)}` : null,
      attachmentIds: [],
    };
  });

  let debitNoteSeq = 0;
  const purchaseReturns = RETURNS.map(([n, poN, returnDate, lines, resolution, status]) => {
    const po = poById.get(`po-${pad(poN, 3)}`);
    return {
      id: `ret-${pad(n, 3)}`,
      returnNumber: `PRN/26-27/${pad(n, 4)}`,
      returnDate,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      resolution,
      status,
      notes: "",
      lines: lines.map(([lineIndex, quantity, reasonId]) => ({ lineId: po.lines[lineIndex].lineId, quantity, reasonId })),
      debitNoteNumber: status === "credit_note_issued" ? `DN/26-27/${pad(++debitNoteSeq, 4)}` : null,
      debitNoteDate: status === "credit_note_issued" ? addDays(returnDate, 7) : null,
    };
  });

  const subcontractors = SUBCONTRACTORS.map((sc) => ({ ...sc }));

  const agreements = AGREEMENTS.map(([n, scN, projectId, title, value, agreementDate, startDate, endDate, status, paymentScheduleId]) => ({
    id: `sca-${pad(n, 3)}`,
    agreementNumber: `SCA/26-27/${pad(n, 3)}`,
    agreementDate,
    subcontractorId: `sc-${pad(scN, 3)}`,
    projectId,
    title,
    scopeOfWork: title,
    agreementValuePaise: rupees(value),
    startDate,
    endDate,
    status,
    paymentScheduleId,
    termsAndConditions: "",
  }));
  const agreementById = new Map(agreements.map((a) => [a.id, a]));

  const subcontractOrders = SUBCONTRACT_ORDERS.map(([n, agN, description, value, orderDate, deliveryDate, status, progressPercent]) => {
    const agreement = agreementById.get(`sca-${pad(agN, 3)}`);
    return {
      id: `sco-${pad(n, 3)}`,
      orderNumber: `SCO/26-27/${pad(n, 3)}`,
      orderDate,
      subcontractorId: agreement.subcontractorId,
      agreementId: agreement.id,
      description,
      orderValuePaise: rupees(value),
      deliveryDate,
      status,
      progressPercent,
    };
  });
  const orderById = new Map(subcontractOrders.map((o) => [o.id, o]));

  const subcontractBills = SUBCONTRACT_BILLS.map(([n, orderN, billDate, amount, status]) => {
    const order = orderById.get(`sco-${pad(orderN, 3)}`);
    return {
      id: `scb-${pad(n, 3)}`,
      billNumber: `SCB/26-27/${pad(n, 3)}`,
      billDate,
      subcontractorId: order.subcontractorId,
      orderId: order.id,
      billAmountPaise: rupees(amount),
      status,
    };
  });

  const approvals = [];
  let approvalSeq = 0;
  const addApproval = (fields) => approvals.push({ id: `apr-${pad(++approvalSeq, 3)}`, version: 1, comment: null, ...fields });

  for (const pr of requisitions) {
    if (pr.status === "draft") continue;
    const submittedAt = at(pr.requestDate, "10:15");
    const base = { documentType: "purchaseRequisition", documentId: pr.id, requestedBy: pr.requestedBy, submittedAt };
    if (pr.status === "pending_approval") addApproval({ ...base, status: "pending" });
    else {
      const decision = pr.status === "approved" ? "approved" : "rejected";
      const n = Number(pr.id.slice(3));
      addApproval({
        ...base,
        status: decision,
        decidedAt: at(addDays(pr.requestDate, 2), "16:40"),
        decidedBy: USERS.kavita,
        comment: decision === "rejected" ? REJECTION_COMMENTS[n] : "Approved within budget.",
      });
    }
  }
  for (const po of purchaseOrders) {
    const submittedAt = at(po.orderDate, "11:30");
    const base = { documentType: "purchaseOrder", documentId: po.id, requestedBy: USERS.demo, submittedAt };
    if (po.status === "draft") addApproval({ ...base, status: "pending" });
    else if (po.status === "cancelled") {
      addApproval({ ...base, status: "rejected", decidedAt: at(addDays(po.orderDate, 1), "12:05"), decidedBy: USERS.arjun, comment: "Supplier is inactive; re-source from an approved vendor." });
    } else {
      addApproval({ ...base, status: "approved", decidedAt: at(addDays(po.orderDate, 1), "15:20"), decidedBy: USERS.arjun, comment: null });
    }
  }
  for (const bill of subcontractBills) {
    const submittedAt = at(addDays(bill.billDate, 2), "09:45");
    const base = { documentType: "subcontractBill", documentId: bill.id, requestedBy: USERS.neha, submittedAt };
    if (bill.status === "verified") addApproval({ ...base, status: "pending" });
    else if (bill.status === "approved" || bill.status === "paid") {
      addApproval({ ...base, status: "approved", decidedAt: at(addDays(bill.billDate, 4), "17:10"), decidedBy: USERS.kavita, comment: "Measurements verified on site." });
    }
  }
  const performance = {
    // [supplier n, on-time %, quality /100, rejection %, avg response hrs, overall rating] for Q2; null row = insufficient data
    "pp-q2": [
      [1, 96.8, 94, 1.2, 5.5, 4.6], [2, 92.4, 91, 2.1, 8, 4.3], [3, 98.4, 96, 0.8, 4, 4.8], [4, 88.1, 87, 3.6, 12.5, 3.8],
      [5, 99.1, 95, 1.0, 6, 4.7], [6, 90.2, 89, 1.9, 3.5, 4.2], [7, 85.6, 84, 4.4, 18, 3.4], [8, 91.3, 90, 2.5, 9.5, 4.1],
      [9, 93.9, 93, 1.6, 7, 4.4], [11, null],
    ],
    "pp-q1": [
      [1, 95.2, 93, 1.5, 6, 4.5], [2, 90.8, 90, 2.6, 9, 4.1], [3, 97.1, 95, 1.1, 4.5, 4.7], [4, 86.4, 86, 4.1, 14, 3.6],
      [5, 97.6, 94, 1.3, 6.5, 4.6], [6, 89.5, 88, 2.2, 4, 4.1], [7, 83.9, 82, 5.0, 20, 3.2], [8, 89.7, 89, 2.9, 10, 4.0],
      [9, null], [11, null],
    ],
  };

  const generatedReports = [];

  return {
    suppliers,
    purchaseOrders,
    requisitions,
    invoices,
    purchaseReturns,
    subcontractors,
    agreements,
    subcontractOrders,
    subcontractBills,
    approvals,
    performance,
    generatedReports,
    attachments: [],
    idempotency: new Map(),
    signedIn: true,
    outage: false,
    requestSeq: 0,
  };
}

export { addDays, at, pad };
