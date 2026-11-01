import { apiRequest, sendJson, withQuery } from "../api";

const ATTENDANCE_ENDPOINTS = Object.freeze({
  records: "/api/attendance/records",
  devices: "/api/attendance/devices",
  regularizations: "/api/attendance/regularizations",
  punches: "/api/attendance/punches",
  shifts: "/api/attendance/shifts",
  rosters: "/api/attendance/rosters",
  monthlySummary: "/api/attendance/monthly-summary",
});

export const attendancePath = (resource, params = {}) => {
  const endpoint = ATTENDANCE_ENDPOINTS[resource];

  if (!endpoint) {
    throw new Error(`Unknown attendance API resource: ${resource}`);
  }

  return withQuery(endpoint, params);
};
export const attendanceRecordsPath = (params) =>
  attendancePath("records", params);

export const getAttendanceRecords = (params) =>
  apiRequest(attendanceRecordsPath(params));

export const markAttendance = (payload) =>
  sendJson("POST", "/api/attendance/records", payload);

export const updateAttendanceRecord = (recordId, payload) =>
  sendJson("PATCH", `/api/attendance/records/${recordId}`, payload);

export const importAttendancePunches = (payload) =>
  sendJson("POST", "/api/attendance/punches", payload);

export const processAttendancePunches = (companyId, date) =>
  sendJson("POST", "/api/attendance/punches/process", { companyId, date });

export const createAttendanceRegularization = (payload) =>
  sendJson("POST", "/api/attendance/regularizations", payload);

export const reviewAttendanceRegularization = (id, companyId, payload) =>
  sendJson(
    "PATCH",
    withQuery(`/api/attendance/regularizations/${id}`, { companyId }),
    payload,
  );