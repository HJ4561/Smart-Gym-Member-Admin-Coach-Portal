import api from './api';

export const membersService = {
  async plans() {
    const { data } = await api.get('/members/plans/');
    return data;
  },

  async myMembership() {
    const { data } = await api.get('/members/membership/');
    return data;
  },

  async checkIns() {
    const { data } = await api.get('/members/check-ins/');
    return data;
  },

  /** Signed, short-lived QR token for the digital pass (staff scan it at the desk). */
  /** Bookable facilities with ownership and today's add-on price (monthly price × months left). */
  async facilities() {
    const { data } = await api.get('/members/facilities/');
    return data;
  },

  async pass() {
    const { data } = await api.get('/members/pass/');
    return data;
  },

  /** {code, link, reward, joined, earned}: the member's referral link and what it has earned. */
  async referral() {
    const { data } = await api.get('/members/referral/');
    return data;
  },

  async checkOut(id) {
    const { data } = await api.post(`/members/check-ins/${id}/check-out/`);
    return data;
  },
};