// src/pages/admin/AdminNotifications.jsx
// Every notification sent to this admin (new registrations, payments to review, refunds at the desk,
// course reviews, cancelled sessions…) — the same list as the header bell, with read / unread and links.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../../services/notificationsService';
import { useApi } from '../../hooks/useApi';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn } from '../../components/site/siteStyles';
import { locale, tl } from '../../i18n';

const FILTERS = [['all', tl('All')], ['unread', tl('Unread')]];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const { data, loading, refetch } = useApi(
    () => notificationsService.list(filter === 'unread' ? { unread: 'true' } : {}), [filter],
    { poll: 10_000, refreshOn: [NOTIFICATIONS_CHANGED] });
  const list = Array.isArray(data) ? data : data?.results || [];
  const changed = () => refetch();     // the service tells the header bell too
  const open = async (n) => {
    if (!n.is_read) { try { await notificationsService.markRead(n.id); changed(); } catch { /* ignore */ } }
    if (n.action_path?.startsWith('/admin')) navigate(n.action_path);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <PageHeader title={tl('Notifications')}
        subtitle={tl('New registrations, payments to check, refunds, reviews and cancellations — everything the gym needs to know.')}>
        <button type="button" className={btn.ghost} disabled={!list.some((n) => !n.is_read)}
          onClick={async () => { await notificationsService.markAllRead(); changed(); }}>{tl('Mark all read')}</button>
      </PageHeader>

      <div className="flex gap-2 mb-4" role="tablist">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${filter === id
              ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && !data ? <Empty>{tl('Loading…')}</Empty> : list.length === 0 ? (
        <Empty>{filter === 'unread' ? tl('No unread notifications.') : tl('Nothing yet.')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)}
                className={`w-full text-left bg-[#0e0e0f] border rounded-lg p-4 flex gap-3 hover:border-primary-container/60 ${
                  n.is_read ? 'border-[#1a1a1e] opacity-70' : 'border-primary-container/40'}`}>
                <span className="material-symbols-outlined text-primary shrink-0" aria-hidden="true">{n.icon || 'notifications'}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[14px] text-on-surface ${n.is_read ? '' : 'font-bold'}`}>{n.title}</span>
                  <span className="block text-[13px] text-on-surface-variant break-words">{n.message}</span>
                  <span className="block text-[11px] text-on-surface-variant/70 mt-1">{new Date(n.created_at).toLocaleString(locale)}</span>
                </span>
                {n.action_label && n.action_path?.startsWith('/admin') && (
                  <span className="hidden sm:block text-primary text-[12px] font-bold self-center whitespace-nowrap">{tl(n.action_label)} →</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
