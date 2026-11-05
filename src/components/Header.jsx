import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../services/notificationsService';
import { dashboardService } from '../services/dashboardService';
import { membersService } from '../services/membersService';
import { tl, locale } from '../i18n';
import LangToggle from '../i18n/LangToggle';
import { MenuButton } from '../layouts/MobileNav';

const POLL_MS = 10_000;   // new notifications show within seconds; changes made here show at once
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://smart-gym-three.vercel.app';

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  return new Date(iso).toLocaleDateString(locale);
}
/* ============================================================
   HOOK: Click outside to close
   ============================================================ */
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

/* ============================================================
   HEADER COMPONENT
   ============================================================ */
export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState(null); // 'notifications' | 'profile' | 'quick'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [occupancy, setOccupancy] = useState(null);
  const [tier, setTier] = useState('');
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const quickRef = useRef(null);

  const displayName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Member';
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const avatar = user?.avatar_url || user?.avatar || null;

  // Notifications + live occupancy: every 10 s, when the tab comes back, and at once when
  // notifications are read or deleted anywhere (notifications page, another tab).
  const loadLive = useCallback(async () => {
    const [list, count, occ] = await Promise.allSettled([
      notificationsService.list(),
      notificationsService.unreadCount(),
      dashboardService.occupancy(),
    ]);
    if (list.status === 'fulfilled') setNotifications((Array.isArray(list.value) ? list.value : []).slice(0, 6));
    if (count.status === 'fulfilled') setUnreadCount(count.value?.unread_count ?? 0);
    if (occ.status === 'fulfilled') setOccupancy(occ.value);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await loadLive(); })();
    const id = setInterval(() => document.visibilityState === 'visible' && loadLive(), POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, loadLive);
    window.addEventListener('focus', loadLive);
    membersService.myMembership()
      .then((m) => { if (alive) setTier(m?.plan?.display_name || ''); })
      .catch(() => {});
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(NOTIFICATIONS_CHANGED, loadLive);
      window.removeEventListener('focus', loadLive);
    };
  }, [loadLive]);
  // Close dropdowns on outside click
  useClickOutside(notificationsRef, () =>
    openDropdown === 'notifications' && setOpenDropdown(null)
  );
  useClickOutside(profileRef, () =>
    openDropdown === 'profile' && setOpenDropdown(null)
  );
  useClickOutside(quickRef, () =>
    openDropdown === 'quick' && setOpenDropdown(null)
  );

  // Escape key closes all dropdowns
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* keep as is */ }
  };

  const openNotification = async (n) => {
    setOpenDropdown(null);
    if (!n.is_read) {
      try {
        await notificationsService.markRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    navigate(n.action_path || '/dashboard/notifications');
  };

  const go = (path) => { navigate(path); setOpenDropdown(null); };

  // Clears the tokens server- and client-side before leaving.
  const handleLogout = async () => {
    setOpenDropdown(null);
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 sm:h-20 bg-surface-container-lowest/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="h-16 sm:h-20 w-full px-3 sm:px-space-xl flex items-center justify-between gap-2">
        {/* ============ LEFT: Live Occupancy ============ */}
        <div className="flex items-center gap-2 sm:gap-space-lg min-w-0">
          <MenuButton />
          <div className="flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-container min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container" />
            </span>
            <span className="hidden sm:inline font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              {tl("Gym now:")}
            </span>
            <span className="font-title-md text-title-md text-on-surface">
              {occupancy ? (occupancy.capacity ? `${occupancy.percent}%` : occupancy.current) : '—'}
            </span>
            {occupancy && (
              <span className="hidden md:inline font-label-md text-label-md text-primary">
                ({occupancy.label}{occupancy.capacity ? '' : tl(" · checked in")})
              </span>
            )}
          </div>
          <div className="hidden xl:flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md uppercase">
            <span className="material-symbols-outlined text-[16px] text-primary">
              schedule
            </span>
            <span>{tl("Busiest:")}{' '}{occupancy?.peak_window || tl("not enough data yet")}</span>
          </div>
        </div>

        {/* ============ RIGHT: Actions & Profile ============ */}
        <div className="flex items-center gap-2 sm:gap-space-md shrink-0">
          <LangToggle />
          {/* --- Notifications --- */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => toggleDropdown('notifications')}
              aria-label={tl("Notifications")}
              className={`relative w-9 h-9 rounded bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors ${
                openDropdown === 'notifications' ? 'bg-surface-container-high' : ''
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(229,25,55,0.6)]">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {openDropdown === 'notifications' && (
                <DropdownPanel
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="sm:w-96"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-space-md py-space-sm border-b border-surface-container-high">
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface uppercase tracking-wider">
                        {tl("Notifications")}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-label-md text-label-md font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="font-label-md text-label-md text-primary uppercase tracking-wider hover:underline"
                        type="button"
                      >
                        {tl("Mark all read")}
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
                          notifications_off
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                          {tl("No notifications")}
                        </span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => openNotification(n)}
                          className={`w-full text-left flex items-start gap-space-sm px-space-md py-space-sm hover:bg-surface-container-high transition-colors border-b border-surface-container-high/50 last:border-b-0 ${
                            !n.is_read ? 'bg-primary-container/5' : ''
                          }`}
                          type="button"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              !n.is_read
                                ? 'bg-primary-container/20 text-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {n.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-title-md text-title-md truncate ${
                                  !n.is_read ? 'text-on-surface' : 'text-on-surface-variant'
                                }`}
                              >
                                {n.title}
                              </span>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary-container shrink-0" />
                              )}
                            </div>
                            <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                            <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase mt-1 inline-block">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-space-xs border-t border-surface-container-high">
                    <Link
                      to="/dashboard/notifications"
                      onClick={() => setOpenDropdown(null)}
                      className="w-full block text-center py-space-xs rounded font-label-md text-label-md text-primary uppercase tracking-wider hover:bg-surface-container-high transition-colors"
                    >
                      {tl("View All Notifications")}
                    </Link>
                  </div>
                </DropdownPanel>
              )}
            </AnimatePresence>
          </div>

          {/* --- Quick Actions --- */}
          <div className="relative" ref={quickRef}>
            <button
              onClick={() => toggleDropdown('quick')}
              aria-label={tl("Quick actions")}
              className={`w-9 h-9 rounded bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors ${
                openDropdown === 'quick' ? 'bg-surface-container-high' : ''
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                tune
              </span>
            </button>

            <AnimatePresence>
              {openDropdown === 'quick' && (
                <DropdownPanel
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="sm:w-64"
                >
                  <div className="px-space-md py-space-xs border-b border-surface-container-high">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      {tl("Quick Actions")}
                    </span>
                  </div>

                  <div className="p-space-xs">
                    <QuickAction icon="qr_code_scanner" label={tl("Scan Machine QR")} onClick={() => go('/dashboard/machine-guide?scan=1')} />
                    <QuickAction icon="badge" label={tl("Show My Pass")} onClick={() => go('/dashboard/profile#pass')} />
                    <QuickAction icon="play_circle" label={tl("Course Player")} onClick={() => go('/dashboard/player')} />
                    <QuickAction icon="restaurant" label={tl("Log Meal")} onClick={() => go('/dashboard/nutritionists')} />
                    <QuickAction icon="shopping_bag" label={tl("Open Shop")} onClick={() => go('/dashboard/shop')} />
                    <QuickAction icon="account_balance_wallet" label={tl("Top Up Credit")} onClick={() => go('/dashboard/payments')} />
                  </div>
                </DropdownPanel>
              )}
            </AnimatePresence>
          </div>

          {/* --- Profile --- */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => toggleDropdown('profile')}
              className={`flex items-center gap-space-sm pl-space-xs pr-space-sm py-1 rounded hover:bg-surface-container-high transition-colors ${
                openDropdown === 'profile' ? 'bg-surface-container-high' : ''
              }`}
              type="button"
            >
              <div className="hidden md:flex flex-col text-right max-w-[10rem]">
                <span className="font-title-md text-title-md text-on-surface leading-snug truncate">
                  {displayName}
                </span>
                <span className="font-label-md text-label-md text-primary uppercase tracking-wider font-bold">
                  {tier || tl("Member")}
                </span>
              </div>
              <Avatar src={avatar} initials={initials} size="w-8 h-8" />
            </button>

            <AnimatePresence>
              {openDropdown === 'profile' && (
                <DropdownPanel
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="sm:w-72"
                >
                  {/* Profile header */}
                  <div className="px-space-md py-space-md border-b border-surface-container-high">
                    <div className="flex items-center gap-space-sm">
                      <Avatar src={avatar} initials={initials} size="w-12 h-12" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-md text-title-md text-on-surface truncate">
                          {displayName}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface-variant truncate">
                          {user?.email}
                        </span>
                        {tier && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded bg-primary-container/20 text-primary font-label-md text-label-md uppercase tracking-wider font-bold w-fit">
                            {tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="p-space-xs">
                    <DropdownLink icon="person" label={tl("My Profile")} onClick={() => go('/dashboard/profile')} />
                    <DropdownLink icon="badge" label={tl("Digital Pass")} onClick={() => go('/dashboard/profile#pass')} />
                    <DropdownLink icon="lock_reset" label={tl("Change Password")} onClick={() => go('/dashboard/change-password')} />
                    <DropdownLink icon="credit_card" label={tl("Membership & Payments")} onClick={() => go('/dashboard/payments')} />
                    <DropdownLink icon="event_available" label={tl("Attendance History")} onClick={() => go('/dashboard/attendance')} />
                    <DropdownLink icon="notifications" label={tl("Notifications")} onClick={() => go('/dashboard/notifications')} />
                  </div>

                  <div className="p-space-xs border-t border-surface-container-high">
                    <DropdownLink icon="help" label={tl("Help & Support")} onClick={() => { setOpenDropdown(null); window.open(`${PUBLIC_SITE}/contact`, '_blank', 'noopener'); }} />
                  </div>

                  {/* Logout */}
                  <div className="p-space-xs border-t border-surface-container-high">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded hover:bg-error/10 text-error transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        logout
                      </span>
                      <span className="font-title-md text-title-md uppercase tracking-wider">
                        {tl("Sign Out")}
                      </span>
                    </button>
                  </div>
                </DropdownPanel>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */
function DropdownPanel({ children, className = '', ...motionProps }) {
  return (
    <motion.div
      {...motionProps}
      className={`fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 sm:max-w-[calc(100vw-1.5rem)] bg-surface-container-low rounded-xl shadow-2xl border border-surface-container-high overflow-hidden z-50 origin-top-right ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Avatar({ src, initials, size }) {
  return src ? (
    <img alt="" className={`${size} rounded-full object-cover ring-2 ring-primary-container/30`} src={src} />
  ) : (
    <span className={`${size} rounded-full bg-primary-container/20 text-primary ring-2 ring-primary-container/30 flex items-center justify-center font-bold text-[12px]`}>
      {initials}
    </span>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded hover:bg-surface-container-high transition-colors text-left group"
      type="button"
    >
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">
        {icon}
      </span>
      <span className="font-title-md text-title-md text-on-surface">
        {label}
      </span>
    </button>
  );
}

function DropdownLink({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded hover:bg-surface-container-high transition-colors text-left group"
      type="button"
    >
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">
        {icon}
      </span>
      <span className="font-title-md text-title-md text-on-surface">
        {label}
      </span>
    </button>
  );
}