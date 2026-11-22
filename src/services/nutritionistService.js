// src/services/nutritionistService.js — the nutritionist portal's API (/api/nutritionist/…).
import api from './api';

export const nutritionistService = {
  async me() {
    const { data } = await api.get('/nutritionist/me/');
    return data;
  },
  /** Profile fields go to an admin for approval ({detail} in the reply); accepting clients changes at once. */
  async updateMe(payload) {
    const { data } = await api.patch('/nutritionist/me/', payload);
    return data;
  },
  async uploadPhoto(file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post('/nutritionist/me/photo/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  async clients(params = {}) {
    const { data } = await api.get('/nutritionist/clients/', { params });
    return data;
  },
  async client(memberId) {
    const { data } = await api.get(`/nutritionist/clients/${memberId}/`);
    return data;
  },
  async plans(params = {}) {
    const { data } = await api.get('/nutritionist/plans/', { params });
    return data;
  },
  async updatePlan(id, payload) {
    const { data } = await api.patch(`/nutritionist/plans/${id}/`, payload);
    return data;
  },
  async addScan(memberId, payload) {
    const { data } = await api.post(`/nutritionist/clients/${memberId}/scans/`, payload);
    return data;
  },
};
