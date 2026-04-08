import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Order, RetailOrder, WholesaleOrder, PurchaseOrder } from './types';

export const orderService = {
  async getOrders(params?: { _page?: number; _limit?: number; q?: string; status?: string }) {
    return apiGet<Order>('/orders', params);
  },

  async getOrder(id: number) {
    return apiGetById<Order>('/orders', id);
  },

  async createOrder(data: Partial<Order>) {
    return apiPost<Order>('/orders', data);
  },

  async updateOrder(id: number, data: Partial<Order>) {
    return apiPut<Order>('/orders', id, data);
  },

  async patchOrder(id: number, data: Partial<Order>) {
    return apiPatch<Order>('/orders', id, data);
  },

  async deleteOrder(id: number) {
    return apiDelete('/orders', id);
  },

  async getRetailOrders(params?: { _page?: number; _limit?: number }) {
    return apiGet<RetailOrder>('/retailOrders', params);
  },

  async getWholesaleOrders(params?: { _page?: number; _limit?: number }) {
    return apiGet<WholesaleOrder>('/wholesaleOrders', params);
  },

  async getPurchaseOrders(params?: { _page?: number; _limit?: number }) {
    return apiGet<PurchaseOrder>('/purchaseOrders', params);
  },
};
