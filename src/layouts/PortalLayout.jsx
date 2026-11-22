// src/layouts/PortalLayout.jsx
// The shell shared by the team portals (front desk, shop, nutrition): sidebar (drawer on phones) +
// header with notifications and the account menu. Each portal passes its own menu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../services/notificationsService';
import { DrawerBackdrop, MenuButton, MobileNavProvider } from './MobileNav';
import { drawerClasses, useMobileNav } from './mobileNavContext';
import LangToggle from '../i18n/LangToggle';
import { tl, locale } from '../i18n';

const POLL_MS = 15_000;

/** Unread notifications, refreshed on a timer and when the tab comes back into view. */
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

function Sidebar({ nav, title, icon, base, unread }) {
  const { open, setOpen } = useMobileNav();
  return (
    <>
      <DrawerBackdrop />
      <aside className={`fixed left-0 top-0 h-screen w-64 max-w-[85vw] bg-[#08080a] z-50 flex flex-col border-r border-[#1a1a1e] ${drawerClasses(open)}`}
        aria-label={title}>
        <div className="flex-shrink-0 px-5 h-20 flex items-center gap-3 border-b border-[#1a1a1e]">
          <div className="w-10 h-10 rounded-lg bg-primary-container grid place-items-center shadow-[0_0_20px_rgba(229,25,55,0.55)]">
            <span className="material-symbols-outlined text-on-primary-container text-[22px]" aria-hidden="true">{icon}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-[18px] tracking-wider text-on-surface uppercase leading-none">{tl('Smart Gym')}</span>
            <span className="font-label-md text-[10px] text-primary tracking-widest uppercase font-bold">{title}</span>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wider text-[12px] font-bold transition-colors ${
                isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-[#1a1a1e] hover:text-on-surface'}`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.path === `${base}/notifications` && unread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-container text-on-primary-container text-[10px] grid place-items-center ring-2 ring-[#08080a]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
              {item.badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] grid place-items-center">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

function Header({ base, unread, onRead }) {
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
    navigate(n.action_path?.startsWith(base) ? n.action_path : `${base}/notifications`);
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
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 sm:w-80 sm:max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl shadow-2xl"
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
                  <button type="button" onClick={() => { setOpen(null); navigate(`${base}/notifications`); }}
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
                <button type="button" role="menuitem" onClick={() => { setOpen(null); navigate(`${base}/account`); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1e] text-[13px] text-on-surface text-left">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">manage_accounts</span>{tl('Profile & security')}
                </button>
                <button type="button" role="menuitem"
                  onClick={async () => { setOpen(null); await logout(); navigate('/staff/login', { replace: true }); }}
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

/** nav: [{path, label, icon, end?, badge?}] · base: '/desk' · title: 'Front Desk' · icon: material symbol */
export default function PortalLayout({ nav, base, title, icon }) {
  const [unread, reload] = useUnread();
  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-[#0b0b0c] text-on-surface">
        <Sidebar nav={nav} base={base} title={title} icon={icon} unread={unread} />
        <div className="lg:pl-64 min-w-0 overflow-x-hidden">
          <Header base={base} unread={unread} onRead={reload} />
          <main className="w-full min-w-0 pt-16 min-h-screen">
            <Outlet context={{ reloadUnread: reload }} />
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
