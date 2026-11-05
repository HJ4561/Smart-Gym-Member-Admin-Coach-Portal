// src/pages/member/Classes.jsx
// The weekly class timetable. Free classes: booking keeps your spot every week; full classes put
// you on a waitlist and you're notified when a spot opens. Paid classes are locked until paid —
// the whole class (every session to its last day) or single sessions.
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { classesService } from '../../services/classesService';
import PayDialog from '../../components/payments/PayDialog';
import { errorMessage } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { getLocalized, tl, locale } from '../../i18n';
import { LOCKER_CREDIT_ENABLED } from '../../config/features';

const TODAY = (new Date().getDay() + 6) % 7;   // Mon = 0, like the timetable
const fmtDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

export default function Classes() {
  const [day, setDay] = useState(TODAY);
  const [busyId, setBusyId] = useState(null);
  const [buy, setBuy] = useState(null);           // {cls, kind, date}
  const [pick, setPick] = useState(null);         // class whose session dates are open
  const { data, loading, refetch } = useApi(() => classesService.list(), []);
  const days = data?.days || [];
  const classes = data?.classes || [];
  const mine = classes.filter((c) => c.my_status || c.my_access?.full || c.my_access?.sessions?.length);
  const shown = classes.filter((c) => c.day_of_week === day);

  const act = async (c) => {
    setBusyId(c.id);
    try {
      const res = c.my_status ? await classesService.cancel(c.id) : await classesService.book(c.id);
      toast.success(res.detail);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err, tl("Something went wrong")));
    } finally {
      setBusyId(null);
    }
  };

  const cancelSession = async (c, date) => {
    if (!window.confirm((LOCKER_CREDIT_ENABLED
      ? tl("Cancel {0} on {1}? The price goes back to your locker credit.", { 0: getLocalized(c, 'name'), 1: fmtDay(date) })
      : tl("Cancel {0} on {1}? The price is refunded to the card you paid with.", { 0: getLocalized(c, 'name'), 1: fmtDay(date) })))) return;
    try {
      toast.success((await classesService.cancel(c.id, date)).detail);
      refetch();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-space-xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-space-xs text-primary">
          <span className="material-symbols-outlined text-[16px]">event</span>
          <span className="font-label-md text-[10px] uppercase tracking-widest font-bold">{tl("Group classes")}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider">{tl("Classes")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
          {tl("Book a free class once and your spot is kept every week. Paid classes show a lock — buy the whole class or single sessions.")}
        </p>
      </motion.div>

      {mine.length > 0 && (
        <section className="bg-surface-container rounded-xl p-5 flex flex-col gap-3">
          <h2 className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant">{tl("My classes")}</h2>
          <div className="flex flex-wrap gap-2">
            {mine.map((c) => (
              <button key={c.id} type="button" onClick={() => setDay(c.day_of_week)}
                className="px-3 py-2 rounded-lg bg-surface-container-high text-left text-[13px] text-on-surface hover:bg-surface-bright">
                <span className="font-bold">{getLocalized(c, 'name')}</span>
                <span className="block text-[11px] text-on-surface-variant">
                  {c.day.slice(0, 3)} {c.start_time}
                  {c.my_status === 'waitlist' && tl(" · waitlist #{0}", { 0: c.my_waitlist_position })}
                  {c.my_access?.full && tl(" · until {0}", { 0: fmtDay(c.my_access.full) })}
                  {!c.my_access?.full && c.my_access?.sessions?.length > 0 && ` · ${c.my_access.sessions.map(fmtDay).join(', ')}`}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={tl("Day")}>
        {days.map((d, i) => {
          const n = classes.filter((c) => c.day_of_week === i).length;
          return (
            <button key={d} type="button" role="tab" aria-selected={day === i} onClick={() => setDay(i)}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider whitespace-nowrap ${
                day === i ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
              {tl(d).slice(0, 3)}{i === TODAY && tl(" · today")}<span className="ms-1 opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-surface-container rounded-xl animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low rounded-xl text-on-surface-variant">
          {tl("No classes on {0}.", { 0: days[day] ? tl(days[day]) : tl("this day") })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((c) => (
            <div key={c.id} className="bg-surface-container rounded-xl p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-primary font-bold">{c.start_time}–{c.end_time}</div>
                  <h3 className="font-title-lg text-title-lg text-on-surface break-words">{getLocalized(c, 'name')}</h3>
                  <div className="text-[12px] text-on-surface-variant">
                    {tl(c.category_label)} · {c.level_label}{c.trainer && ` · ${c.trainer}`}{getLocalized(c, 'location') && ` · ${getLocalized(c, 'location')}`}
                  </div>
                </div>
                {c.is_paid && c.locked ? (
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 bg-amber-400/15 text-amber-500 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>{tl("Paid")}
                  </span>
                ) : (c.my_status || c.my_access?.full) && (
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                    c.my_status === 'waitlist' ? 'bg-amber-400/15 text-amber-400' : 'bg-emerald-400/15 text-emerald-400'}`}>
                    {c.my_status === 'waitlist' ? tl("Waitlist #{0}", { 0: c.my_waitlist_position }) : tl("Booked")}
                  </span>
                )}
              </div>
              {getLocalized(c, 'description') && <p className="text-[13px] text-on-surface-variant line-clamp-3">{getLocalized(c, 'description')}</p>}

              {c.is_paid ? (
                <PaidPanel c={c} open={pick === c.id} onToggleDates={() => setPick(pick === c.id ? null : c.id)}
                  onBuy={(kind, date) => setBuy({ cls: c, kind, date })} onCancelSession={(date) => cancelSession(c, date)} />
              ) : (
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-container-high gap-2">
                  <span className="text-[12px] text-on-surface-variant">
                    {c.spots_left > 0 ? tl("{0} of {1} spots left", { 0: c.spots_left, 1: c.capacity })
                      : tl("Full{0}", { 0: c.waitlisted ? ` · ${c.waitlisted} waiting` : '' })}
                  </span>
                  <button type="button" disabled={busyId === c.id} onClick={() => act(c)}
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 ${
                      c.my_status ? 'bg-surface-container-high text-on-surface hover:bg-error/20'
                        : 'bg-primary-container text-on-primary-container hover:opacity-90'}`}>
                    {busyId === c.id ? '…' : c.my_status === 'enrolled' ? tl("Cancel") : c.my_status === 'waitlist' ? tl("Leave waitlist")
                      : c.spots_left > 0 ? tl("Book") : tl("Join waitlist")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PayDialog
        request={buy ? { purpose: 'class_pass', class_id: buy.cls.id, kind: buy.kind, ...(buy.date ? { date: buy.date } : {}) } : null}
        title={buy ? (buy.kind === 'full' ? tl("{0} — whole class", { 0: getLocalized(buy.cls, 'name') }) : tl("{0} — {1}", { 0: getLocalized(buy.cls, 'name'), 1: fmtDay(buy.date) })) : ''}
        allowCredit
        onPaid={() => { toast.success(tl("You’re booked in!")); setBuy(null); setPick(null); refetch(); }}
        onClose={() => { setBuy(null); refetch(); }}
      />
    </div>
  );
}

/** Price, what the member already paid for, and the two ways to buy a paid class. */
function PaidPanel({ c, open, onToggleDates, onBuy, onCancelSession }) {
  const paidDates = c.my_access?.sessions || [];
  const perSession = Number(c.price_per_session) > 0;
  const dates = (c.session_dates || []).filter((d) => !paidDates.includes(d.date));
  return (
    <div className="mt-auto pt-3 border-t border-surface-container-high flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
        {perSession && <span className="text-on-surface font-bold">{tl("{0} / session", { 0: formatSAR(c.price_per_session) })}</span>}
        {c.full_offer && (
          <span className="text-on-surface-variant text-[12px]">
            {tl("Whole class {0} · {1} sessions until {2}", { 0: formatSAR(c.full_offer.price), 1: c.full_offer.sessions, 2: fmtDay(c.full_offer.until) })}
          </span>
        )}
      </div>

      {c.my_access?.full ? (
        <p className="text-[12px] text-emerald-500">{tl("You have the whole class — see you every week until {0}.", { 0: fmtDay(c.my_access.full) })}</p>
      ) : (
        <>
          {paidDates.length > 0 && (
            <ul className="flex flex-col gap-1" aria-label={tl("Sessions you paid for")}>
              {paidDates.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-emerald-500 font-bold">✓ {fmtDay(d)}</span>
                  <button type="button" onClick={() => onCancelSession(d)} className="text-on-surface-variant hover:text-error underline">{tl("Cancel")}</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {c.full_offer && (
              <button type="button" onClick={() => onBuy('full')}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider">
                {tl("Buy whole class")}
              </button>
            )}
            {perSession && (
              <button type="button" onClick={onToggleDates} aria-expanded={open}
                className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-bold uppercase tracking-wider">
                {paidDates.length ? tl("Add a session") : tl("Pay for one session")}
              </button>
            )}
          </div>
          {open && (
            dates.length === 0 ? <p className="text-[12px] text-on-surface-variant">{tl("No upcoming sessions to book.")}</p> : (
              <div className="grid grid-cols-2 gap-2" role="list" aria-label={tl("Pick a date")}>
                {dates.map((d) => (
                  <button key={d.date} type="button" role="listitem" disabled={d.spots_left <= 0} onClick={() => onBuy('session', d.date)}
                    className="rounded-lg border border-surface-container-high bg-surface-container-low px-3 py-2 text-left disabled:opacity-40">
                    <span className="block text-[13px] text-on-surface font-bold">{fmtDay(d.date)}</span>
                    <span className="block text-[11px] text-on-surface-variant">{d.spots_left > 0 ? tl("{0} spots left", { 0: d.spots_left }) : tl("Full")}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
