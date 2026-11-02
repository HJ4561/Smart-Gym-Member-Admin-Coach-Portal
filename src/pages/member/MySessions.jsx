// src/pages/member/MySessions.jsx
// Every 1-on-1 session the member booked, in two tabs: Upcoming (scheduled, still ahead — plus
// bookings waiting for payment) and History (completed, cancelled, no-show or past). Upcoming
// sessions can be cancelled up to 24 hours before they start (refund to locker credit).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import PayDialog from '../../components/payments/PayDialog';
import { formatGymDateTime } from '../../utils/gymTime';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import { tl } from '../../i18n';

const CANCEL_HOURS = 24;   // same rule as the backend (apps/catalog/views.py REFUND_HOURS)
const STATUS = {
  scheduled: [tl('Scheduled'), 'bg-sky-500/15 text-sky-500'],
  pending_payment: [tl('Awaiting payment'), 'bg-amber-500/15 text-amber-500'],
  completed: [tl('Completed'), 'bg-emerald-500/15 text-emerald-500'],
  no_show: [tl('Missed (no-show)'), 'bg-rose-500/15 text-rose-500'],
  cancelled: [tl('Cancelled'), 'bg-surface-container-high text-on-surface-variant'],
};
const initials = (name = '') => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function MySessions() {
  const [tab, setTab] = useState('upcoming');
  const [busy, setBusy] = useState(null);
  const [paying, setPaying] = useState(null);
  const { data, loading, refetch } = useApi(() => catalogService.mySessions(), [], { poll: 60_000 });
  const [now, setNow] = useState(() => Date.now());          // ticks each minute: sessions move to History
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const all = Array.isArray(data) ? data : [];
  const isUpcoming = (s) => ['scheduled', 'pending_payment'].includes(s.status) && new Date(s.scheduled_at).getTime() > now;
  const upcoming = all.filter(isUpcoming).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const history = all.filter((s) => !isUpcoming(s) && s.status !== 'pending_payment');
  const list = tab === 'upcoming' ? upcoming : history;

  const cancel = async (s) => {
    const paid = s.status === 'scheduled' && Number(s.amount_charged) > 0;
    if (!window.confirm(paid
      ? tl('Cancel your session with {0}? {1} goes back to your locker credit.', { 0: s.trainer_name, 1: formatSAR(s.amount_charged) })
      : tl('Cancel your session with {0}?', { 0: s.trainer_name }))) return;
    setBusy(s.id);
    try {
      await catalogService.cancelSession(s.id);
      toast.success(paid ? tl('Cancelled — refunded to your locker credit') : tl('Cancelled'));
      refetch();
    } catch (err) {
      toast.error(errorMessage(err, tl('Couldn’t cancel the session.')));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-5">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">event_available</span>{tl('1-on-1 coaching')}
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide">{tl('My sessions')}</h1>
        <p className="text-on-surface-variant max-w-2xl">
          {tl('Your booked sessions with coaches. You can cancel up to {0} hours before a session starts.', { 0: CANCEL_HOURS })}
        </p>
      </motion.header>

      <div className="flex gap-1 w-fit rounded-lg bg-surface-container p-1" role="tablist">
        {[['upcoming', tl('Upcoming'), upcoming.length], ['history', tl('History'), history.length]].map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-[12px] font-bold uppercase tracking-wider ${
              tab === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {label} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-surface-container animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl bg-surface-container border border-surface-container-high p-10 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">event_busy</span>
          <p className="text-on-surface font-bold">{tab === 'upcoming' ? tl('No upcoming sessions') : tl('No past sessions yet')}</p>
          {tab === 'upcoming' && (
            <Link to="/dashboard/trainers" className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-bold text-[14px]">
              {tl('Book a coach')}
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((s) => {
            const [label, tone] = STATUS[s.status] || [s.status, ''];
            const hoursLeft = (new Date(s.scheduled_at).getTime() - now) / 3_600_000;
            const canCancel = isUpcoming(s) && (s.status === 'pending_payment' || hoursLeft > CANCEL_HOURS);
            return (
              <li key={s.id} className="rounded-xl bg-surface-container border border-surface-container-high p-4 flex flex-col gap-3 min-w-0">
                <div className="flex items-start gap-3">
                  {s.trainer_photo
                    ? <img src={s.trainer_photo} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    : <span className="w-12 h-12 rounded-lg bg-primary-container/15 text-primary grid place-items-center font-bold shrink-0">{initials(s.trainer_name)}</span>}
                  <div className="flex-1 min-w-0">
                    <Link to={`/dashboard/trainers/${s.trainer}`} className="text-on-surface font-bold hover:underline break-words">{s.trainer_name}</Link>
                    {s.trainer_title && <div className="text-[12px] text-on-surface-variant truncate">{s.trainer_title}</div>}
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${tone}`}>{label}</span>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[13px]">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('When')}</dt>
                    <dd className="text-on-surface font-bold">{formatGymDateTime(s.scheduled_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Length')}</dt>
                    <dd className="text-on-surface">{tl('{0} min', { 0: s.duration_minutes })}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Price')}</dt>
                    <dd className="text-on-surface">{Number(s.amount_charged) > 0 ? formatSAR(s.amount_charged) : tl('Free')}</dd>
                  </div>
                </dl>
                {(s.focus_area || s.notes) && (
                  <p className="text-[12px] text-on-surface-variant break-words">{[s.focus_area, s.notes].filter(Boolean).join(' — ')}</p>
                )}
                {isUpcoming(s) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container-high">
                    {s.status === 'pending_payment' && (
                      <button type="button" onClick={() => setPaying(s)}
                        className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider">
                        {tl('Pay to confirm')}
                      </button>
                    )}
                    {canCancel ? (
                      <button type="button" disabled={busy === s.id} onClick={() => cancel(s)}
                        className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-error/20 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">
                        {busy === s.id ? '…' : tl('Cancel')}
                      </button>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">
                        {tl('Less than {0} hours to go — it can’t be cancelled now.', { 0: CANCEL_HOURS })}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <PayDialog
        request={paying ? { purpose: 'trainer_session', session_id: paying.id } : null}
        title={paying ? tl('Session with {0}', { 0: paying.trainer_name }) : ''}
        allowCredit
        onPaid={() => { toast.success(tl('Paid — your session is confirmed.')); setPaying(null); refetch(); }}
        onClose={() => { setPaying(null); refetch(); }}
      />
    </div>
  );
}
