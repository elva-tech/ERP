/**
 * API and Tenant configuration for the Inventory module.
 */

export const API_MODES = {
  MOCK: "mock",
  REAL: "real",
};

let customModeOverride = null;
let customBaseUrlOverride = null;

export function setApiModeOverride(mode) {
  customModeOverride = mode;
}

export function setApiBaseUrlOverride(url) {
  customBaseUrlOverride = url;
}

export function getApiMode() {
  if (customModeOverride) return customModeOverride;
  const envMode = import.meta.env.VITE_API_MODE;
  if (typeof envMode === "string" && envMode.toLowerCase() === "real") {
    return API_MODES.REAL;
  }
  return API_MODES.MOCK;
}

export function isMockMode() {
  return getApiMode() === API_MODES.MOCK;
}

export function isRealMode() {
  return getApiMode() === API_MODES.REAL;
}

export function getApiBaseUrl() {
  if (customBaseUrlOverride) return customBaseUrlOverride;
  const url = import.meta.env.VITE_API_BASE_URL;
  if (typeof url === "string" && url.trim().length > 0) {
    return url.trim().replace(/\/+$/, "");
  }
  return "http://localhost:3000/api/inventory";
}

export function getTenantInfo() {
  return {
    name: import.meta.env.VITE_TENANT_NAME || "SB PATIL GROUP",
    subtitle: import.meta.env.VITE_TENANT_SUBTITLE || "INVENTORY MANAGEMENT",
  };
}

export const apiConfig = {
  get mode() {
    return getApiMode();
  },
  set mode(val) {
    setApiModeOverride(val);
  },
  get isMockMode() {
    return isMockMode();
  },
  get baseUrl() {
    return getApiBaseUrl();
  },
  set baseUrl(val) {
    setApiBaseUrlOverride(val);
  },
  get tenant() {
    return getTenantInfo();
  },
};
