// src/pages/admin/SiteInbox.jsx
// Messages sent through the public website's contact form.
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { siteContentService as api } from '../../services/siteContentService';
import { errorMessage } from '../../utils/apiError';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { matches } from '../../hooks/useListState';
import { tl, locale } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { canEdit } from '../../utils/roleHome';

const FILTERS = [
  { id: '', label: tl("All"), icon: 'inbox', empty: tl("No messages yet. They appear here when someone uses the contact form.") },
  { id: 'new', label: tl("New"), icon: 'mark_email_unread', empty: tl("You're all caught up — no new messages.") },
  { id: 'read', label: tl("Read"), icon: 'drafts', empty: tl("No read messages.") },
  { id: 'archived', label: tl("Archived"), icon: 'archive', empty: tl("Nothing archived.") },
];

/** Today → time only; this year → day and month; older → full date. */
function when(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(locale, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'short' } : { dateStyle: 'medium' });
}

export default function SiteInbox() {
  const edit = canEdit(useAuth().user);   // the front desk reads and marks messages; only admins delete
  const [status, setStatus] = useState('');   // "All" first
  const [q, setQ] = useState('');
  const [data, setData] = useState({ counts: {}, results: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  const quiet = useRef(false);                 // background refresh: no loading state, no error toast
  useAutoRefresh(() => { quiet.current = true; load(); }, 15_000);
  useEffect(() => {
    let alive = true;
    const background = quiet.current;
    quiet.current = false;
    (async () => {
      if (!background) setLoading(true);
      try {
        const res = await api.messages(status ? { status } : {});
        if (alive) setData(res);
      } catch (err) { if (!background) toast.error(errorMessage(err)); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [status, version]);

  const setMsgStatus = async (msg, next) => {
    try {
      await api.updateMessage(msg.id, { status: next });
      toast.success(next === 'archived' ? 'Archived' : next === 'read' ? 'Marked as read' : 'Marked as new');
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  // Mark as read in place (no reload), so the message stays open in the "New" tab.
  const openMsg = async (msg) => {
    setOpen(open === msg.id ? null : msg.id);
    if (msg.status !== 'new') return;
    try {
      await api.updateMessage(msg.id, { status: 'read' });
      setData((d) => ({
        counts: { ...d.counts, new: Math.max(0, (d.counts.new || 0) - 1), read: (d.counts.read || 0) + 1 },
        results: d.results.map((m) => (m.id === msg.id ? { ...m, status: 'read' } : m)),
      }));
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const remove = async (msg) => {
    if (!window.confirm(tl("Delete the message from {0} permanently?", { 0: msg.name }))) return;
    try { await api.deleteMessage(msg.id); toast.success(tl("Deleted")); load(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const current = FILTERS.find((f) => f.id === status) || FILTERS[0];

  return (
    <div className="p-8 bg-background min-h-screen">
      <PageHeader title={tl("Website Inbox")} subtitle={tl("Messages from the public website's contact form. Opening a message marks it as read.")} />

      <input className={`${inputCls} mb-3 md:w-80`} value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={tl('Search name, email, topic or message…')} aria-label={tl('Search messages')} />
      <div className="flex gap-1 mb-5 flex-wrap w-fit p-1 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e]" role="tablist">
        {FILTERS.map((f) => {
          const n = f.id ? data.counts[f.id] || 0 : total;
          return (
            <button
              key={f.label}
              type="button"
              role="tab"
              aria-selected={status === f.id}
              onClick={() => { setStatus(f.id); setOpen(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-bold ${
                status === f.id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
              {f.label}
              <span className={`px-1.5 rounded-full text-[10px] ${status === f.id ? 'bg-black/20' : 'bg-[#1a1a1e]'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {loading ? <Empty>{tl("Loading…")}</Empty> : !data.results.length ? (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg py-14 flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30">{current.icon}</span>
          <p className="text-[13px] text-on-surface-variant max-w-sm">{current.empty}</p>
        </div>
      ) : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg divide-y divide-[#1a1a1e] overflow-hidden">
          {data.results.filter((m) => matches(m, q, ['name', 'email', 'phone', 'topic', 'subtopic', 'message'])).map((m) => (
            <div key={m.id} className={open === m.id ? 'bg-[#131316]' : ''}>
              <button type="button" onClick={() => openMsg(m)} className="w-full text-start px-4 py-3 flex items-center gap-3 hover:bg-[#131316] transition-colors" aria-expanded={open === m.id}>
                <span className={`relative w-9 h-9 rounded-full grid place-items-center shrink-0 text-[13px] font-bold ${m.status === 'new' ? 'bg-primary-container text-on-primary-container' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
                  {(m.name || '?').trim().charAt(0).toUpperCase()}
                  {m.status === 'new' && <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0e0e0f]" aria-label={tl("New")} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-[13px] truncate ${m.status === 'new' ? 'text-on-surface font-bold' : 'text-on-surface'}`}>{m.name}</span>
                    <span className="text-[12px] text-on-surface-variant truncate hidden md:inline">{m.email}</span>
                  </span>
                  <span className="block text-[12px] text-on-surface-variant truncate" dir="auto">{m.message}</span>
                </span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-[#1a1a1e] text-[11px] text-on-surface-variant shrink-0 max-w-[200px] truncate">{[m.topic, m.subtopic].filter(Boolean).join(' / ') || tl("General")}</span>
                <span className="text-[11px] text-on-surface-variant shrink-0 tabular-nums w-16 text-end" title={new Date(m.created_at).toLocaleString(locale)}>{when(m.created_at)}</span>
              </button>
              {open === m.id && (
                <div className="px-4 pb-4 md:ps-16 flex flex-col gap-3">
                  <p className="text-[14px] text-on-surface whitespace-pre-wrap leading-relaxed rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] p-3" dir="auto">{m.message}</p>
                  <div className="text-[12px] text-on-surface-variant flex gap-4 flex-wrap">
                    <span>{tl("Email:")}{' '}<a className="text-primary hover:underline" href={`mailto:${m.email}`}>{m.email}</a></span>
                    {m.phone && <span>{tl("Phone:")}{' '}<a className="text-primary hover:underline" href={`tel:${m.phone}`}>{m.phone}</a></span>}
                    {m.lang && <span>{tl("Site language:")}{' '}{m.lang.toUpperCase()}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a className={`${btn.primary} inline-flex items-center gap-1`} href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Smart Gym')}`}>
                      <span className="material-symbols-outlined text-[15px]">reply</span>{tl("Reply by email")}
                    </a>
                    {m.status !== 'new' && <button type="button" className={btn.ghost} onClick={() => setMsgStatus(m, 'new')}>{tl("Mark as new")}</button>}
                    {m.status !== 'archived' && <button type="button" className={btn.ghost} onClick={() => setMsgStatus(m, 'archived')}>{tl("Archive")}</button>}
                    {edit && <button type="button" className="inline-flex items-center gap-1 px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10" onClick={() => remove(m)}>
                      <span className="material-symbols-outlined text-[15px]">delete</span>{tl("Delete")}
                    </button>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
