/**
 * Authentication and Session Service for Agreement Store
 * Aligned with existing ELVA ERP session endpoints (`GET /procurement/session`).
 */

import { apiRequest } from "../../lib/apiClient.js";
import { isMockMode } from "../../lib/env.js";
import { mockStore } from "../../mock-api/mockStorage.js";

/**
 * Fetch current authenticated user session and tenant context.
 * In real mode, session is carried by secure HTTP-only backend cookies.
 * In mock mode, derives session from active mock tenant configuration.
 */
export async function getSession(signal) {
  if (isMockMode()) {
    const tenant = mockStore.getActiveTenant();
    return {
      user: {
        id: tenant.user.id,
        displayName: tenant.user.displayName,
        roleLabel: tenant.user.roleLabel,
        initials: tenant.user.initials,
        email: tenant.user.email,
        avatarUrl: null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.shortName,
        brandColor: tenant.brandColor,
        logoType: tenant.logoType,
        financialYear: tenant.financialYear,
        subtitle: tenant.subtitle,
      },
      permissions: [
        "procurement.agreement.read",
        "procurement.agreement.create",
        "procurement.agreement.update",
        "procurement.agreement.submit",
        "procurement.agreement.approve",
        "procurement.agreement.export",
      ],
      navigation: ["agreements", "dashboard", "create-agreement"],
    };
  }

  // Real Mode: Query existing ERP session
  return apiRequest("/procurement/session", { signal });
}

/**
 * End current session
 */
export async function signOut() {
  if (isMockMode()) {
    return { success: true };
  }
  return apiRequest("/procurement/session", { method: "DELETE" });
}

