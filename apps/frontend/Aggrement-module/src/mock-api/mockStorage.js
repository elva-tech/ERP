/**
 * Multi-tenant in-memory & localStorage store for mock testing API
 * Guarantees complete data isolation between demo tenants.
 */

import { DEMO_TENANTS, DEFAULT_MOCK_TENANT_ID, getMockTenant } from "./mockTenants.js";

const ACTIVE_TENANT_STORAGE_KEY = "agreement-mock:active-tenant-id";
const TENANT_STORAGE_PREFIX = "agreement-mock:";

export const MOCK_TENANT_CHANGED_EVENT = "agreement:mock-tenant-changed";

class MultiTenantMockStore {
  constructor() {
    this.activeTenantId = this.readInitialTenantId();
    this.agreementsByTenant = {};
    this.seenIdempotencyKeys = new Set();
    this.loadActiveTenantData();
  }

  readInitialTenantId() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
        if (stored && DEMO_TENANTS[stored]) {
          return stored;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_MOCK_TENANT_ID;
  }

  getStorageKey(tenantId) {
    return `${TENANT_STORAGE_PREFIX}${tenantId}`;
  }

  loadActiveTenantData() {
    const tenantId = this.activeTenantId;
    if (this.agreementsByTenant[tenantId]) {
      return;
    }

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(this.getStorageKey(tenantId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.agreementsByTenant[tenantId] = parsed;
            return;
          }
        }
      } catch {
        // fallback
      }
    }

    // Initialize from tenant defaults
    const tenantConfig = getMockTenant(tenantId);
    this.agreementsByTenant[tenantId] = JSON.parse(
      JSON.stringify(tenantConfig.initialAgreements || [])
    );
    this.saveTenantData(tenantId);
  }

  saveTenantData(tenantId) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const data = this.agreementsByTenant[tenantId] || [];
        window.localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(data));
      } catch {
        // storage disabled
      }
    }
  }

  getActiveTenant() {
    return getMockTenant(this.activeTenantId);
  }

  getActiveTenantId() {
    return this.activeTenantId;
  }

  setActiveTenant(newTenantId) {
    if (!DEMO_TENANTS[newTenantId]) {
      throw new Error(`Unknown demo tenant: ${newTenantId}`);
    }
    if (this.activeTenantId === newTenantId) {
      return;
    }

    // Save current tenant before switching
    this.saveTenantData(this.activeTenantId);

    // Switch
    this.activeTenantId = newTenantId;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, newTenantId);
      } catch {
        // ignore
      }
    }

    // Load target tenant data
    this.loadActiveTenantData();

    // Broadcast change
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(MOCK_TENANT_CHANGED_EVENT, { detail: { tenantId: newTenantId } })
      );
    }
  }

  getAgreements() {
    this.loadActiveTenantData();
    return this.agreementsByTenant[this.activeTenantId] || [];
  }

  getSubcontractors() {
    return this.getActiveTenant().subcontractors || [];
  }

  getProjects() {
    return this.getActiveTenant().projects || [];
  }

  getPaymentSchedules() {
    return [
      { id: "ps-01", label: "Monthly Progress Billing (30-day credit)", terms: "Net 30 days against verified monthly measurement sheets" },
      { id: "ps-02", label: "Milestone-Linked (20% Advance, 70% Progress, 10% Retention)", terms: "20% mobilization advance against BG, 70% RA bills, 10% on completion" },
      { id: "ps-03", label: "Quarterly Fixed Instalments", terms: "Equal quarterly instalments payable at start of quarter" },
      { id: "ps-04", label: "100% Back-to-Back Client Realization", terms: "Disbursement within 14 days of principal client certification" },
    ];
  }

  addAgreement(record) {
    this.loadActiveTenantData();
    if (!this.agreementsByTenant[this.activeTenantId]) {
      this.agreementsByTenant[this.activeTenantId] = [];
    }
    this.agreementsByTenant[this.activeTenantId].unshift(record);
    this.saveTenantData(this.activeTenantId);
  }

  resetCurrentTenantToDefaults() {
    const tenantConfig = this.getActiveTenant();
    this.agreementsByTenant[this.activeTenantId] = JSON.parse(
      JSON.stringify(tenantConfig.initialAgreements || [])
    );
    this.saveTenantData(this.activeTenantId);
  }

  resetAllTenantsToDefaults() {
    Object.keys(DEMO_TENANTS).forEach((tid) => {
      const cfg = DEMO_TENANTS[tid];
      this.agreementsByTenant[tid] = JSON.parse(JSON.stringify(cfg.initialAgreements || []));
      this.saveTenantData(tid);
    });
    this.activeTenantId = DEFAULT_MOCK_TENANT_ID;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, DEFAULT_MOCK_TENANT_ID);
      } catch {
        // ignore
      }
    }
  }

  checkIdempotency(key) {
    if (!key) return false;
    if (this.seenIdempotencyKeys.has(key)) return true;
    this.seenIdempotencyKeys.add(key);
    return false;
  }
}

export const mockStore = new MultiTenantMockStore();
