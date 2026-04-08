import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Supplier, Merchant } from './types';

export const supplierService = {
  async getSuppliers(params?: { _page?: number; _limit?: number; q?: string }) {
    return apiGet<Supplier>('/suppliers', params);
  },

  async getSupplier(id: number) {
    return apiGetById<Supplier>('/suppliers', id);
  },

  async createSupplier(data: Partial<Supplier>) {
    return apiPost<Supplier>('/suppliers', data);
  },

  async updateSupplier(id: number, data: Partial<Supplier>) {
    return apiPut<Supplier>('/suppliers', id, data);
  },

  async patchSupplier(id: number, data: Partial<Supplier>) {
    return apiPatch<Supplier>('/suppliers', id, data);
  },

  async deleteSupplier(id: number) {
    return apiDelete('/suppliers', id);
  },
};

export const merchantService = {
  async getMerchants(params?: { _page?: number; _limit?: number; q?: string }) {
    return apiGet<Merchant>('/merchants', params);
  },

  async getMerchant(id: number) {
    return apiGetById<Merchant>('/merchants', id);
  },

  async createMerchant(data: Partial<Merchant>) {
    return apiPost<Merchant>('/merchants', data);
  },

  async updateMerchant(id: number, data: Partial<Merchant>) {
    return apiPut<Merchant>('/merchants', id, data);
  },

  async patchMerchant(id: number, data: Partial<Merchant>) {
    return apiPatch<Merchant>('/merchants', id, data);
  },

  async deleteMerchant(id: number) {
    return apiDelete('/merchants', id);
  },
};
