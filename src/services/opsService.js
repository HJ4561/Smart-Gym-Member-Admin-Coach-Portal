// src/services/opsService.js — back office for member purchases (/api/admin/…, role admin or manager).
import api from './api';

export const opsService = {
  // Facility add-on prices
  /** params: q, show (bookable | not_bookable | hidden | visible) */
  async facilityPricing(params = {}) {
    const { data } = await api.get('/admin/facility-pricing/', { params });
    return data;
  },
  async updateFacilityPricing(itemId, payload) {
    const { data } = await api.patch(`/admin/facility-pricing/${itemId}/`, payload);
    return data;
  },

  // Shop orders
  async orders(params = {}) {
    const { data } = await api.get('/admin/shop/orders/', { params });
    return data;
  },
  async order(number) {
    const { data } = await api.get(`/admin/shop/orders/${encodeURIComponent(number)}/`);
    return data;
  },
  async setOrderStatus(number, status) {
    const { data } = await api.post(`/admin/shop/orders/${encodeURIComponent(number)}/status/`, { status });
    return data;
  },
  async refundOrder(number, payload = {}) {
    const { data } = await api.post(`/admin/shop/orders/${encodeURIComponent(number)}/refund/`, payload);
    return data;
  },

  // Payments that need a manual decision
  async paymentsReview() {
    const { data } = await api.get('/admin/payments/review/');
    return data;
  },
  async refundPayment(intentId, payload = {}) {
    const { data } = await api.post(`/admin/payments/intents/${intentId}/refund/`, payload);
    return data;
  },

  // Trainer hours + sessions
  /** params: q, accepting */
  async trainerHours(params = {}) {
    const { data } = await api.get('/admin/trainer-hours/', { params });
    return data;
  },
  async saveTrainerHours(trainerId, payload) {
    const { data } = await api.put(`/admin/trainer-hours/${trainerId}/`, payload);
    return data;
  },
  async trainerSessions(params = {}) {
    const { data } = await api.get('/admin/trainer-sessions/', { params });
    return data;
  },
  /** Move / delay / edit a scheduled 1-on-1 — the member is told. */
  async changeSession(id, body) {
    const { data } = await api.post(`/admin/trainer-sessions/${id}/change/`, body);
    return data;
  },
  async setSessionStatus(id, status) {
    const { data } = await api.post(`/admin/trainer-sessions/${id}/status/`, { status });
    return data;
  },
};
