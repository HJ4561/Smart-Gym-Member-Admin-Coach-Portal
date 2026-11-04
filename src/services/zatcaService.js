import api from './api';

// ZATCA e-invoicing (admin). Secrets never reach the browser: the device shows "set / not set" only.
export const zatcaService = {
  async status() {
    const { data } = await api.get('/admin/zatca/status/');
    return data;
  },
  async saveSettings(payload) {
    const { data } = await api.patch('/admin/zatca/settings/', payload);
    return data;
  },

  // ---- go-live wizard ----
  async start(environment, confirmProduction = false) {
    const { data } = await api.post('/admin/zatca/onboard/start/', { environment, confirm_production: confirmProduction });
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
  async xml(id) {
    const { data } = await api.get(`/admin/zatca/documents/${id}/xml/`, { responseType: 'blob' });
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
};
