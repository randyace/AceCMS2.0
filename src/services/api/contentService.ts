import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Page, News, Service } from './types';

export const contentService = {
  async getPages(params?: { _page?: number; _limit?: number; q?: string }) {
    return apiGet<Page>('/pages', params);
  },

  async getPage(id: number) {
    return apiGetById<Page>('/pages', id);
  },

  async createPage(data: Partial<Page>) {
    return apiPost<Page>('/pages', data);
  },

  async updatePage(id: number, data: Partial<Page>) {
    return apiPut<Page>('/pages', id, data);
  },

  async patchPage(id: number, data: Partial<Page>) {
    return apiPatch<Page>('/pages', id, data);
  },

  async deletePage(id: number) {
    return apiDelete('/pages', id);
  },

  async getNews(params?: { _page?: number; _limit?: number; q?: string }) {
    return apiGet<News>('/news', params);
  },

  async getNewsItem(id: number) {
    return apiGetById<News>('/news', id);
  },

  async createNews(data: Partial<News>) {
    return apiPost<News>('/news', data);
  },

  async updateNews(id: number, data: Partial<News>) {
    return apiPut<News>('/news', id, data);
  },

  async patchNews(id: number, data: Partial<News>) {
    return apiPatch<News>('/news', id, data);
  },

  async deleteNews(id: number) {
    return apiDelete('/news', id);
  },

  async getServices() {
    return apiGet<Service>('/services');
  },
};
