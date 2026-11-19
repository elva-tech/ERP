const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export async function getTenants(page = 0, size = 50) {
  const res = await fetch(`${API_BASE_URL}/tenants?page=${page}&size=${size}`);
  if (!res.ok) throw new Error('Failed to fetch tenants');
  return res.json();
}

export async function getTenantById(id: string) {
  const res = await fetch(`${API_BASE_URL}/tenants/${id}`);
  if (!res.ok) throw new Error('Failed to fetch tenant');
  return res.json();
}

export async function createTenant(data: any) {
  const res = await fetch(`${API_BASE_URL}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create tenant');
  return res.json();
}

export async function updateTenantStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE_URL}/tenants/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function updateTenantModules(id: string, modules: string[]) {
  const res = await fetch(`${API_BASE_URL}/tenants/${id}/modules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modules })
  });
  if (!res.ok) throw new Error('Failed to update modules');
  return res.json();
}

export async function getAvailableModules() {
  const res = await fetch(`${API_BASE_URL}/modules`);
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createModule(data: any) {
  const res = await fetch(`${API_BASE_URL}/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Failed to create module');
  }
  return res.json();
}

export async function deleteModule(code: string) {
  const res = await fetch(`${API_BASE_URL}/modules/${code}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete module');
  return res;
}