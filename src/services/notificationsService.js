import api from './api';

// Anything that changes notifications (read, all read, deleted) tells every bell on the page —
// and in the other open tabs of this browser — to refresh now instead of waiting for its timer.
export const NOTIFICATIONS_CHANGED = 'notifications:changed';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sg-notifications') : null;
if (channel) channel.onmessage = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  try { channel?.postMessage('changed'); } catch { /* other tabs catch up on their timer */ }
}

export const notificationsService = {
  async list(params = {}) {
    const { data } = await api.get('/notifications/', { params });
    return data;
  },

  async unreadCount() {
    const { data } = await api.get('/notifications/unread-count/');
    return data;
  },

  async markRead(id) {
    const { data } = await api.post(`/notifications/${id}/read/`);
    announceNotificationsChanged();
    return data;
  },

  async markAllRead() {
    const { data } = await api.post('/notifications/mark-all-read/');
    announceNotificationsChanged();
    return data;
  },

  async remove(id) {
    await api.delete(`/notifications/${id}/`);
    announceNotificationsChanged();
  },

  async preferences() {
    const { data } = await api.get('/notifications/preferences/');
    return data;
  },

  async updatePreferences(payload) {
    const { data } = await api.patch('/notifications/preferences/', payload);
    return data;
  },
};
