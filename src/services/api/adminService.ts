import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete, API_BASE } from './apiClient';
import type { User, Settings, LowStockAlert, Sequence, Compliance, Stats } from './types';

export const adminService = {
  async getUsers(params?: { _page?: number; _limit?: number; q?: string }) {
    return apiGet<User>('/users', params);
  },

  async getUser(id: number) {
    return apiGetById<User>('/users', id);
  },

  async createUser(data: Partial<User>) {
    return apiPost<User>('/users', data);
  },

  async updateUser(id: number, data: Partial<User>) {
    return apiPut<User>('/users', id, data);
  },

  async patchUser(id: number, data: Partial<User>) {
    return apiPatch<User>('/users', id, data);
  },

  async deleteUser(id: number) {
    return apiDelete('/users', id);
  },

  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(data: Partial<Settings>) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getLowStockAlerts() {
    return apiGet<LowStockAlert>('/lowStockAlerts');
  },

  async getSequences() {
    return apiGet<Sequence>('/sequences');
  },

  async getCompliance() {
    return apiGet<Compliance>('/compliance');
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    const json = await res.json();
    return json.data;
  },
};
