import { sendJson, withQuery } from "../api";

export const policyPath = (params) =>
  withQuery("/api/policy", params);

export const savePayrollPolicy = (payload) =>
  sendJson("PUT", "/api/policy", payload);

export const approvePayrollPolicy = (companyId, version) =>
  sendJson("POST", "/api/policy/approve", { companyId, version });