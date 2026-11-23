// src/services/siteContentService.js
// Public-website content manager — backend: /api/admin/site-content/ (role admin/manager).
import api from './api';

const BASE = '/admin/site-content';
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
// Keys contain dots ("home.hero.title"); encode anything unusual.
const k = (key) => encodeURIComponent(key);

export const siteContentService = {
  // ---------- pages + texts ----------
  async pages() {
    const { data } = await api.get(`${BASE}/pages/`);
    return data;
  },
  async texts(params = {}) {
    const { data } = await api.get(`${BASE}/texts/`, { params });
    return data;
  },
  async updateText(key, { en, ar }) {
    const { data } = await api.patch(`${BASE}/texts/${k(key)}/`, { en, ar });
    return data;
  },
  async resetText(key) {
    const { data } = await api.post(`${BASE}/texts/${k(key)}/reset/`);
    return data;
  },

  // ---------- image slots ----------
  async images(params = {}) {
    const { data } = await api.get(`${BASE}/images/`, { params });
    return data;
  },
  async uploadImage(key, file, alt = {}) {
    const form = new FormData();
    form.append('image', file);
    if (alt.alt_en !== undefined) form.append('alt_en', alt.alt_en);
    if (alt.alt_ar !== undefined) form.append('alt_ar', alt.alt_ar);
    const { data } = await api.post(`${BASE}/images/${k(key)}/`, form, multipart);
    return data;
  },
  async updateImageAlt(key, alt) {
    const { data } = await api.patch(`${BASE}/images/${k(key)}/`, alt);
    return data;
  },
  async resetImage(key) {
    const { data } = await api.post(`${BASE}/images/${k(key)}/reset/`);
    return data;
  },

  // ---------- lists (facilities, articles, …) ----------
  async collections() {
    const { data } = await api.get(`${BASE}/collections/`);
    return data;
  },
  /** params: q, active, <choice field>=value */
  async items(collection, params = {}) {
    const { data } = await api.get(`${BASE}/collections/${collection}/items/`, { params });
    return data;
  },
  async createItem(collection, payload) {
    const { data } = await api.post(`${BASE}/collections/${collection}/items/`, payload);
    return data;
  },
  async updateItem(collection, id, payload) {
    const { data } = await api.patch(`${BASE}/collections/${collection}/items/${id}/`, payload);
    return data;
  },
  async deleteItem(collection, id) {
    await api.delete(`${BASE}/collections/${collection}/items/${id}/`);
  },
  async uploadItemImage(collection, id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post(`${BASE}/collections/${collection}/items/${id}/image/`, form, multipart);
    return data;
  },
  async resetItemImage(collection, id) {
    const { data } = await api.post(`${BASE}/collections/${collection}/items/${id}/image/reset/`);
    return data;
  },
  async reorder(collection, ids) {
    const { data } = await api.post(`${BASE}/collections/${collection}/reorder/`, { ids });
    return data;
  },

  // ---------- membership plans ----------
  async plans() {
    const { data } = await api.get(`${BASE}/plans/`);
    return data;
  },
  async createPlan(payload) {
    const { data } = await api.post(`${BASE}/plans/`, payload);
    return data;
  },
  async updatePlan(id, payload) {
    const { data } = await api.patch(`${BASE}/plans/${id}/`, payload);
    return data;
  },
  /** Only for plans nobody signed up for — the server explains otherwise. */
  async deletePlan(id) {
    await api.delete(`${BASE}/plans/${id}/`);
  },

  // ---------- contact inbox ----------
  async messages(params = {}) {
    const { data } = await api.get(`${BASE}/messages/`, { params });
    return data;
  },
  async updateMessage(id, payload) {
    const { data } = await api.patch(`${BASE}/messages/${id}/`, payload);
    return data;
  },
  async deleteMessage(id) {
    await api.delete(`${BASE}/messages/${id}/`);
  },
};
