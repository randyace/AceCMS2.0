import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Product, Category, Brand, Warehouse } from './types';

export const productService = {
  async getProducts(params?: { _page?: number; _limit?: number; q?: string; _sort?: string; _order?: string }) {
    return apiGet<Product>('/products', params);
  },

  async getProduct(id: string) {
    return apiGetById<Product>('/products', id);
  },

  async createProduct(data: Partial<Product>) {
    return apiPost<Product>('/products', data);
  },

  async updateProduct(id: string, data: Partial<Product>) {
    return apiPut<Product>('/products', id, data);
  },

  async patchProduct(id: string, data: Partial<Product>) {
    return apiPatch<Product>('/products', id, data);
  },

  async deleteProduct(id: string) {
    return apiDelete('/products', id);
  },

  async getCategories() {
    return apiGet<Category>('/categories');
  },

  async getBrands() {
    return apiGet<Brand>('/brands');
  },

  async getWarehouses() {
    return apiGet<Warehouse>('/warehouses');
  },
};
