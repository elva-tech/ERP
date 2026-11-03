import { apiRequest, sendJson, withQuery } from "../api";

export const pendingApprovalsPath = (companyId) =>
  withQuery("/api/approvals/pending", { companyId });

export const approvalDelegatesPath = (companyId) =>
  withQuery("/api/approvals/delegates", { companyId });

export const createApprovalDelegate = (payload) =>
  sendJson("POST", "/api/approvals/delegates", payload);

export const revokeApprovalDelegate = (delegateId, companyId) =>
  apiRequest(
    withQuery(`/api/approvals/delegates/${delegateId}`, { companyId }),
    { method: "DELETE" }
  );