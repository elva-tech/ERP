/**
 * Mock API Adapter for ELVA ERP Agreement Store
 * Implements identical contracts to the real backend with multi-tenant data isolation.
 */

import { mockStore } from "./mockStorage.js";
import { validateNewAgreementForm } from "../features/agreements/schemas/agreementSchema.js";
import { ApiError } from "../lib/apiClient.js";

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * List, search, filter and paginate agreements for the active tenant
 */
export async function mockListAgreements(params = {}) {
  await delay(80);
  const { page = 1, pageSize = 10, status = "", search = "" } = params;

  let filtered = [...mockStore.getAgreements()];

  // 1. Status Filter
  if (status && status !== "all") {
    filtered = filtered.filter((a) => {
      if (status === "expired_or_renewal") {
        return a.status === "expired" || a.status === "pending_renewal" || a.renewalAttention;
      }
      return a.status.toLowerCase() === status.toLowerCase();
    });
  }

  // 2. Search Query (Agreement No, Title, Subcontractor, Project, Scope)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((a) => {
      const matchNo = a.agreementNumber?.toLowerCase().includes(q);
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchSub = a.subcontractor?.name?.toLowerCase().includes(q);
      const matchProj = a.projectName?.toLowerCase().includes(q);
      const matchScope =
        a.scopeOfWork?.toLowerCase().includes(q) || a.scopeSummary?.toLowerCase().includes(q);
      return matchNo || matchTitle || matchSub || matchProj || matchScope;
    });
  }

  const totalItems = filtered.length;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const size = Math.max(1, Number.parseInt(pageSize, 10) || 10);
  const totalPages = Math.ceil(totalItems / size) || 1;

  const startIndex = (pageNum - 1) * size;
  const items = filtered.slice(startIndex, startIndex + size);

  return {
    items,
    pagination: {
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrevious: pageNum > 1,
    },
  };
}

/**
 * Calculate KPI summary based on active tenant's mock agreement records
 */
export async function mockGetAgreementSummary() {
  await delay(60);
  const activeTenant = mockStore.getActiveTenant();
  const agreements = mockStore.getAgreements();

  let activeCount = 0;
  let cumulativeValue = 0;
  let completedCount = 0;
  let expiredOrPendingRenewalCount = 0;

  for (const a of agreements) {
    if (a.status === "active") {
      activeCount += 1;
      cumulativeValue += Number(a.agreementValue || 0);
    } else if (a.status === "completed") {
      completedCount += 1;
    } else if (a.status === "expired" || a.status === "pending_renewal") {
      expiredOrPendingRenewalCount += 1;
    }
  }

  return {
    activeCount,
    cumulativeValue,
    completedCount,
    completedPeriodLabel: activeTenant.financialYear || "FY 25",
    expiredOrPendingRenewalCount,
    totalCount: agreements.length,
    currencyCode: "INR",
    tenantId: activeTenant.id,
    asOf: new Date().toISOString(),
  };
}

/**
 * Get single agreement by ID or Agreement Number for active tenant
 */
export async function mockGetAgreement(idOrNumber) {
  await delay(50);
  const agreements = mockStore.getAgreements();
  const agr = agreements.find(
    (a) => a.id === idOrNumber || a.agreementNumber === idOrNumber
  );
  if (!agr) {
    throw new ApiError("not_found", `Agreement ${idOrNumber} was not found.`, { status: 404 });
  }
  return JSON.parse(JSON.stringify(agr));
}

/**
 * Create a new subcontract agreement with strict tenant isolation
 */
export async function mockCreateAgreement(payload, options = {}) {
  await delay(120);

  // Check duplicate submission via Idempotency-Key
  if (options.idempotencyKey && mockStore.checkIdempotency(options.idempotencyKey)) {
    throw new ApiError(
      "conflict",
      "Duplicate submission detected. This agreement is already being processed.",
      { status: 409 }
    );
  }

  // Form Validation
  const errors = validateNewAgreementForm(payload);
  if (Object.keys(errors).length > 0) {
    throw new ApiError("validation", "Validation failed. Please correct the highlighted errors.", {
      status: 422,
      fieldErrors: errors,
    });
  }

  // Strict Tenant Master-Data Verification (Cross-Tenant Rejection)
  const activeTenant = mockStore.getActiveTenant();
  const sub = activeTenant.subcontractors.find((s) => s.id === payload.subcontractorId);
  const proj = activeTenant.projects.find((p) => p.id === payload.projectId);

  if (!sub) {
    throw new ApiError("validation", "Selected subcontractor is not authorized for this tenant.", {
      status: 422,
      fieldErrors: { subcontractorId: "Subcontractor does not belong to authorized tenant organization." },
    });
  }

  if (!proj) {
    throw new ApiError("validation", "Selected project is not authorized for this tenant.", {
      status: 422,
      fieldErrors: { projectId: "Project site does not belong to authorized tenant organization." },
    });
  }

  // Generate Tenant-Scoped Unique Agreement Number
  const existingAgreements = mockStore.getAgreements();
  const basePrefix = activeTenant.id === "tenant-elva-demo" ? 2000 : 1000;
  const maxNumber = existingAgreements.reduce((max, a) => {
    const num = Number.parseInt((a.agreementNumber || "").replace(/\D/g, ""), 10);
    return Number.isFinite(num) && num > max ? num : max;
  }, basePrefix);
  const nextNumber = maxNumber + 1;
  const agreementNumber = `AG-${nextNumber}`;

  const now = new Date();
  const agreementDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const cleanValue = Number.parseFloat(String(payload.agreementValue).replace(/,/g, ""));

  const newRecord = {
    id: `agr-${activeTenant.id}-${Date.now()}`,
    tenantId: activeTenant.id,
    agreementNumber,
    agreementDate,
    title: payload.title.trim(),
    subcontractor: {
      id: sub.id,
      name: sub.name,
    },
    projectId: proj.id,
    projectName: proj.name,
    scopeOfWork: payload.scopeOfWork.trim(),
    scopeSummary:
      payload.scopeOfWork.trim().slice(0, 75) +
      (payload.scopeOfWork.length > 75 ? "..." : ""),
    agreementValue: cleanValue,
    currencyCode: "INR",
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: "active",
    type: "Subcontract",
    owner: activeTenant.user?.roleLabel || "Project Dept",
    paymentSchedule: payload.paymentSchedule || "Monthly Progress Billing (30-day credit)",
    termsAndConditions: payload.termsAndConditions || "Standard Subcontract Terms & Conditions apply.",
    renewalAttention: false,
    createdAt: new Date().toISOString(),
  };

  mockStore.addAgreement(newRecord);

  return newRecord;
}

/**
 * Subcontractor lookup options for active tenant
 */
export async function mockListSubcontractors() {
  await delay(40);
  return mockStore.getSubcontractors().map((s) => ({
    value: s.id,
    label: s.name,
    subtext: s.category || s.code,
  }));
}

/**
 * Project / Site lookup options for active tenant
 */
export async function mockListProjects() {
  await delay(40);
  return mockStore.getProjects().map((p) => ({
    value: p.id,
    label: p.name,
    subtext: p.location || p.code,
  }));
}

/**
 * Payment Schedule lookup options
 */
export async function mockListPaymentSchedules() {
  await delay(40);
  return mockStore.getPaymentSchedules().map((ps) => ({
    value: ps.label,
    label: ps.label,
    subtext: ps.terms,
  }));
}
