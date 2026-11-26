import { afterEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn(async () => ({
  items: [],
  pagination: { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 },
}));

vi.mock("../src/lib/apiClient.js", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));

import { listApprovalHistory } from "../src/features/approvals/approvalService.js";
import { listPurchaseReturns } from "../src/features/purchase-returns/purchaseReturnService.js";
import { listSubcontractAgreements } from "../src/features/subcontract-agreements/subcontractAgreementService.js";
import { listSubcontractBills } from "../src/features/subcontract-bills/subcontractBillService.js";
import { listSubcontractOrders } from "../src/features/subcontract-orders/subcontractOrderService.js";

const SCREEN_CALLS = [
  {
    name: "purchase returns",
    call: () => listPurchaseReturns({ page: 1, pageSize: 8, status: "", search: "PRN-1" }, new AbortController().signal),
    path: "/procurement/purchase-returns",
  },
  {
    name: "subcontract agreements",
    call: () => listSubcontractAgreements({ page: 1, pageSize: 8, status: "active", search: "SCA" }, new AbortController().signal),
    path: "/procurement/subcontract-agreements",
  },
  {
    name: "subcontract bills",
    call: () => listSubcontractBills({ page: 1, pageSize: 8, status: "", search: "SCB" }, new AbortController().signal),
    path: "/procurement/subcontract-bills",
  },
  {
    name: "subcontract orders",
    call: () => listSubcontractOrders({ page: 1, pageSize: 8, status: "active", search: "SCO" }, new AbortController().signal),
    path: "/procurement/subcontract-orders",
  },
  {
    name: "approval history",
    call: () =>
      listApprovalHistory(
        { page: 1, pageSize: 8, documentType: "", decision: "", dateRange: "last_30_days", search: "PO-1" },
        new AbortController().signal,
      ),
    path: "/procurement/approvals/history",
  },
];

describe("list search service contracts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  for (const screen of SCREEN_CALLS) {
    it(`${screen.name} sends search in the production request query`, async () => {
      await screen.call();
      expect(apiRequest).toHaveBeenCalledTimes(1);
      const [path, options] = apiRequest.mock.calls[0];
      expect(path).toBe(screen.path);
      expect(options.query.search).toBeDefined();
      expect(String(options.query.search).length).toBeGreaterThan(0);
    });
  }

  it("omits search influence when search is empty", async () => {
    await listPurchaseReturns({ page: 1, pageSize: 8, status: "", search: "" }, new AbortController().signal);
    const [, options] = apiRequest.mock.calls[0];
    expect(options.query.search).toBe("");
  });
});