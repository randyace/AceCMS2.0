import { apiGet, apiGetById, apiPost, apiPut, apiPatch, apiDelete } from './apiClient';
import type { Member } from './types';

export const memberService = {
  async getMembers(params?: { _page?: number; _limit?: number; q?: string; level?: string }) {
    return apiGet<Member>('/members', params);
  },

  async getMember(id: number) {
    return apiGetById<Member>('/members', id);
  },

  async createMember(data: Partial<Member>) {
    return apiPost<Member>('/members', data);
  },

  async updateMember(id: number, data: Partial<Member>) {
    return apiPut<Member>('/members', id, data);
  },

  async patchMember(id: number, data: Partial<Member>) {
    return apiPatch<Member>('/members', id, data);
  },

  async deleteMember(id: number) {
    return apiDelete('/members', id);
  },
};
