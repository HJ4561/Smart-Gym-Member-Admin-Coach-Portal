// src/services/coachService.js — the coach portal API (/api/coach/…).
import api from './api';

const get = async (url, params) => (await api.get(url, { params })).data;
const post = async (url, body) => (await api.post(url, body)).data;
const patch = async (url, body) => (await api.patch(url, body)).data;
const put = async (url, body) => (await api.put(url, body)).data;
const upload = async (url, file) => {
  const form = new FormData();
  form.append('image', file);
  return (await api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const coachService = {
  me: () => get('/coach/me/'),
  updateMe: (body) => patch('/coach/me/', body),
  uploadPhoto: (file) => upload('/coach/me/photo/', file),
  dashboard: () => get('/coach/dashboard/'),

  hours: () => get('/coach/hours/'),
  saveHours: (body) => put('/coach/hours/', body),
  /** params: status, q, from, to */
  sessions: (scope = 'upcoming', params = {}) => get('/coach/sessions/', { scope, ...params }),
  setSessionStatus: (id, status) => post(`/coach/sessions/${id}/status/`, { status }),
  /** {delay_minutes} or {scheduled_at}, plus duration_minutes, focus_area, notes, reason — the member is told. */
  changeSession: (id, body) => post(`/coach/sessions/${id}/change/`, body),

  /** params: status, category, level, q */
  courses: (params = {}) => get('/coach/courses/', params),
  course: (id) => get(`/coach/courses/${id}/`),
  createCourse: (body) => post('/coach/courses/', body),
  updateCourse: (id, body) => patch(`/coach/courses/${id}/`, body),
  deleteCourse: async (id) => { await api.delete(`/coach/courses/${id}/`); },
  submitCourse: (id) => post(`/coach/courses/${id}/submit/`),
  uploadCourseCover: (id, file) => upload(`/coach/courses/${id}/cover/`, file),

  /** params: q, course, status */
  students: (params = {}) => get('/coach/students/', params),
  student: (id) => get(`/coach/students/${id}/`),
  /** params: q, category */
  classes: (scope = 'upcoming', params = {}) => get('/coach/classes/', { scope, ...params }),
  classPosts: (id) => get(`/coach/classes/${id}/posts/`),
  /** form: FormData {kind: message|video, title, body, video_url, for_date, image?} */
  addClassPost: async (id, form) => (await api.post(`/coach/classes/${id}/posts/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
  deleteClassPost: async (id, postId) => { await api.delete(`/coach/classes/${id}/posts/${postId}/`); },
  /** params: rating, q, from, to */
  reviews: (params = {}) => get('/coach/reviews/', params),
  earnings: () => get('/coach/earnings/'),

  machines: (q) => get('/coach/machines/', q ? { q } : undefined),
  videos: (params) => get('/coach/videos/', params),
  uploadVideoThumbnail: (id, file) => upload(`/coach/videos/${id}/thumbnail/`, file),
  addVideo: (body) => post('/coach/videos/', body),
  updateVideo: (id, body) => patch(`/coach/videos/${id}/`, body),
  deleteVideo: async (id) => { await api.delete(`/coach/videos/${id}/`); },
};
