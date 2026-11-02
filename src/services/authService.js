import api from './api';

// "Trust this device for 30 days": the token from a passed 2-step code, kept per account on this browser.
const DEVICE_KEY = 'sg.trusted-devices';
const devices = () => { try { return JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}'); } catch { return {}; } };
const deviceToken = (email) => devices()[String(email || '').trim().toLowerCase()];
function keepDeviceToken(data) {
  if (!data?.device_token || !data.user?.email) return;
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ ...devices(), [data.user.email.toLowerCase()]: data.device_token }));
  } catch { /* storage blocked: the code is simply asked again */ }
}

export const authService = {
  /**
   * Password step. Returns {access, refresh, user} — or, when 2-step verification applies,
   * {two_factor: 'verify'|'setup', ticket, …} and nothing is stored until the code passes.
   */
  async login(email, password) {
    const token = deviceToken(email);
    const { data } = await api.post('/auth/login/', { email, password, ...(token ? { device_token: token } : {}) });
    if (!data.two_factor) this.storeSession(data);
    return data;
  },

  storeSession(data) {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
  },

  // ---- 2-step verification at sign-in (ticket from login) ----
  async verifyCode(ticket, code, rememberDevice = false) {
    const { data } = await api.post('/auth/2fa/verify/', { ticket, code, remember_device: rememberDevice });
    keepDeviceToken(data);
    this.storeSession(data);
    return data;
  },
  async resendCode(ticket) {
    const { data } = await api.post('/auth/2fa/resend/', { ticket });
    return data;
  },
  async setupMethod(ticket, method) {
    const { data } = await api.post('/auth/2fa/setup/method/', { ticket, method });
    return data;
  },
  /** Turns 2FA on and signs in; the response carries backup codes (shown once). */
  async setupConfirm(ticket, code, rememberDevice = false) {
    const { data } = await api.post('/auth/2fa/setup/confirm/', { ticket, code, remember_device: rememberDevice });
    keepDeviceToken(data);
    return data;
  },

  // ---- 2-step verification while signed in (profile → security) ----
  async twoFactorStatus() {
    const { data } = await api.get('/auth/2fa/');
    return data;
  },
  async enableStart(password, method) {
    const { data } = await api.post('/auth/2fa/enable/', { password, method });
    return data;
  },
  async enableConfirm(ticket, code) {
    const { data } = await api.post('/auth/2fa/enable/', { ticket, code });
    return data;
  },
  async sendCurrentCode() {
    const { data } = await api.post('/auth/2fa/send-code/');
    return data;
  },
  async disableTwoFactor(password, code) {
    const { data } = await api.post('/auth/2fa/disable/', { password, code });
    return data;
  },
  /** Forget one trusted browser (id) or all of them. */
  async forgetDevices(id) {
    const { data } = await api.post('/auth/2fa/devices/forget/', id ? { id } : {});
    return data;
  },
  async newBackupCodes(code) {
    const { data } = await api.post('/auth/2fa/backup-codes/', { code });
    return data;
  },

  async logout() {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // ignore
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  async me() {
    const { data } = await api.get('/auth/me/');
    return data;
  },

  /** POST /auth/change-password/ — 400 carries field errors (old_password, new_password, …). */
  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    const { data } = await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return data;
  },

  /** POST /auth/password/forgot/ — emails a reset link (same answer whether or not the account exists). */
  async forgotPassword(email) {
    const { data } = await api.post('/auth/password/forgot/', { email });
    return data;
  },

  /** POST /auth/password/reset/ — uid + token come from the emailed link. */
  async resetPassword(uid, token, newPassword, newPasswordConfirm) {
    const { data } = await api.post('/auth/password/reset/', {
      uid, token, new_password: newPassword, new_password_confirm: newPasswordConfirm,
    });
    return data;
  },

  getCurrentUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};