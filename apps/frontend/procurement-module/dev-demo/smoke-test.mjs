// DEMO ONLY. Exercises every demo endpoint, then resets the demo data.
// Usage (demo API must be running):  node dev-demo/smoke-test.mjs [baseUrl]
// Default baseUrl: http://127.0.0.1:4599/demo-api  (use http://localhost:5299/demo-api for the Vite demo)
const BASE = (process.argv[2] ?? "http://127.0.0.1:4599/demo-api").replace(/\/+$/, "");
const P = "/procurement";
let failures = 0;
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ""}`);
  }
}

async function call(method, path, { body, form, key } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  const response = await fetch(`${BASE}${path}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const type = response.headers.get("content-type") ?? "";
  if (response.status === 204) return { status: 204, data: null, headers: response.headers };
  const data = type.includes("json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, headers: response.headers };
}

function isPage(data, label) {
  const ok = Array.isArray(data?.items) && Number.isInteger(data?.pagination?.totalItems) && Number.isInteger(data?.pagination?.totalPages);
  check(`${label} is a page`, ok, JSON.stringify(data).slice(0, 160));
  return ok;
}

async function list(path, label, expectItems = true) {
  const { status, data } = await call("GET", path);
  check(`${label} 200`, status === 200, `got ${status} ${JSON.stringify(data).slice(0, 200)}`);
  if (isPage(data, label) && expectItems) check(`${label} has rows`, data.items.length > 0);
  return data;
}

async function get(path, label) {
  const { status, data } = await call("GET", path);
  check(`${label} 200`, status === 200, `got ${status} ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function download(path, label, signature) {
  const { status, data, headers } = await call("GET", path);
  check(`${label} 200`, status === 200, `got ${status}`);
  check(`${label} filename`, /filename="[^"]+"/.test(headers.get("content-disposition") ?? ""));
  check(`${label} signature`, Buffer.isBuffer(data) && data.subarray(0, signature.length).toString("latin1") === signature);
}

async function main() {
  await get("/__demo/reset", "reset");

  const session = await get(`${P}/session`, "session");
  check("session is labelled DEMO", session.user?.roleLabel?.includes("DEMO"));

  const lookupKeys = ["supplierCategories", "paymentTerms", "departments", "requisitionPriorities", "approvers", "units", "suppliers",
    "approvedRequisitions", "purchaseOrders", "returnReasons", "subcontractors", "projects", "tradeSpecialties", "paymentSchedules",
    "reportingPeriods", "performancePeriods"];
  const lookups = {};
  for (const key of lookupKeys) {
    lookups[key] = await get(`${P}/lookups/${key}`, `lookup ${key}`);
    check(`lookup ${key} has options`, Array.isArray(lookups[key].options) && lookups[key].options.length > 0);
  }

  // Lists with the UI's default filters
  await list(`${P}/suppliers?page=1&pageSize=8&status=active`, "suppliers");
  await list(`${P}/suppliers?page=2&pageSize=8&search=steel`, "suppliers search page 2", false);
  await list(`${P}/purchase-requisitions?page=1&pageSize=8&status=pending_approval`, "requisitions");
  await list(`${P}/purchase-orders?page=1&pageSize=8&status=sent`, "purchase orders");
  await list(`${P}/purchase-invoices?page=1&pageSize=8&status=draft`, "invoices");
  await list(`${P}/purchase-returns?page=1&pageSize=8`, "returns");
  await list(`${P}/subcontractors?page=1&pageSize=8`, "subcontractors");
  await list(`${P}/subcontract-agreements?page=1&pageSize=8`, "agreements");
  await list(`${P}/subcontract-orders?page=1&pageSize=8&status=active`, "subcontract orders");
  const bills = await list(`${P}/subcontract-bills?page=1&pageSize=8`, "subcontract bills");
  check("bills retention rate", bills.retentionRatePercent === "5");
  await list(`${P}/approvals/history?page=1&pageSize=8&dateRange=last_30_days`, "approval history");
  await list(`${P}/reports/generated?page=1&pageSize=5`, "generated reports");
  const perf = await list(`${P}/supplier-performance?page=1&pageSize=8&periodId=pp-q2`, "supplier performance");
  check("performance highlights", perf.highlights?.bestDelivery?.supplier?.name);

  for (const path of ["purchase-invoices/summary", "purchase-returns/summary", "subcontractors/summary", "subcontract-agreements/summary",
    "subcontract-bills/summary", "dashboard", "reports/supplier-overview", "reports/spend-analysis", "reports/definitions?group=purchase"]) {
    await get(`${P}/${path}`, path);
  }

  // Ledger
  const ledger = await list(`${P}/suppliers/sup-001/ledger?page=1&pageSize=20`, "ledger");
  check("ledger summary", ledger.summary?.closingBalance !== undefined);
  await list(`${P}/suppliers/sup-001/ledger?page=1&pageSize=20&fromDate=2026-07-01&toDate=2026-09-30`, "ledger date range", false);
  const statement = await get(`${P}/suppliers/sup-001/statement`, "statement");
  check("statement outstanding equals ledger closing", statement.totals?.outstanding === ledger.summary?.closingBalance,
    `${statement.totals?.outstanding} vs ${ledger.summary?.closingBalance}`);
  await download(`${P}/suppliers/sup-001/ledger/export?format=xlsx`, "ledger xlsx", "PK");
  await download(`${P}/suppliers/sup-001/ledger/export?format=pdf`, "ledger pdf", "%PDF");
  await download(`${P}/approvals/history/export?dateRange=last_30_days`, "history xlsx", "PK");

  // Writes
  const supplier = await call("POST", `${P}/suppliers`, {
    key: "smoke-sup",
    body: { name: "Smoke Test Supplies", categoryId: lookups.supplierCategories.options[0].value, paymentTermId: "pt-net30",
      gstin: "", pan: "", contactPerson: "", phone: "", email: "", address: "", city: "", state: "" },
  });
  check("create supplier 201", supplier.status === 201, JSON.stringify(supplier.data).slice(0, 200));
  const replay = await call("POST", `${P}/suppliers`, { key: "smoke-sup", body: { name: "Different" } });
  check("idempotent replay", replay.headers.get("idempotent-replayed") === "true" && replay.data.id === supplier.data.id);
  const invalid = await call("POST", `${P}/suppliers`, { body: { name: "" } });
  check("supplier validation 422", invalid.status === 422 && invalid.data.error?.fieldErrors?.name);
  const toggle = await call("POST", `${P}/suppliers/${supplier.data.id}/status-changes`, { body: { status: "inactive" } });
  check("supplier status change", toggle.status === 200 && toggle.data.status === "inactive");

  const pr = await call("POST", `${P}/purchase-requisitions`, {
    body: { title: "Smoke PR", departmentId: lookups.departments.options[0].value, priority: "medium", requiredDate: "2026-11-15",
      approverId: lookups.approvers.options[0].value, justification: "",
      items: [{ description: "Binding wire", quantity: "10", unitId: lookups.units.options[0].value, estimatedCost: "1500.00" }] },
  });
  check("create requisition 201", pr.status === 201, JSON.stringify(pr.data).slice(0, 300));

  const po = await call("POST", `${P}/purchase-orders`, {
    body: { supplierId: lookups.suppliers.options[0].value, requisitionId: lookups.approvedRequisitions.options[0].value,
      deliveryDate: "2026-11-20", paymentTermId: "pt-net45", shippingAddress: "", notes: "",
      items: [{ description: "Cement OPC 53", quantity: "100", unitPrice: "380.00" }] },
  });
  check("create purchase order 201", po.status === 201, JSON.stringify(po.data).slice(0, 300));

  const form = new FormData();
  form.append("purpose", "purchase_invoice");
  form.append("file", new Blob([Buffer.from("%PDF-1.4 demo")], { type: "application/pdf" }), "invoice.pdf");
  const attachment = await call("POST", `${P}/attachments`, { form });
  check("upload attachment 201", attachment.status === 201, JSON.stringify(attachment.data).slice(0, 200));

  const receivedPoId = lookups.purchaseOrders.options[0].value;
  const returnable = await get(`${P}/purchase-orders/${receivedPoId}/returnable-lines`, "returnable lines");
  const orders = await call("GET", `${P}/purchase-orders?page=1&pageSize=100`);
  const receivedPo = orders.data.items.find((o) => o.id === receivedPoId);
  const invoice = await call("POST", `${P}/purchase-invoices`, {
    body: { invoiceNumber: "SMOKE-001", supplierId: receivedPo.supplier.id, purchaseOrderId: receivedPoId, invoiceDate: "2026-10-20",
      dueDate: "", taxRatePercent: "18", statedTotalAmount: "", attachmentIds: [attachment.data.id], notes: "",
      items: [{ description: "Line", quantity: "2", rate: "1000.00" }] },
  });
  check("create invoice 201", invoice.status === 201 && invoice.data.status === "draft", JSON.stringify(invoice.data).slice(0, 300));

  // Record detail: requisition approve from View
  const prDetail = await get(`${P}/purchase-requisitions/${pr.data.id}`, "requisition detail");
  check("requisition detail pending", prDetail.status === "pending_approval" && prDetail.items?.length === 1 && prDetail.pendingApproval?.id);
  const prDecision = await call("POST", `${P}/approvals/${prDetail.pendingApproval.id}/decisions`, {
    body: { decision: "approved", comment: "", expectedVersion: prDetail.pendingApproval.version },
  });
  check("requisition approve from detail 200", prDecision.status === 200, JSON.stringify(prDecision.data).slice(0, 200));
  const prAfter = await get(`${P}/purchase-requisitions/${pr.data.id}`, "requisition detail after approve");
  check("requisition approved", prAfter.status === "approved" && prAfter.pendingApproval === null && prAfter.approvalHistory?.length === 1);
  check("detail 404", (await call("GET", `${P}/purchase-requisitions/pr-none`)).status === 404);

  // Record detail: purchase order status + receipts
  const poDetail = await get(`${P}/purchase-orders/${po.data.id}`, "purchase order detail");
  const poLine = poDetail.items?.[0];
  check("purchase order detail draft", poDetail.status === "draft" && poLine?.remainingQuantity === "100", JSON.stringify(poLine));
  const sent = await call("POST", `${P}/purchase-orders/${po.data.id}/status-changes`, { key: "smoke-po-send", body: { status: "sent" } });
  check("mark PO sent 200", sent.status === 200 && sent.data.status === "sent", JSON.stringify(sent.data).slice(0, 200));
  check("send twice 409", (await call("POST", `${P}/purchase-orders/${po.data.id}/status-changes`, { body: { status: "sent" } })).status === 409);
  const overReceipt = await call("POST", `${P}/purchase-orders/${po.data.id}/receipts`, {
    body: { receivedDate: "2026-10-21", items: [{ lineId: poLine.lineId, quantity: "101" }] },
  });
  check("receipt over-quantity 422", overReceipt.status === 422 && overReceipt.data.error?.fieldErrors?.["items[0].quantity"]);
  const partReceipt = await call("POST", `${P}/purchase-orders/${po.data.id}/receipts`, {
    key: "smoke-grn-1", body: { receivedDate: "2026-10-21", items: [{ lineId: poLine.lineId, quantity: "40" }] },
  });
  check("partial receipt 201", partReceipt.status === 201 && partReceipt.data.status === "partially_received"
    && partReceipt.data.items[0].remainingQuantity === "60", JSON.stringify(partReceipt.data).slice(0, 300));
  const fullReceipt = await call("POST", `${P}/purchase-orders/${po.data.id}/receipts`, {
    key: "smoke-grn-2", body: { receivedDate: "2026-10-21", items: [{ lineId: poLine.lineId, quantity: "60" }] },
  });
  check("full receipt completes PO", fullReceipt.status === 201 && fullReceipt.data.status === "completed" && fullReceipt.data.receipts.length === 2);
  check("cancel completed 409", (await call("POST", `${P}/purchase-orders/${po.data.id}/status-changes`, { body: { status: "cancelled" } })).status === 409);

  // Record detail: invoice partial payments
  const invDetail = await get(`${P}/purchase-invoices/${invoice.data.id}`, "invoice detail");
  check("invoice detail balance", invDetail.balanceDue === "2340.00" && invDetail.allowedActions?.includes("recordPayment"), invDetail.balanceDue);
  const overPay = await call("POST", `${P}/purchase-invoices/${invoice.data.id}/payments`, {
    body: { amount: "3000.00", transactionId: "UTR1", paymentDate: "2026-10-21" },
  });
  check("payment over balance 422", overPay.status === 422 && overPay.data.error?.fieldErrors?.amount);
  const partPay = await call("POST", `${P}/purchase-invoices/${invoice.data.id}/payments`, {
    key: "smoke-pay-1", body: { amount: "1000.00", transactionId: "UTR1", paymentDate: "2026-10-21" },
  });
  check("partial payment", partPay.status === 201 && partPay.data.status === "partially_paid" && partPay.data.balanceDue === "1340.00");
  const fullPay = await call("POST", `${P}/purchase-invoices/${invoice.data.id}/payments`, {
    key: "smoke-pay-2", body: { amount: "1340.00", transactionId: "UTR2", paymentDate: "2026-10-21" },
  });
  check("full payment marks paid", fullPay.status === 201 && fullPay.data.status === "paid" && fullPay.data.payments.length === 2);
  check("pay when paid 409", (await call("POST", `${P}/purchase-invoices/${invoice.data.id}/payments`, {
    body: { amount: "1.00", transactionId: "UTR3", paymentDate: "2026-10-21" },
  })).status === 409);

  const line = returnable.lines.find((l) => Number(l.quantityReceived) >= 1);
  const ret = await call("POST", `${P}/purchase-returns`, {
    body: { purchaseOrderId: receivedPoId, returnDate: "2026-10-21", resolution: "refund", notes: "",
      items: [{ lineId: line.lineId, quantity: "1", reasonId: lookups.returnReasons.options[0].value }] },
  });
  check("create return 201", ret.status === 201, JSON.stringify(ret.data).slice(0, 300));
  const tooMany = await call("POST", `${P}/purchase-returns`, {
    body: { purchaseOrderId: receivedPoId, returnDate: "2026-10-21", resolution: "refund",
      items: [{ lineId: line.lineId, quantity: "999999", reasonId: lookups.returnReasons.options[0].value }] },
  });
  check("return over-quantity 422", tooMany.status === 422);

  const sc = await call("POST", `${P}/subcontractors`, {
    body: { name: "Smoke Contractor", firmName: "", tradeSpecialtyId: lookups.tradeSpecialties.options[0].value, gstin: "", pan: "",
      contactPerson: "", phone: "", email: "", address: "", licenseNumber: "", licenseExpiryDate: "" },
  });
  check("create subcontractor 201", sc.status === 201, JSON.stringify(sc.data).slice(0, 300));
  const agreement = await call("POST", `${P}/subcontract-agreements`, {
    body: { title: "Smoke agreement", subcontractorId: sc.data.id, projectId: lookups.projects.options[0].value, startDate: "2026-11-01",
      endDate: "2027-02-28", agreementValue: "250000.00", paymentScheduleId: lookups.paymentSchedules.options[0].value,
      scopeOfWork: "", termsAndConditions: "" },
  });
  check("create agreement 201", agreement.status === 201, JSON.stringify(agreement.data).slice(0, 300));

  // Approvals
  const pending = await list(`${P}/approvals/pending?page=1&pageSize=50`, "pending approvals");
  const [first, second] = pending.items;
  const missingComment = await call("POST", `${P}/approvals/${second.id}/decisions`, { body: { decision: "rejected", comment: "", expectedVersion: second.version } });
  check("reject without comment 422", missingComment.status === 422);
  const approve = await call("POST", `${P}/approvals/${first.id}/decisions`, { body: { decision: "approved", comment: "", expectedVersion: first.version } });
  check("approve 200", approve.status === 200, JSON.stringify(approve.data).slice(0, 200));
  const again = await call("POST", `${P}/approvals/${first.id}/decisions`, { body: { decision: "approved", comment: "", expectedVersion: first.version } });
  check("approve twice 409", again.status === 409);
  const reject = await call("POST", `${P}/approvals/${second.id}/decisions`, { body: { decision: "rejected", comment: "Smoke test", expectedVersion: second.version } });
  check("reject 200", reject.status === 200);

  // Reports
  const generated = await call("POST", `${P}/reports/generate`, { body: { reportKey: "po-register", periodId: "rp-2026-10", format: "xlsx" } });
  check("generate report 201", generated.status === 201 && generated.data.status === "processing", JSON.stringify(generated.data).slice(0, 200));
  const early = await call("GET", `${P}/reports/generated/${generated.data.id}/file`);
  check("download before ready 409", early.status === 409);
  const reports = await list(`${P}/reports/generated?page=1&pageSize=5`, "generated reports after create");
  const ready = reports.items.find((r) => r.status === "ready");
  if (ready) await download(`${P}/reports/generated/${ready.id}/file`, "seeded report file", ready.format === "pdf" ? "%PDF" : "PK");

  // Sign out / sign in
  const logout = await call("DELETE", `${P}/session`);
  check("sign out 204", logout.status === 204);
  check("after sign out 401", (await call("GET", `${P}/dashboard`)).status === 401);
  const blankLogin = await call("POST", `${P}/session`, { body: { username: "", password: "", rememberMe: false } });
  check("blank sign in 422", blankLogin.status === 422 && blankLogin.data.error?.fieldErrors?.username && blankLogin.data.error?.fieldErrors?.password);
  const wrongLogin = await call("POST", `${P}/session`, { body: { username: "demo", password: "wrong", rememberMe: false } });
  check("wrong password 401", wrongLogin.status === 401 && wrongLogin.data.error?.code === "invalid_credentials");
  const login = await call("POST", `${P}/session`, { body: { username: " Demo ", password: "demo123", rememberMe: true } });
  check("sign in 200", login.status === 200 && login.data.user?.displayName === "Demo User", JSON.stringify(login.data).slice(0, 200));
  check("after sign in 200", (await call("GET", `${P}/session`)).status === 200);

  // Failure modes
  const unknown = await call("GET", `${P}/purchase-orders/po-001/history`);
  check("unknown endpoint 404", unknown.status === 404 && unknown.data.error?.code === "demo_not_implemented");
  await get("/__demo/session?state=signed-out", "sign out");
  check("signed out 401", (await call("GET", `${P}/session`)).status === 401);
  await get("/__demo/session?state=signed-in", "sign in");
  await get("/__demo/outage?state=on", "outage on");
  check("outage 503", (await call("GET", `${P}/dashboard`)).status === 503);
  await get("/__demo/outage?state=off", "outage off");

  await get("/__demo/reset", "final reset");
  console.log(`${checks - failures}/${checks} checks passed against ${BASE}`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exitCode = 1;
});
