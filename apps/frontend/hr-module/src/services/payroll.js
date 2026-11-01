import { apiRequest, sendJson, withQuery } from "../api";

export const payrollRunsPath = (companyId) =>
  withQuery("/api/payroll/runs", { companyId });

export const payrollRunPath = (runId, companyId) =>
  withQuery(`/api/payroll/runs/${runId}`, { companyId });

export const PAYROLL_COMPONENTS_ENDPOINT = "/api/payroll/components";
export const PAYROLL_STRUCTURES_ENDPOINT = "/api/payroll/structures";
export const PAYROLL_ASSIGNMENTS_ENDPOINT = "/api/payroll/assignments";

export const payrollComponentsPath = (companyId) =>
  withQuery(PAYROLL_COMPONENTS_ENDPOINT, { companyId });

export const payrollStructuresPath = (companyId) =>
  withQuery(PAYROLL_STRUCTURES_ENDPOINT, { companyId });

export const salaryStructureComponentsPath = (
  structureId,
  companyId,
  params = {},
) =>
  withQuery(
    `/api/payroll/structures/${encodeURIComponent(structureId)}/components`,
    { companyId, ...params },
  );
export const getPayrollRuns = (companyId) =>
  apiRequest(payrollRunsPath(companyId));

export const employeeAdvancesPath = (params) =>
  withQuery("/api/payroll/advances", params);

export const payrollPayslipsPath = (params) =>
  withQuery("/api/payroll/payslips", params);

export const payrollStatutoryPath = (params) =>
  withQuery("/api/payroll/statutory", params);

const payrollRunKey = (companyId, year, month) =>
  `hrms:payroll-run:${companyId}:${year}:${month}`;

export function getPayrollRunIdempotencyKey(
  companyId,
  year,
  month,
  storage = sessionStorage,
  createKey = () => crypto.randomUUID(),
) {
  const storageKey = payrollRunKey(companyId, year, month);
  const existingKey = storage.getItem(storageKey);
  if (existingKey) return existingKey;

  const newKey = createKey();
  storage.setItem(storageKey, newKey);
  return newKey;
}

export function clearPayrollRunIdempotencyKey(
  companyId,
  year,
  month,
  storage = sessionStorage,
) {
  storage.removeItem(payrollRunKey(companyId, year, month));
}

export const createPayrollRun = (companyId, year, month, idempotencyKey) =>
  sendJson(
    "POST",
    "/api/payroll/runs",
    { companyId, year, month },
    { idempotencyKey },
  );

export const updatePayrollRun = (runId, companyId, payload) =>
  sendJson("PATCH", payrollRunPath(runId, companyId), payload);

export const createEmployeeAdvance = (payload) =>
  sendJson("POST", "/api/payroll/advances", payload);

export const updateEmployeeAdvance = (advanceId, companyId, payload) =>
  sendJson(
    "PATCH",
    withQuery(`/api/payroll/advances/${advanceId}`, { companyId }),
    payload,
  );

export const saveSalaryStructureComponents = (
  structureId,
  companyId,
  payload,
) =>
  sendJson(
    "PUT",
    salaryStructureComponentsPath(structureId, companyId),
    payload,
  );

export const previewSalaryStructureComponents = (
  structureId,
  companyId,
  previewCtc,
) =>
  apiRequest(
    salaryStructureComponentsPath(structureId, companyId, { previewCtc }),
  );