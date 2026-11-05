import api from './api';

// ZATCA e-invoicing. Admin: secrets never reach the browser (the device shows "set / not set" only).
// Members: the companies they buy for (B2B tax invoices).
export const zatcaService = {
  async status() {
    const { data } = await api.get('/admin/zatca/status/');
    return data;
  },
  async saveSettings(payload) {
    const { data } = await api.patch('/admin/zatca/settings/', payload);
    return data;
  },
  async uploadLogo(file) {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await api.post('/admin/zatca/logo/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  async removeLogo() {
    const { data } = await api.delete('/admin/zatca/logo/');
    return data;
  },

  // ---- go-live wizard ----
  async start(environment, confirmProduction = false, b2b = false) {
    const { data } = await api.post('/admin/zatca/onboard/start/', { environment, confirm_production: confirmProduction, b2b });
    return data;
  },
  async otp(deviceId, otp) {
    const { data } = await api.post(`/admin/zatca/onboard/${deviceId}/otp/`, { otp });
    return data;
  },
  async checks(deviceId) {
    const { data } = await api.post(`/admin/zatca/onboard/${deviceId}/checks/`);
    return data;
  },
  async production(deviceId) {
    const { data } = await api.post(`/admin/zatca/onboard/${deviceId}/production/`);
    return data;
  },
  async activate(deviceId) {
    const { data } = await api.post(`/admin/zatca/onboard/${deviceId}/activate/`);
    return data;
  },

  // ---- invoice log ----
  async documents(params = {}) {
    const { data } = await api.get('/admin/zatca/documents/', { params });
    return data;
  },
  async document(id) {
    const { data } = await api.get(`/admin/zatca/documents/${id}/`);
    return data;
  },
  async xml(id, copy) {
    const { data } = await api.get(`/admin/zatca/documents/${id}/xml/`, { params: copy ? { copy } : {}, responseType: 'blob' });
    return data;
  },
  /** A debit note on invoice `id`: {amount (extra, incl. VAT), reason, description?, collected_with?: cash | card_terminal}. */
  async debitNote(id, payload) {
    const { data } = await api.post(`/admin/zatca/documents/${id}/debit/`, payload);
    return data;
  },
  async send(id) {
    const { data } = await api.post(`/admin/zatca/documents/${id}/send/`);
    return data;
  },
  async retry() {
    const { data } = await api.post('/admin/zatca/retry/');
    return data;
  },
  async events() {
    const { data } = await api.get('/admin/zatca/events/');
    return data;
  },

  // ---- companies (B2B buyers) ----
  async companies(params = {}) {
    const { data } = await api.get('/admin/zatca/companies/', { params });
    return data;
  },
  async removeCompany(id) {
    await api.delete(`/admin/zatca/companies/${id}/`);
  },

  // ---- the member's own companies: { b2b, companies } ----
  async myCompanies() {
    const { data } = await api.get('/zatca/companies/');
    return data;
  },
  async addMyCompany(payload) {
    const { data } = await api.post('/zatca/companies/', payload);
    return data;
  },
  async removeMyCompany(id) {
    await api.delete(`/zatca/companies/${id}/`);
  },
};
