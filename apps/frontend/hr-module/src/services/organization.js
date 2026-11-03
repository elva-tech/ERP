import { apiRequest, withQuery } from "../api";

// Departments
export const createDepartment = (payload) =>
  apiRequest("/api/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateDepartment = (departmentId, companyId, payload) =>
  apiRequest(
    withQuery(
      `/api/departments/${encodeURIComponent(departmentId)}`,
      { companyId }
    ),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

// Designations
export const createDesignation = (payload) =>
  apiRequest("/api/designations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateDesignation = (designationId, companyId, payload) =>
  apiRequest(
    withQuery(
      `/api/designations/${encodeURIComponent(designationId)}`,
      { companyId }
    ),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );