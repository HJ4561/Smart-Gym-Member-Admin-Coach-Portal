import api from './api';

export const nutritionService = {
  async nutritionists(params = {}) {
    const { data } = await api.get('/nutrition/nutritionists/', { params });
    return data;
  },

  async nutritionist(id) {
    const { data } = await api.get(`/nutrition/nutritionists/${id}/`);
    return data;
  },

  async myPlan() {
    const { data } = await api.get('/nutrition/plan/');
    return data;
  },

  /** Every active plan — one per nutritionist the member has paid — newest first. */
  async myPlans() {
    const { data } = await api.get('/nutrition/plans/');
    return data;
  },

  async requestPlan(nutritionistId, goal) {
    const { data } = await api.post('/nutrition/plan/request/', {
      nutritionist_id: nutritionistId,
      goal,
    });
    return data;
  },

  async meals(date) {
    const { data } = await api.get('/nutrition/meals/', { params: { date } });
    return data;
  },

  async logMeal(payload) {
    const { data } = await api.post('/nutrition/meals/', payload);
    return data;
  },

  async deleteMeal(id) {
    await api.delete(`/nutrition/meals/${id}/`);
  },

  async water() {
    const { data } = await api.get('/nutrition/water/');
    return data;
  },

  async addWater(amountMl) {
    const { data } = await api.post('/nutrition/water/', { amount_ml: amountMl });
    return data;
  },

  async dailySummary() {
    const { data } = await api.get('/nutrition/summary/');
    return data;
  },

  async dexaHistory() {
    const { data } = await api.get('/nutrition/dexa/');
    return data;
  },

  async latestDexa() {
    const { data } = await api.get('/nutrition/dexa/latest/');
    return data;
  },
};