// src/services/approvalsService.js — the admin's approval queue, the staff activity log and "my requests".
import api from './api';

export const approvalsService = {
  async queue(params = {}) {
    const { data } = await api.get('/admin/approvals/', { params });
    return data;
  },
  async counts() {
    const { data } = await api.get('/admin/approvals/counts/');
    return data;
  },
  async detail(id) {
    const { data } = await api.get(`/admin/approvals/${id}/`);
    return data;
  },
  /** payload: the admin's edited values (optional). */
  async approve(id, { payload, note } = {}) {
    const { data } = await api.post(`/admin/approvals/${id}/approve/`, { ...(payload ? { payload } : {}), note });
    return data;
  },
  async reject(id, note) {
    const { data } = await api.post(`/admin/approvals/${id}/reject/`, { note });
    return data;
  },
  async activity(params = {}) {
    const { data } = await api.get('/admin/staff-activity/', { params });
    return data;
  },
  async mine(params = {}) {
    const { data } = await api.get('/approvals/mine/', { params });
    return data;
  },
  async withdraw(id) {
    const { data } = await api.post(`/approvals/mine/${id}/withdraw/`);
    return data;
  },
};
