/**
 * Agreement Summary Service: retrieves KPI aggregates and portfolio metrics
 */

import { apiRequest } from "../../../lib/apiClient.js";
import { isMockMode } from "../../../lib/env.js";
import { mockGetAgreementSummary } from "../../../mock-api/mockAdapter.js";

/**
 * Fetch KPI Summary metrics (Total Active, Cumulative Value, Completed, Expired/Pending)
 */
export async function getAgreementSummary(signal) {
  if (isMockMode()) {
    return mockGetAgreementSummary();
  }
  return apiRequest("/procurement/agreements/summary", {
    method: "GET",
    signal,
  });
}

