// src/utils/roleHome.js
// Where each kind of account lands after signing in. One site, one portal per role:
//   admin, manager   → /admin      (the console: everything)
//   trainer          → /coach
//   receptionist     → /desk       (only the modules an admin ticked)
//   shop_manager     → /shop
//   nutritionist     → /nutrition
//   member           → /dashboard

export const STAFF_ROLES = ['admin', 'manager'];      // admin console
export const COACH_ROLES = ['trainer'];                // coach portal
export const TEAM_ROLES = ['receptionist', 'shop_manager', 'nutritionist'];   // their own portals

export const isStaff = (user) => STAFF_ROLES.includes(user?.role);
export const isCoach = (user) => COACH_ROLES.includes(user?.role);
export const isDesk = (user) => user?.role === 'receptionist';
export const isShop = (user) => user?.role === 'shop_manager';
export const isNutritionist = (user) => user?.role === 'nutritionist';
/** Anyone who works at the gym (has a portal other than the member pages). */
export const isTeam = (user) => isStaff(user) || isCoach(user) || TEAM_ROLES.includes(user?.role);

/** Admins and managers change things; other portals view some of the same pages read-only. */
export const canEdit = (user) => isStaff(user);

const HOME = { receptionist: '/desk', shop_manager: '/shop', nutritionist: '/nutrition' };

/** /admin, /coach, /desk, /shop, /nutrition or /dashboard — or the forced password change first. */
export function homeFor(user) {
  if (user?.must_change_password) return '/dashboard/change-password';
  if (isStaff(user)) return '/admin';
  if (isCoach(user)) return '/coach';
  if (HOME[user?.role]) return HOME[user.role];
  return '/dashboard';
}

/** The sign-in page that suits the account. */
export function loginFor(user) {
  if (isStaff(user)) return '/admin/login';
  if (isCoach(user)) return '/coach/login';
  if (HOME[user?.role]) return '/staff/login';
  return '/login';
}
