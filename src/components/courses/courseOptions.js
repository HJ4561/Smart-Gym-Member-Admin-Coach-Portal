// src/components/courses/courseOptions.js — course choices shared by the admin console and coach portal.
import { tl } from '../../i18n';

export const LEVELS = [['beginner', tl("Beginner")], ['intermediate', tl("Intermediate")], ['advanced', tl("Advanced")], ['all_levels', tl("All levels")]];
// Same fixed list as the backend (apps/admin_api/catalog_ops.py COURSE_CATEGORIES).
export const COURSE_CATEGORIES = ['Training', 'Strength', 'Hypertrophy', 'Fat Loss', 'Endurance', 'Mobility',
  'Combat', 'Recovery', 'Nutrition', 'Biometrics'];
// "Biometrics" courses are about measuring the body (DEXA scans, body fat, lean mass) — say so.
const CATEGORY_LABELS = { Biometrics: 'Body Composition / Biometrics' };
export const categoryLabel = (c) => tl(CATEGORY_LABELS[c] || c);
export const STATUS_TONE = {
  published: 'bg-emerald-500/15 text-emerald-400', draft: 'bg-neutral-500/20 text-on-surface-variant',
  pending: 'bg-amber-500/15 text-amber-400', archived: 'bg-rose-500/15 text-rose-400',
};
export const NEW_COURSE = {
  title: '', subtitle: '', description: '', category: '', level: 'all_levels', trainer_id: '', duration_weeks: 8,
  days_per_week: 3, estimated_minutes_per_session: 60, price: '0', is_included_with_pro: false, is_featured: false,
  promo_video_url: '', status: 'draft', status_label: 'Draft', total_enrolled: 0, modules: [], review_note: '',
};
