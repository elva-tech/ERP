import { apiBlob, apiRequest, sendJson, withQuery } from "../api";
import { profilePath } from "../modules/employee-profile/utils";

export const employeeListPath = (companyId) =>
  withQuery("/api/employees", { companyId });

export const getEmployees = (companyId) =>
  apiRequest(employeeListPath(companyId));

export const employeeSalaryPath = (employeeId, companyId) =>
  profilePath(employeeId, "/salary", companyId);

export const employeeProfilePath = (employeeId, companyId) =>
  profilePath(employeeId, "/profile", companyId);

export const createEmployee = (payload) =>
  sendJson("POST", "/api/employees", payload);

export const updateEmployee = (employeeId, companyId, payload) =>
  sendJson(
    "PATCH",
    withQuery(`/api/employees/${encodeURIComponent(employeeId)}`, { companyId }),
    payload,
  );

export const updateEmployeeProfile = (employeeId, companyId, payload) =>
  sendJson("PATCH", profilePath(employeeId, "", companyId), payload);

export const createEmployeeProfileSection = (
  employeeId,
  companyId,
  section,
  payload,
) =>
  sendJson("POST", profilePath(employeeId, `/${section}`, companyId), payload);

export const updateEmployeeProfileSection = (
  employeeId,
  companyId,
  section,
  rowId,
  payload,
) =>
  sendJson(
    "PATCH",
    profilePath(employeeId, `/${section}/${rowId}`, companyId),
    payload,
  );

export const deleteEmployeeProfileSection = (
  employeeId,
  companyId,
  section,
  rowId,
) =>
  apiRequest(profilePath(employeeId, `/${section}/${rowId}`, companyId), {
    method: "DELETE",
  });

export const uploadEmployeeDocument = (employeeId, companyId, formData) =>
  apiRequest(profilePath(employeeId, "/documents", companyId), {
    method: "POST",
    body: formData,
  });

export const getEmployeeDocument = (
  employeeId,
  companyId,
  documentId,
  params = {},
) =>
  apiBlob(
    profilePath(employeeId, `/documents/${documentId}`, companyId, params),
  );

export const updateEmployeeDocument = (
  employeeId,
  companyId,
  documentId,
  payload,
) =>
  sendJson(
    "PATCH",
    profilePath(employeeId, `/documents/${documentId}`, companyId),
    payload,
  );

export const deleteEmployeeDocument = (employeeId, companyId, documentId) =>
  apiRequest(profilePath(employeeId, `/documents/${documentId}`, companyId), {
    method: "DELETE",
  });