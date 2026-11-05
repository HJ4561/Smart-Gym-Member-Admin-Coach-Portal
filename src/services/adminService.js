// src/services/adminService.js
import api from './api';

export const adminService = {
  // ============================================
  // OVERVIEW
  // ============================================
  /** range: '7d' | '30d' | '90d' | 'ytd' */
  async overview(range = '30d') {
    const { data } = await api.get('/admin/overview/', { params: { range } });
    return data;
  },

  /** CSV of every transaction in the range (Blob). */
  async emailReceipt(transactionId) {
    const { data } = await api.post(`/admin/finance/transactions/${transactionId}/email-receipt/`);
    return data;
  },

  async exportTransactions(range = '30d') {
    const { data } = await api.get('/admin/finance/transactions/export/', { params: { range }, responseType: 'blob' });
    return data;
  },

  // ============================================
  // MEMBERS
  // ============================================
  async members(params = {}) {
    const { data } = await api.get('/admin/members/', { params });
    return data;
  },

  async member(id) {
    const { data } = await api.get(`/admin/members/${id}/`);
    return data;
  },

  async updateMember(id, payload) {
    const { data } = await api.patch(`/admin/members/${id}/update/`, payload);
    return data;
  },

  async memberStats() {
    const { data } = await api.get('/admin/members/stats/');
    return data;
  },

  /** action: extend | freeze | unfreeze | message | reset_password | deactivate | reactivate (+ its fields) */
  async memberAction(id, action, fields = {}) {
    const { data } = await api.post(`/admin/members/${id}/action/`, { action, ...fields });
    return data;
  },

  /** action: message | freeze (+ fields) — JSON; export — CSV Blob. */
  async bulkMemberAction(action, memberIds, fields = {}) {
    const { data } = await api.post('/admin/members/bulk-action/', { action, member_ids: memberIds, ...fields },
      action === 'export' ? { responseType: 'blob' } : undefined);
    return data;
  },

  async machineStats() {
    const { data } = await api.get('/admin/machines/stats/');
    return data;
  },

  async machineCategories() {
    const { data } = await api.get('/admin/machines/categories/');
    return data;
  },

    async revenueMonthly(months = 12) {
    const { data } = await api.get('/admin/finance/revenue-monthly/', {
      params: { months },
    });
    return data;
  },

  async revenueStreams(range = '30d') {
    const { data } = await api.get('/admin/finance/revenue-streams/', { params: { range } });
    return data;
  },

  async topMembers(limit = 5) {
    const { data } = await api.get('/admin/finance/top-members/', {
      params: { limit },
    });
    return data;
  },

  async transactionDetail(id) {
    const { data } = await api.get(`/admin/finance/transactions/${id}/`);
    return data;
  },

  async trainersAdmin(params = {}) {
    const { data } = await api.get('/admin/trainers/', { params });
    return data;
  },

  async trainerStats() {
    const { data } = await api.get('/admin/trainers/stats/');
    return data;
  },

  async createTrainer(payload) {
    const { data } = await api.post('/admin/trainers/', payload);
    return data;
  },

  async updateTrainer(id, payload) {
    const { data } = await api.patch(`/admin/trainers/${id}/`, payload);
    return data;
  },
  async deleteTrainer(id) {
    await api.delete(`/admin/trainers/${id}/`);
  },

  async uploadTrainerPhoto(id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post(`/admin/trainers/${id}/photo/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  // Courses (all statuses — the member catalogue only shows published ones)
  async coursesAdmin(params = {}) {
    const { data } = await api.get('/admin/courses/', { params });
    return data;
  },

  async courseStats() {
    const { data } = await api.get('/admin/courses/stats/');
    return data;
  },

  async courseAdmin(id) {
    const { data } = await api.get(`/admin/courses/${id}/`);
    return data;
  },

  async createCourse(payload) {
    const { data } = await api.post('/admin/courses/', payload);
    return data;
  },

  async updateCourse(id, payload) {
    const { data } = await api.patch(`/admin/courses/${id}/`, payload);
    return data;
  },

  async deleteCourse(id) {
    await api.delete(`/admin/courses/${id}/`);
  },

  async uploadCourseCover(id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post(`/admin/courses/${id}/cover/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  async staffAdmin(params = {}) {
    const { data } = await api.get('/admin/staff/', { params });
    return data;
  },

  async createStaff(payload) {
    const { data } = await api.post('/admin/staff/', payload);
    return data;
  },

  async updateStaff(id, payload) {
    const { data } = await api.patch(`/admin/staff/${id}/`, payload);
    return data;
  },

  /** Gym-wide 2-step verification switches (admins, with their password). */
  async saveSecurity(body) {
    const { data } = await api.patch('/admin/settings/security/', body);
    return data;
  },
  async trainerPortalAccess(id, body = {}) {
    const { data } = await api.post(`/admin/trainers/${id}/portal-access/`, body);
    return data;
  },
  async resetStaff2fa(id) {
    const { data } = await api.post(`/admin/staff/${id}/reset-2fa/`);
    return data;
  },
  async machineVideos(exerciseId) {
    const { data } = await api.get(`/admin/machines/${exerciseId}/videos/`);
    return data;
  },
  async addMachineVideo(exerciseId, body) {
    const { data } = await api.post(`/admin/machines/${exerciseId}/videos/`, body);
    return data;
  },
  async updateMachineVideo(id, body) {
    const { data } = await api.patch(`/admin/machine-videos/${id}/`, body);
    return data;
  },
  async deleteMachineVideo(id) {
    await api.delete(`/admin/machine-videos/${id}/`);
  },
  async deleteStaff(id) {
    const { data } = await api.delete(`/admin/staff/${id}/`);
    return data;
  },

  async sendStaffSignIn(id) {
    const { data } = await api.post(`/admin/staff/${id}/send-sign-in/`);
    return data;
  },

  async staffStats() {
    const { data } = await api.get('/admin/staff/stats/');
    return data;
  },

  /** {total, groups: [{key, label, label_ar, count, items: [{id, name, fields, link | edit_url}]}]} */
  async missingArabic() {
    const { data } = await api.get('/admin/missing-arabic/');
    return data;
  },

  async settings() {
    const { data } = await api.get('/admin/settings/');
    return data;
  },

  // ============================================
  // MACHINES
  // ============================================
  async machines(params = {}) {
    const { data } = await api.get('/admin/machines/', { params });
    return data;
  },

  // Nutrition
  async nutritionists(params = {}) {
    const { data } = await api.get('/admin/nutrition/nutritionists/', { params });
    return data;
  },
  async createNutritionist(payload) {
    const { data } = await api.post('/admin/nutrition/nutritionists/', payload);
    return data;
  },
  async updateNutritionist(id, payload) {
    const { data } = await api.patch(`/admin/nutrition/nutritionists/${id}/`, payload);
    return data;
  },
  async deleteNutritionist(id) {
    await api.delete(`/admin/nutrition/nutritionists/${id}/`);
  },
  async uploadNutritionistPhoto(id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post(`/admin/nutrition/nutritionists/${id}/photo/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  async nutritionPlans(params = {}) {
    const { data } = await api.get('/admin/nutrition/plans/', { params });
    return data;
  },
  async updateNutritionPlan(id, payload) {
    const { data } = await api.patch(`/admin/nutrition/plans/${id}/`, payload);
    return data;
  },
  async memberScans(memberId) {
    const { data } = await api.get(`/admin/nutrition/members/${memberId}/scans/`);
    return data;
  },
  async memberMeals(memberId, days = 14) {
    const { data } = await api.get(`/admin/nutrition/members/${memberId}/meals/`, { params: { days } });
    return data;
  },
  async addMemberScan(memberId, payload) {
    const { data } = await api.post(`/admin/nutrition/members/${memberId}/scans/`, payload);
    return data;
  },

  // Shop catalogue (products, categories, promo codes)
  async shopProducts(params = {}) {
    const { data } = await api.get('/admin/shop/products/', { params });
    return data;
  },
  async shopStats() {
    const { data } = await api.get('/admin/shop/stats/');
    return data;
  },
  async saveProduct(id, payload) {
    const { data } = id ? await api.patch(`/admin/shop/products/${id}/`, payload) : await api.post('/admin/shop/products/', payload);
    return data;
  },
  /** {prefix, sku}: the category's SKU prefix and the next free number. */
  async nextSku(categoryId, productId) {
    const { data } = await api.get('/admin/shop/products/next-sku/', { params: { category_id: categoryId, product_id: productId || undefined } });
    return data;
  },
  async deleteProduct(id) {
    await api.delete(`/admin/shop/products/${id}/`);
  },
  async uploadProductImage(id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post(`/admin/shop/products/${id}/image/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  async shopCategories() {
    const { data } = await api.get('/admin/shop/categories/');
    return data;
  },
  async saveCategory(id, payload) {
    const { data } = id ? await api.patch(`/admin/shop/categories/${id}/`, payload) : await api.post('/admin/shop/categories/', payload);
    return data;
  },
  async deleteCategory(id) {
    await api.delete(`/admin/shop/categories/${id}/`);
  },
  async shopPromos() {
    const { data } = await api.get('/admin/shop/promos/');
    return data;
  },
  async savePromo(id, payload) {
    const { data } = id ? await api.patch(`/admin/shop/promos/${id}/`, payload) : await api.post('/admin/shop/promos/', payload);
    return data;
  },
  async deletePromo(id) {
    await api.delete(`/admin/shop/promos/${id}/`);
  },

  async createMachine(payload) {
    const { data } = await api.post('/admin/machines/', payload);
    return data;
  },

  async updateMachine(id, payload) {
    const { data } = await api.patch(`/admin/machines/${id}/`, payload);
    return data;
  },

  async deleteMachine(id) {
    await api.delete(`/admin/machines/${id}/`);
  },

  async regenerateQR(exerciseId) {
    const { data } = await api.post(
      `/admin/machines/${exerciseId}/regenerate-qr/`
    );
    return data;
  },

  // ============================================
  // FINANCE
  // ============================================
  async financeOverview(range = '30d') {
    const { data } = await api.get('/admin/finance/overview/', { params: { range } });
    return data;
  },

  async transactions(params = {}) {
    const { data } = await api.get('/admin/finance/transactions/', { params });
    return data;
  },

  // ============================================
  // ANALYTICS
  // ============================================
  async analyticsKPIs() {
    const { data } = await api.get('/admin/analytics/kpis/');
    return data;
  },

  async analyticsGrowth() {
    const { data } = await api.get('/admin/analytics/growth/');
    return data;
  },

  async aiInsights() {
    const { data } = await api.get('/admin/analytics/insights/');
    return data;
  },

  // ============================================
  // DASHBOARD EXTRAS
  // ============================================
  async flowAndRevenue(range = '30d') {
    const { data } = await api.get('/admin/flow-and-revenue/', { params: { range } });
    return data;
  },

  async arenaHeatmap() {
    const { data } = await api.get('/admin/arena-heatmap/');
    return data;
  },

  async auditFeed(limit = 20) {
    const { data } = await api.get('/admin/audit-feed/', { params: { limit } });
    return data;
  },

    async facilityNodes() {
    const { data } = await api.get('/admin/facility-nodes/');
    return data;
  },

  // ============================================
  // REGISTRATIONS (public-site signups)
  // ============================================
  async registrations(params = {}) {
    const { data } = await api.get('/admin/registrations-api/registrations/', { params });
    return data;
  },

  async registration(id) {
    const { data } = await api.get(`/admin/registrations-api/registrations/${id}/`);
    return data;
  },

  async registrationStats() {
    const { data } = await api.get('/admin/registrations-api/registrations/stats/');
    return data;
  },

  async approveRegistration(id) {
    const { data } = await api.post(
      `/admin/registrations-api/registrations/${id}/approve/`
    );
    return data;
  },

  async rejectRegistration(id, reason = '', refund = false) {
    const { data } = await api.post(
      `/admin/registrations-api/registrations/${id}/reject/`,
      { reason, refund }
    );
    return data;
  },

  async bulkApproveRegistrations({ ids, onlyToday = false } = {}) {
    const body = { only_today: onlyToday };
    if (ids && ids.length) body.ids = ids;
    const { data } = await api.post(
      '/admin/registrations-api/registrations/bulk-approve/',
      body
    );
    return data;
  },

  // ============================================
  // MEMBER LOOKUP + GYM ENTRY
  // ============================================
  async lookupMember(iqama) {
    const { data } = await api.get('/admin/registrations-api/members/lookup/', {
      params: { iqama },
    });
    return data;
  },

  /** Resolve a scanned digital-pass QR ("SGPASS:..."). */
  async lookupMemberByPass(token) {
    const { data } = await api.get('/admin/registrations-api/members/lookup/', {
      params: { pass: token },
    });
    return data;
  },

  async faceVerify(memberId, { match, confidence }) {
    const { data } = await api.post(
      `/admin/registrations-api/members/${memberId}/face-verify/`,
      { match, confidence }
    );
    return data;
  },

  async checkInMember(memberId, { facility, zone, faceVerified } = {}) {
    const { data } = await api.post(
      `/admin/registrations-api/members/${memberId}/check-in/`,
      {
        facility: facility || 'Metro Station Core 01',
        zone: zone || '',
        face_verified: !!faceVerified,
      }
    );
    return data;
  },

  async checkOut(checkInId) {
    const { data } = await api.post(
      `/admin/registrations-api/check-ins/${checkInId}/check-out/`
    );
    return data;
  },
};