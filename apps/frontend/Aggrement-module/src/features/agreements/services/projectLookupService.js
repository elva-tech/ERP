/**
 * Project and Site Master Lookup Service
 * Reuses existing ERP Project Master APIs and contracts.
 */

import { apiRequest } from "../../../lib/apiClient.js";
import { isMockMode } from "../../../lib/env.js";
import { mockListProjects } from "../../../mock-api/mockAdapter.js";

/**
 * Fetch authorized project/site master records.
 * Reuses existing Procurement lookups (`/procurement/lookups/projects`)
 * preserving actual project IDs and organization boundaries.
 *
 * @param {Object} [params]
 * @param {string} [params.search] Optional search string
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ value: string, label: string, subtext?: string }>>}
 */
export async function listProjectOptions(params = {}, signal) {
  if (isMockMode()) {
    return mockListProjects();
  }

  // 1. Primary Procurement Lookup Contract: GET /procurement/lookups/projects
  try {
    const lookupRes = await apiRequest("/procurement/lookups/projects", {
      method: "GET",
      query: params?.search ? { search: params.search } : undefined,
      signal,
    });

    if (Array.isArray(lookupRes?.options)) {
      return lookupRes.options.map((opt) => ({
        value: String(opt.value || opt.id),
        label: String(opt.label || opt.name),
        subtext: opt.subtext || opt.location || opt.code || undefined,
      }));
    }
  } catch (err) {
    if (err?.status !== 404) {
      throw err;
    }
  }

  // 2. Direct Projects Endpoint fallback: GET /procurement/projects
  const projectsRes = await apiRequest("/procurement/projects", {
    method: "GET",
    query: { page: 1, pageSize: 100, search: params?.search || undefined },
    signal,
  });

  if (Array.isArray(projectsRes?.items)) {
    return projectsRes.items.map((proj) => ({
      value: String(proj.id),
      label: String(proj.name),
      subtext: proj.location || proj.code || undefined,
    }));
  }

  if (Array.isArray(projectsRes)) {
    return projectsRes.map((proj) => ({
      value: String(proj.id),
      label: String(proj.name),
      subtext: proj.location || proj.code || undefined,
    }));
  }

  return [];
}
