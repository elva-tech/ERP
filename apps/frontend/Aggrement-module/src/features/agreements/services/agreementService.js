/**
 * Agreement Service: primary interface for agreement operations
 * Dispatches to Real Backend API Client or Mock Adapter based on centralized configuration.
 */

import { apiRequest } from "../../../lib/apiClient.js";
import { isMockMode } from "../../../lib/env.js";
import {
  mockListAgreements,
  mockGetAgreement,
  mockCreateAgreement,
  mockListPaymentSchedules,
} from "../../../mock-api/mockAdapter.js";

/**
 * List agreements with optional status filter, search text, and pagination
 */
export async function listAgreements(params = {}, signal) {
  if (isMockMode()) {
    return mockListAgreements(params);
  }
  return apiRequest("/procurement/agreements", {
    method: "GET",
    query: params,
    signal,
  });
}

/**
 * Fetch detailed agreement record by ID
 */
export async function getAgreement(id, signal) {
  if (isMockMode()) {
    return mockGetAgreement(id);
  }
  return apiRequest(`/procurement/agreements/${encodeURIComponent(id)}`, {
    method: "GET",
    signal,
  });
}

/**
 * Create a new subcontract agreement
 */
export async function createAgreement(payload, { idempotencyKey } = {}) {
  if (isMockMode()) {
    return mockCreateAgreement(payload, { idempotencyKey });
  }
  return apiRequest("/procurement/agreements", {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
}

/**
 * Update existing agreement
 */
export async function updateAgreement(id, payload, { idempotencyKey } = {}) {
  if (isMockMode()) {
    throw new Error("Update operation in mock mode is not yet persisted.");
  }
  return apiRequest(`/procurement/agreements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
    idempotencyKey,
  });
}

/**
 * Submit agreement for review/approval
 */
export async function submitAgreement(id, { idempotencyKey } = {}) {
  if (isMockMode()) {
    return { success: true, message: "Agreement submitted for approval." };
  }
  return apiRequest(`/procurement/agreements/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    idempotencyKey,
  });
}

/**
 * Approve agreement
 */
export async function approveAgreement(id, notes = "", { idempotencyKey } = {}) {
  if (isMockMode()) {
    return { success: true, message: "Agreement approved." };
  }
  return apiRequest(`/procurement/agreements/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: { notes },
    idempotencyKey,
  });
}

/**
 * Terminate agreement
 */
export async function terminateAgreement(id, reason, { idempotencyKey } = {}) {
  if (isMockMode()) {
    return { success: true, message: "Agreement terminated." };
  }
  return apiRequest(`/procurement/agreements/${encodeURIComponent(id)}/terminate`, {
    method: "POST",
    body: { reason },
    idempotencyKey,
  });
}

/**
 * Export agreements register to CSV/Excel
 */
export async function exportAgreements(params = {}, signal) {
  if (isMockMode()) {
    // Return mock CSV blob
    const csvContent = "Agreement No,Date,Subcontractor,Value,Status\nAG-1102,15-Jan-2024,MSEDCL,24000000,Active\n";
    return {
      blob: new Blob([csvContent], { type: "text/csv" }),
      fileName: `agreements_export_${Date.now()}.csv`,
    };
  }
  return apiRequest("/procurement/agreements/export", {
    method: "GET",
    query: params,
    responseType: "blob",
    signal,
  });
}

/**
 * Lookup payment schedules
 */
export async function listPaymentSchedules(signal) {
  if (isMockMode()) {
    return mockListPaymentSchedules();
  }
  return apiRequest("/procurement/payment-schedules", { signal });
}

