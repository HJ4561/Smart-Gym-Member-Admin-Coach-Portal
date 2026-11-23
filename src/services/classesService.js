import api from './api';

export const classesService = {
  // Member
  /** params: q, level, category, trainer */
  async list(params = {}) {
    const { data } = await api.get('/classes/', { params });
    return data;
  },
  async book(id) {
    const { data } = await api.post(`/classes/${id}/book/`);
    return data;
  },
  /** Free class: frees the weekly spot. Paid single session: pass its `date` (refunded 24 h+ ahead). */
  async cancel(id, date) {
    const { data } = await api.post(`/classes/${id}/cancel/`, date ? { date } : {});
    return data;
  },

  // Admin
  /** The coach's messages and approved videos for a class the member is booked into. */
  async posts(id) {
    const { data } = await api.get(`/classes/${id}/posts/`);
    return data;
  },
  async schedule() {
    const { data } = await api.get('/classes/schedule/');
    return data;
  },
  async stats() {
    const { data } = await api.get('/classes/stats/');
    return data;
  },
  async adminList(params = {}) {
    const { data } = await api.get('/classes/admin/', { params });
    return data;
  },
  async create(payload) {
    const { data } = await api.post('/classes/admin/', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/classes/admin/${id}/`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/classes/admin/${id}/`);
  },
  async roster(id) {
    const { data } = await api.get(`/classes/admin/${id}/roster/`);
    return data;
  },
  async removeFromRoster(id, enrollmentId) {
    const { data } = await api.post(`/classes/admin/${id}/roster/${enrollmentId}/remove/`);
    return data;
  },
};
