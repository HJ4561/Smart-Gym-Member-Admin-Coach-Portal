// src/pages/team/TeamPages.jsx — pages every team portal (front desk, shop, nutrition) shares.
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../../services/notificationsService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn } from '../../components/site/siteStyles';
import SecuritySettings from '../../components/SecuritySettings';
import { useAuth } from '../../context/AuthContext';
import { tl, locale } from '../../i18n';
import { card, Page, Section, Skeleton } from '../coach/ui';

/** Notifications; a click opens the page it's about when that page is in this portal. */
export function TeamNotifications({ base }) {
  const navigate = useNavigate();
  const { reloadUnread } = useOutletContext() || {};
  const { data, loading, refetch } = useApi(() => notificationsService.list(), [],
    { poll: 15_000, refreshOn: [NOTIFICATIONS_CHANGED] });
  const list = Array.isArray(data) ? data : [];
  const changed = () => { refetch(); reloadUnread?.(); };
  const open = async (n) => {
    if (!n.is_read) { try { await notificationsService.markRead(n.id); changed(); } catch { /* ignore */ } }
    if (n.action_path?.startsWith(base)) navigate(n.action_path);
  };
  return (
    <Page>
      <PageHeader title={tl('Notifications')} subtitle={tl('Approvals of your work and anything the gym needs you to see.')}>
        <button type="button" className={btn.ghost} disabled={!list.some((n) => !n.is_read)}
          onClick={async () => { await notificationsService.markAllRead(); changed(); }}>{tl('Mark all read')}</button>
      </PageHeader>
      {loading && !data ? <Skeleton /> : list.length === 0 ? <Empty>{tl('Nothing yet.')}</Empty> : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)}
                className={`${card} w-full text-left p-4 flex gap-3 ${n.is_read ? 'opacity-70' : 'border-primary-container/40'}`}>
                <span className="material-symbols-outlined text-primary" aria-hidden="true">{n.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[14px] ${n.is_read ? 'text-on-surface' : 'text-on-surface font-bold'}`}>{n.title}</span>
                  <span className="block text-[13px] text-on-surface-variant break-words">{n.message}</span>
                  <span className="block text-[11px] text-on-surface-variant/70 mt-1">{new Date(n.created_at).toLocaleString(locale)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/** Who you are and how you sign in (2-step verification). Name and role are set by an admin. */
export function TeamAccount() {
  const { user } = useAuth();
  return (
    <Page>
      <PageHeader title={tl('Profile & security')} subtitle={tl('Your name and role are set by an admin. Ask them to change anything here.')} />
      <Section title={tl('You')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
          <div><div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{tl('Name')}</div><div className="text-on-surface font-bold">{user?.full_name || '—'}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{tl('Email')}</div><div className="text-on-surface break-all">{user?.email}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{tl('Role')}</div><div className="text-on-surface">{tl(user?.role || '')}</div></div>
        </div>
      </Section>
      <SecuritySettings />
    </Page>
  );
}
