// src/pages/coach/CoachSessions.jsx — 1-on-1 sessions members booked with this coach. A scheduled session
// can be delayed, moved to another time or edited (focus, notes, length); the member is told.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useListState';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { formatGymDateTime } from '../../utils/gymTime';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import { tl } from '../../i18n';
import { card, Chip, Page, Skeleton, Tabs, LIVE_MS } from './ui';
import { SESSION_LABEL, SESSION_TONE } from './sessionStatus';
import SessionChange from '../../components/sessions/SessionChange';

export default function CoachSessions() {
  const [scope, setScope] = useState('upcoming');
  const [changing, setChanging] = useState(null);
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const search = useDebounced(q);
  const { data, loading, refetch } = useApi(() => coachService.sessions(scope, {
    q: search || undefined, status: state || undefined, from: from || undefined, to: to || undefined,
  }), [scope, search, state, from, to], { poll: LIVE_MS });
  const list = Array.isArray(data) ? data : [];
  const started = (s) => new Date(s.scheduled_at) <= new Date();

  const setStatus = async (s, status) => {
    const msg = status === 'cancelled'
      ? tl('Cancel {0}’s session? {1} goes back to their locker credit and they’re told.', { 0: s.member.name, 1: formatSAR(s.amount_charged) })
      : status === 'no_show' ? tl('Mark {0} as a no-show?', { 0: s.member.name }) : tl('Mark this session as completed?');
    if (!window.confirm(msg)) return;
    try {
      await coachService.setSessionStatus(s.id, status);
      toast.success(tl('Updated'));
      refetch();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <Page>
      <PageHeader title={tl('1-on-1 sessions')}
        subtitle={tl('Members book 60-minute slots inside your weekly hours. Mark each session after it starts.')} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={scope} onChange={setScope} options={[['upcoming', tl('Upcoming')], ['past', tl('Past')]]} />
        <div className="flex-1" />
        <select className={`${inputCls} sm:w-40`} value={state} onChange={(e) => setState(e.target.value)} aria-label={tl('Status')}>
          <option value="">{tl('Any status')}</option>
          {['scheduled', 'completed', 'no_show', 'cancelled'].map((v) => <option key={v} value={v}>{SESSION_LABEL[v]}</option>)}
        </select>
        <input className={`${inputCls} sm:w-40`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={tl('From')} />
        <input className={`${inputCls} sm:w-40`} type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={tl('To')} />
        <input className={`${inputCls} sm:w-64`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tl('Search member or focus…')} aria-label={tl('Search sessions')} />
      </div>
      {loading && !data ? <Skeleton /> : list.length === 0 ? (
        <Empty>{scope === 'upcoming' ? tl('No upcoming sessions.') : tl('No past sessions yet.')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((s) => (
            <li key={s.id} className={`${card} p-4 flex flex-col md:flex-row md:items-center gap-3`}>
              <div className="md:w-48 shrink-0">
                <div className="text-on-surface font-bold">{formatGymDateTime(s.scheduled_at)}</div>
                <div className="text-[11px] text-on-surface-variant">{tl('{0} min', { 0: s.duration_minutes })} · {formatSAR(s.amount_charged)}</div>
                {s.rescheduled_from && (
                  <div className="text-[11px] text-amber-300">{tl('Moved from {0}', { 0: formatGymDateTime(s.rescheduled_from) })}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-on-surface font-bold truncate">{s.member.name}</div>
                <div className="text-[12px] text-on-surface-variant truncate">{s.member.email}</div>
                {(s.focus_area || s.notes) && (
                  <div className="text-[12px] text-on-surface-variant mt-1 break-words">{[s.focus_area, s.notes].filter(Boolean).join(' — ')}</div>
                )}
                {s.change_note && <div className="text-[11px] text-on-surface-variant mt-1">{tl('Note to member: {0}', { 0: s.change_note })}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Chip tone={SESSION_TONE[s.status]}>{SESSION_LABEL[s.status]}</Chip>
                {s.status === 'scheduled' && (
                  <>
                    <button type="button" className={btn.primary} disabled={!started(s)} onClick={() => setStatus(s, 'completed')}
                      title={started(s) ? undefined : tl('Available once the session starts')}>{tl('Completed')}</button>
                    <button type="button" className={btn.ghost} disabled={!started(s)} onClick={() => setStatus(s, 'no_show')}>{tl('No-show')}</button>
                    <button type="button" className={btn.ghost} onClick={() => setChanging(s)}>{tl('Delay / move / edit')}</button>
                    <button type="button" className={btn.danger} onClick={() => setStatus(s, 'cancelled')}>{tl('Cancel')}</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {changing && <SessionChange s={changing} change={(body) => coachService.changeSession(changing.id, body)}
        onClose={() => setChanging(null)} onSaved={() => { setChanging(null); refetch(); }} />}
    </Page>
  );
}
