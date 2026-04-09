const API_BASE = 'https://api2.acedemos.com/api';

interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
  limit: number;
}

interface ApiError {
  error: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' })) as ApiError;
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  const res = await fetch(url.toString());
  return handleResponse<ApiResponse<T>>(res);
}

export async function apiGetById<T>(endpoint: string, id: number | string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}/${id}`);
  return handleResponse<T>(res);
}

export async function apiPost<T>(endpoint: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(endpoint: string, id: number | string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(endpoint: string, id: number | string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(endpoint: string, id: number | string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}${endpoint}/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res);
}

export { API_BASE };
