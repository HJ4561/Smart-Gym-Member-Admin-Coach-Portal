// src/layouts/CoachLayout.jsx
// The coach portal shell: sidebar (drawer on phones) + header with notifications and account menu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../services/notificationsService';
import { DrawerBackdrop, MenuButton, MobileNavProvider } from './MobileNav';
import { drawerClasses, useMobileNav } from './mobileNavContext';
import LangToggle from '../i18n/LangToggle';
import { tl, locale } from '../i18n';

const POLL_MS = 10_000;

const COACH_NAV = [
  { path: '/coach', label: tl('Dashboard'), icon: 'dashboard', end: true },
  { path: '/coach/notifications', label: tl('Notifications'), icon: 'notifications' },
  { path: '/coach/sessions', label: tl('1-on-1 sessions'), icon: 'event_available' },
  { path: '/coach/hours', label: tl('My hours'), icon: 'schedule' },
  { path: '/coach/courses', label: tl('My courses'), icon: 'school' },
  { path: '/coach/students', label: tl('Students'), icon: 'groups' },
  { path: '/coach/classes', label: tl('My classes'), icon: 'event' },
  { path: '/coach/videos', label: tl('Machine videos'), icon: 'smart_display' },
  { path: '/coach/reviews', label: tl('Reviews'), icon: 'reviews' },
  { path: '/coach/earnings', label: tl('Earnings'), icon: 'payments' },
  { path: '/coach/profile', label: tl('Profile & security'), icon: 'manage_accounts' },
];

/** Unread notifications, refreshed every 30 s and when the tab comes back into view. */
function useUnread() {
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => {
    notificationsService.unreadCount().then((d) => setUnread(d.unread_count || 0)).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);
  return [unread, load];
}

function CoachSidebar({ unread }) {
  const { open, setOpen } = useMobileNav();
  return (
    <>
      <DrawerBackdrop />
      <aside className={`fixed left-0 top-0 h-screen w-64 max-w-[85vw] bg-[#08080a] z-50 flex flex-col border-r border-[#1a1a1e] ${drawerClasses(open)}`}
        aria-label={tl('Coach navigation')}>
        <div className="flex-shrink-0 px-5 h-20 flex items-center gap-3 border-b border-[#1a1a1e]">
          <div className="w-10 h-10 rounded-lg bg-primary-container grid place-items-center shadow-[0_0_20px_rgba(229,25,55,0.55)]">
            <span className="material-symbols-outlined text-on-primary-container text-[22px]" aria-hidden="true">sports</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-[18px] tracking-wider text-on-surface uppercase leading-none">{tl('Smart Gym')}</span>
            <span className="font-label-md text-[10px] text-primary tracking-widest uppercase font-bold">{tl('Coach Portal')}</span>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {COACH_NAV.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wider text-[12px] font-bold transition-colors ${
                isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-[#1a1a1e] hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.path === '/coach/notifications' && unread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-container text-on-primary-container text-[10px] grid place-items-center ring-2 ring-[#08080a]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

function CoachHeader({ unread, onRead }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);       // 'bell' | 'me'
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const openBell = async () => {
    setOpen(open === 'bell' ? null : 'bell');
    try { setItems((await notificationsService.list()).slice(0, 8)); } catch { setItems([]); }
  };
  const go = async (n) => {
    setOpen(null);
    if (!n.is_read) {
      try { await notificationsService.markRead(n.id); onRead(); } catch { /* ignore */ }
    }
    if (n.action_path?.startsWith('/coach')) navigate(n.action_path);
    else navigate('/coach/notifications');
  };
  const name = user?.full_name || user?.email || '';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#08080a]/95 backdrop-blur-xl z-40 border-b border-[#1a1a1e]">
      <div ref={ref} className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MenuButton />
          <span className="text-on-surface font-bold truncate">{tl('Hi, {0}', { 0: user?.first_name || name })}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle />
          <div className="relative">
            <button type="button" onClick={openBell} aria-label={tl('Notifications ({0} unread)', { 0: unread })} aria-expanded={open === 'bell'}
              className="relative w-9 h-9 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] grid place-items-center hover:bg-[#1a1a1e]">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">notifications</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold grid place-items-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {open === 'bell' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl shadow-2xl"
                  role="dialog" aria-label={tl('Notifications')}>
                  {items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[12px] text-on-surface-variant">{tl('Nothing new.')}</p>
                  ) : items.map((n) => (
                    <button key={n.id} type="button" onClick={() => go(n)}
                      className="w-full text-left flex gap-3 px-4 py-3 border-b border-[#1a1a1e]/60 last:border-0 hover:bg-[#1a1a1e]">
                      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5" aria-hidden="true">{n.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] ${n.is_read ? 'text-on-surface-variant' : 'text-on-surface font-bold'}`}>{n.title}</span>
                        <span className="block text-[12px] text-on-surface-variant line-clamp-2">{n.message}</span>
                        <span className="block text-[10px] text-on-surface-variant/70 mt-1">{new Date(n.created_at).toLocaleString(locale)}</span>
                      </span>
                    </button>
                  ))}
                  <button type="button" onClick={() => { setOpen(null); navigate('/coach/notifications'); }}
                    className="w-full px-4 py-2 text-[12px] font-bold text-primary hover:bg-[#1a1a1e]">{tl('See all')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setOpen(open === 'me' ? null : 'me')} aria-label={tl('Account menu')} aria-expanded={open === 'me'}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container font-bold text-[13px]">
              {initials || '?'}
            </button>
            {open === 'me' && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl shadow-2xl p-2" role="menu">
                <div className="px-3 py-2 text-[12px] text-on-surface-variant truncate border-b border-[#1a1a1e] mb-1">{user?.email}</div>
                {[['manage_accounts', tl('Profile & security'), '/coach/profile'], ['lock_reset', tl('Change password'), '/coach/change-password']].map(([icon, label, path]) => (
                  <button key={path} type="button" role="menuitem" onClick={() => { setOpen(null); navigate(path); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1e] text-[13px] text-on-surface text-left">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">{icon}</span>{label}
                  </button>
                ))}
                <button type="button" role="menuitem"
                  onClick={async () => { setOpen(null); await logout(); navigate('/coach/login', { replace: true }); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error/10 text-error text-[12px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>{tl('Sign out')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function CoachLayout() {
  const [unread, reload] = useUnread();
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-[#0b0b0c] text-on-surface">
        <CoachSidebar unread={unread} />
        <div className="lg:pl-64 min-w-0 overflow-x-hidden">
          <CoachHeader unread={unread} onRead={reload} />
          <main className="w-full min-w-0 pt-16 min-h-screen">
            <Outlet context={{ reloadUnread: reload }} />
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
