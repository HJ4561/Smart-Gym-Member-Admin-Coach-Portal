// src/components/admin/AdminHeader.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { dashboardService } from '../../services/dashboardService';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../../services/notificationsService';
import { tl } from '../../i18n';
import LangToggle from '../../i18n/LangToggle';
import { MenuButton } from '../../layouts/MobileNav';

const POLL_MS = 10_000;   // new notifications show within seconds; changes made here show at once
const SEARCH_GROUPS = [
  ['members', tl('Members'), 'person'],
  ['registrations', tl('Registrations'), 'how_to_reg'],
  ['orders', tl('Shop orders'), 'shopping_bag'],
  ['machines', tl('Machines'), 'precision_manufacturing'],
];

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export default function AdminHeader() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(null); // 'alerts' | 'profile' | 'search'
  const [alerts, setAlerts] = useState({ total: 0, items: [] });
  const [news, setNews] = useState([]);        // unread notifications (course purchases, reviews to do…)
  const [occ, setOcc] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const alertsRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInput = useRef(null);

  const close = useCallback(() => setOpen(null), []);
  useClickOutside(alertsRef, () => open === 'alerts' && close());
  useClickOutside(profileRef, () => open === 'profile' && close());
  useClickOutside(searchRef, () => open === 'search' && close());

  // Alerts + live load, refreshed every minute.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [a, o, n] = await Promise.allSettled([
        api.get('/admin/alerts/'),
        dashboardService.occupancy(),
        notificationsService.list({ unread: 'true' }),
      ]);
      if (!alive) return;
      if (a.status === 'fulfilled') setAlerts(a.value.data);
      if (o.status === 'fulfilled') setOcc(o.value);
      if (n.status === 'fulfilled') setNews(Array.isArray(n.value) ? n.value.slice(0, 10) : []);
    };
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    window.addEventListener('focus', load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
      window.removeEventListener('focus', load);
    };
  }, []);

  // Ctrl/⌘+K focuses search, Esc closes everything.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return undefined;
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/search/', { params: { q: term } });
        if (alive) {
          setResults(data);
          setOpen('search');
        }
      } catch {
        if (alive) setResults(null);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [q]);

  const go = (path) => {
    close();
    setQ('');
    setResults(null);
    navigate(path);
  };

  const openNews = async (n) => {
    setNews((list) => list.filter((x) => x.id !== n.id));
    try { await notificationsService.markRead(n.id); } catch { /* ignore */ }
    if (n.action_path?.startsWith('/admin')) go(n.action_path);
  };
  const clearNews = async () => {
    setNews([]);
    try { await notificationsService.markAllRead(); } catch { /* ignore */ }
  };
  const bellCount = alerts.total + news.length;

  const handleLogout = async () => {
    close();
    try {
      await logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  const name =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    'Admin';
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = user?.role === 'manager' ? tl('Manager') : tl('Administrator');
  const anyResults = results && SEARCH_GROUPS.some(([k]) => results[k]?.length);

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-[#08080a]/95 backdrop-blur-xl z-40 border-b border-[#1a1a1e]">
      <div className="h-16 w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        <MenuButton />

        {/* Live load */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] shrink-0"
          aria-live="polite"
          aria-label={
            occ
              ? tl('Gym now: {0} of {1} capacity ({2}%)', {
                  0: occ.current,
                  1: occ.capacity ?? '—',
                  2: occ.percent ?? 0,
                })
              : tl('Gym load loading')
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${occ ? 'bg-emerald-400 animate-pulse' : 'bg-[#2a2a2e]'}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">
            {tl('Gym now')}
          </span>
          <span className="text-[12px] text-on-surface font-bold tabular-nums">
            {occ
              ? occ.capacity
                ? `${occ.current}/${occ.capacity} · ${occ.percent}%`
                : tl('{0} in', { 0: occ.current })
              : '—'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] w-80 focus-within:border-primary-container">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                ref={searchInput}
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (e.target.value.trim().length < 2) setResults(null);
                }}
                onFocus={() => results && setOpen('search')}
                placeholder={tl('Search members, Iqama, orders, machines…')}
                aria-label={tl('Search')}
                className="bg-transparent text-on-surface text-[13px] flex-1 outline-none placeholder:text-on-surface-variant/50"
              />
              <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-[#1a1a1e] text-on-surface-variant text-[10px] font-mono">
                {tl('Ctrl K')}
              </kbd>
            </div>
            <AnimatePresence>
              {open === 'search' && results && (
                <Panel
                  className="w-96 left-0 right-auto"
                  label={tl('Search results')}
                  reduce={reduce}
                >
                  {!anyResults ? (
                    <p className="px-4 py-6 text-center text-[12px] text-on-surface-variant">
                      {tl('No matches for “{0}”.', { 0: q.trim() })}
                    </p>
                  ) : (
                    SEARCH_GROUPS.filter(([k]) => results[k]?.length).map(([k, label, icon]) => (
                      <div key={k} className="py-1 border-b border-[#1a1a1e] last:border-0">
                        <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                          {label}
                        </div>
                        {results[k].map((r) => (
                          <button
                            key={`${k}-${r.id}`}
                            type="button"
                            onClick={() => go(r.path)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#1a1a1e] text-left"
                          >
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
                              {icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] text-on-surface truncate">{r.title}</span>
                              <span className="block text-[11px] text-on-surface-variant truncate">
                                {r.subtitle}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </Panel>
              )}
            </AnimatePresence>
          </div>

          <LangToggle />

          {/* Alerts */}
          <div className="relative" ref={alertsRef}>
            <button
              type="button"
              onClick={() => setOpen(open === 'alerts' ? null : 'alerts')}
              aria-label={tl('Alerts ({0})', { 0: bellCount })}
              aria-expanded={open === 'alerts'}
              aria-haspopup="dialog"
              className="relative w-9 h-9 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] flex items-center justify-center hover:bg-[#1a1a1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">
                notifications
              </span>
              {bellCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {bellCount > 99 ? '99+' : bellCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {open === 'alerts' && (
                <Panel className="w-96" label={tl('Needs attention')} reduce={reduce}>
                  {news.length > 0 && (
                    <div className="border-b border-[#1a1a1e]">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span className="text-[13px] text-on-surface font-bold uppercase tracking-wider">{tl('New')}</span>
                        <button type="button" onClick={clearNews} className="text-[11px] text-primary font-bold hover:underline">{tl('Mark all read')}</button>
                      </div>
                      {news.map((n) => (
                        <button key={n.id} type="button" onClick={() => openNews(n)}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-[#1a1a1e] text-left">
                          <span className="material-symbols-outlined text-[18px] text-primary mt-0.5" aria-hidden="true">{n.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] text-on-surface font-bold truncate">{n.title}</span>
                            <span className="block text-[12px] text-on-surface-variant line-clamp-2">{n.message}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 border-b border-[#1a1a1e] text-[13px] text-on-surface font-bold uppercase tracking-wider">
                    {tl('Needs attention')}
                  </div>
                  {!alerts.items.length ? (
                    <p className="px-4 py-8 text-center text-[12px] text-on-surface-variant" role="status">
                      {tl('All caught up — nothing waiting.')}
                    </p>
                  ) : (
                    alerts.items.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => go(a.path)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1e] text-left border-b border-[#1a1a1e]/50 last:border-0"
                      >
                        <span
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            a.priority === 'high'
                              ? 'bg-primary-container/20 text-primary'
                              : 'bg-[#1a1a1e] text-on-surface-variant'
                          }`}
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[13px] text-on-surface font-bold truncate">
                              {a.title}
                            </span>
                            <span className="text-[11px] text-primary font-bold tabular-nums shrink-0">
                              {a.count}
                            </span>
                          </span>
                          <span className="block text-[12px] text-on-surface-variant">
                            {a.message}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </Panel>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-8 bg-[#1a1a1e]" aria-hidden="true" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setOpen(open === 'profile' ? null : 'profile')}
              aria-label={tl('Account menu')}
              aria-expanded={open === 'profile'}
              aria-haspopup="dialog"
              className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-lg hover:bg-[#0e0e0f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[13px]">
                {initials}
              </span>
              <span className="hidden md:flex flex-col text-left">
                <span className="text-[13px] text-on-surface leading-tight">{name}</span>
                <span className="text-[10px] text-primary uppercase tracking-widest font-bold">
                  {role}
                </span>
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">
                expand_more
              </span>
            </button>
            <AnimatePresence>
              {open === 'profile' && (
                <Panel className="w-64" label={tl('Account menu')} reduce={reduce}>
                  <div className="px-4 py-3 border-b border-[#1a1a1e]">
                    <div className="text-[13px] text-on-surface font-bold">{name}</div>
                    <div className="text-[12px] text-on-surface-variant truncate">{user?.email}</div>
                  </div>
                  <div className="p-2">
                    <MenuItem icon="settings" label={tl('System settings')} onClick={() => go('/admin/settings')} />
                    <MenuItem icon="lock_reset" label={tl('Change password')} onClick={() => go('/admin/change-password')} />
                    <MenuItem icon="shield_lock" label={tl('2-step verification')} onClick={() => go('/admin/security')} />
                    <MenuItem
                      icon="public"
                      label={tl('Open public website')}
                      onClick={() => {
                        close();
                        window.open(
                          import.meta.env.VITE_PUBLIC_SITE_URL || 'https://smart-gym-three.vercel.app',
                          '_blank',
                          'noopener'
                        );
                      }}
                    />
                  </div>
                  <div className="p-2 border-t border-[#1a1a1e]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error/10 text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        logout
                      </span>
                      <span className="text-[12px] uppercase tracking-wider font-bold">
                        {tl('Sign out')}
                      </span>
                    </button>
                  </div>
                </Panel>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function Panel({ children, className = '', label, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
      animate={reduce ? false : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className={`absolute right-0 top-full mt-2 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl shadow-2xl z-50 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1e] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
    >
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[13px] text-on-surface">{label}</span>
    </button>
  );
}