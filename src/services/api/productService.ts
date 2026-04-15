import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Product, Category, Brand, Warehouse, ProductCategory, ProductBrand, AttributeGroupApi } from './types';

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
    return apiGet<Category>('/product-categories');
  },

  async createCategory(data: Partial<ProductCategory>) {
    return apiPost<ProductCategory>('/product-categories', data);
  },

  async updateCategory(id: string | number, data: Partial<ProductCategory>) {
    return apiPut<ProductCategory>('/product-categories', id, data);
  },

  async deleteCategory(id: string | number) {
    return apiDelete('/product-categories', id);
  },

  async getBrands() {
    return apiGet<Brand>('/brands');
  },

  async createBrand(data: Partial<ProductBrand>) {
    return apiPost<ProductBrand>('/brands', data);
  },

  async updateBrand(id: string | number, data: Partial<ProductBrand>) {
    return apiPut<ProductBrand>('/brands', id, data);
  },

  async deleteBrand(id: string | number) {
    return apiDelete('/brands', id);
  },

  async getAttributeGroups() {
    return apiGet<AttributeGroupApi>('/attribute-groups');
  },

  async createAttributeGroup(data: Partial<AttributeGroupApi>) {
    return apiPost<AttributeGroupApi>('/attribute-groups', data);
  },

  async updateAttributeGroup(id: string | number, data: Partial<AttributeGroupApi>) {
    return apiPut<AttributeGroupApi>('/attribute-groups', id, data);
  },

  async deleteAttributeGroup(id: string | number) {
    return apiDelete('/attribute-groups', id);
  },

  async getWarehouses() {
    return apiGet<Warehouse>('/warehouses');
  },
};
