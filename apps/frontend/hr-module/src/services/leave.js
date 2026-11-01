import { apiRequest, sendJson, withQuery } from "../api";

export const leaveRequestsPath = (params) =>
  withQuery("/api/leave/requests", params);

export const getLeaveRequests = (params) =>
  apiRequest(leaveRequestsPath(params));

export const submitLeaveRequest = (payload) =>
  sendJson("POST", "/api/leave/requests", payload);

export const saveLeaveBalance = (payload) =>
  sendJson("POST", "/api/leave/balances", payload);

export const carryForwardLeave = (payload) =>
  sendJson("POST", "/api/leave/carry-forward", payload);

export const reviewLeaveRequest = (requestId, companyId, payload) =>
  sendJson(
    "PATCH",
    withQuery(`/api/leave/requests/${requestId}`, { companyId }),
    payload,
  );

export const leaveBalancesPath = (params) =>
  withQuery("/api/leave/balances", params);

export const LEAVE_TYPES_ENDPOINT = "/api/leave/types";
export const LEAVE_HOLIDAYS_ENDPOINT = "/api/leave/holidays";

export const leaveTypesPath = (params) =>
  withQuery(LEAVE_TYPES_ENDPOINT, params);

export const leaveHolidaysPath = (params) =>
  withQuery(LEAVE_HOLIDAYS_ENDPOINT, params);