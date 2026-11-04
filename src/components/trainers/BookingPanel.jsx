// src/components/trainers/BookingPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { catalogService } from '../../services/catalogService';
import { useApi } from '../../hooks/useApi';
import PayDialog from '../payments/PayDialog';
import { errorMessage } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { formatGymDateTime } from '../../utils/gymTime';
import { getLocalized, tl } from '../../i18n';

const DAYS_AHEAD = 14;
const CANCEL_HOURS = 24;

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekdayMon0 = (d) => (d.getDay() + 6) % 7; // backend: 0 = Monday

const STATUS_LABEL = {
  scheduled: [tl('Confirmed'), 'text-emerald-400'],
  pending_payment: [tl('Awaiting payment'), 'text-primary'],
  completed: [tl('Completed'), 'text-on-surface-variant'],
  no_show: [tl('Missed (no-show)'), 'text-amber-400'],
};
const canCancel = (s) =>
  s.status === 'pending_payment' ||
  (s.status === 'scheduled' && new Date(s.scheduled_at) > new Date());

export default function BookingPanel({ trainer }) {
  const [days] = useState(() =>
    Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    })
  );
  const [day, setDay] = useState(null);
  const [slots, setSlots] = useState(null);
  const [meta, setMeta] = useState(null);
  const [slot, setSlot] = useState(null);
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [paySession, setPaySession] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const [recentSince] = useState(() => new Date(Date.now() - 30 * 86400000));
  const { data: sessions, refetch: refetchSessions } = useApi(
    () => catalogService.mySessions(),
    [],
    { showError: false }
  );

  const mine = useMemo(
    () =>
      (Array.isArray(sessions) ? sessions : [])
        .filter(
          (s) =>
            s.trainer === trainer?.id &&
            s.status !== 'cancelled' &&
            (['scheduled', 'pending_payment'].includes(s.status) ||
              new Date(s.scheduled_at) > recentSince)
        )
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [sessions, trainer?.id, recentSince]
  );

  useEffect(() => {
    if (!trainer?.id) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await catalogService.trainerSlots(trainer.id, isoDate(days[0]));
        if (!alive) return;
        setMeta(res);
        const first = days.find((d) => res.available_weekdays.includes(weekdayMon0(d)));
        setDay(first ? isoDate(first) : null);
      } catch (e) {
        if (alive) toast.error(errorMessage(e, tl('Could not load availability')));
      }
    })();
    return () => {
      alive = false;
    };
  }, [trainer?.id, days]);

  useEffect(() => {
    if (!trainer?.id || !day) return undefined;
    let alive = true;
    (async () => {
      setSlots(null);
      setSlot(null);
      try {
        const res = await catalogService.trainerSlots(trainer.id, day);
        if (alive) setSlots(res.slots);
      } catch {
        if (alive) setSlots([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trainer?.id, day]);

  const reloadSlots = async () => {
    if (!day) return;
    try {
      setSlots((await catalogService.trainerSlots(trainer.id, day)).slots);
    } catch {
      /* keep current slots */
    }
  };

  const book = async () => {
    if (!slot) return;
    setBooking(true);
    try {
      const session = await catalogService.bookSession({
        trainer_id: trainer.id,
        scheduled_at: slot.start,
        focus_area: focus,
        notes,
      });
      if (session.status === 'scheduled') {          // free session: confirmed straight away
        toast.success(tl('Session booked — see you there!'));
        setNotes('');
        setFocus('');
        refetchSessions();
        reloadSlots();
      } else {
        setPaySession(session);
      }
    } catch (e) {
      toast.error(errorMessage(e, tl('Could not book that slot')));
      reloadSlots();
    } finally {
      setBooking(false);
    }
  };

  const doCancel = async (s) => {
    try {
      await catalogService.cancelSession(s.id);
      toast.success(tl('Session cancelled'));
      setConfirmCancel(null);
      refetchSessions();
      reloadSlots();
    } catch (e) {
      toast.error(errorMessage(e, tl('Could not cancel')));
    }
  };

  const localized = trainer ? getLocalized(trainer, 'specialties') : null;
  const specialties = Array.isArray(localized) ? localized : [];
  const accepting = meta ? meta.accepting : trainer?.is_accepting_clients;
  const price = meta?.price ?? trainer?.hourly_rate ?? 0;
  const priceLabel = Number(price) > 0 ? formatSAR(price) : tl('Free');

  return (
    <div className="flex flex-col lg:sticky lg:top-20 self-start">
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-2xl flex flex-col gap-space-md">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-primary tracking-widest uppercase">
              {tl('1-on-1 session')}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
              {tl('Book a session')}
            </h2>
          </div>
          <span className="font-title-md text-title-md text-on-surface whitespace-nowrap tabular-nums">
            {priceLabel}
            <span className="text-on-surface-variant text-[11px]"> / 60 min</span>
          </span>
        </div>

        {!accepting ? (
          <p className="text-on-surface-variant text-[13px]">
            {tl('This trainer isn’t taking new 1-on-1 bookings right now.')}
          </p>
        ) : meta && meta.available_weekdays.length === 0 ? (
          <p className="text-on-surface-variant text-[13px]">
            {tl('No booking hours have been set for this trainer yet.')}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                {tl('Day')}
              </span>
              <div
                className="flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory"
                role="radiogroup"
                aria-label={tl('Pick a day')}
              >
                {days.map((d) => {
                  const works = meta?.available_weekdays.includes(weekdayMon0(d));
                  const id = isoDate(d);
                  const selected = day === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!works}
                      onClick={() => setDay(id)}
                      className={`snap-start shrink-0 w-14 py-2 rounded flex flex-col items-center text-[11px] font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                        selected
                          ? 'bg-primary-container text-on-primary-container'
                          : works
                          ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                          : 'bg-surface-container-low text-on-surface-variant/40 cursor-not-allowed'
                      }`}
                    >
                      <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <span className="text-[14px] tabular-nums">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                {tl('Time')}
              </span>
              <div aria-live="polite" aria-busy={slots === null}>
                {slots === null ? (
                  <div className="grid grid-cols-3 gap-1">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-9 rounded bg-surface-container animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-on-surface-variant text-[12px]">
                    {tl('No free slots that day — try another day.')}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={tl('Pick a time')}>
                    {slots.map((s) => {
                      const selected = slot?.start === s.start;
                      return (
                        <button
                          key={s.start}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSlot(s)}
                          className={`py-2 rounded text-[12px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                            selected
                              ? 'bg-primary-container text-on-primary-container'
                              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {specialties.length > 0 && (
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {tl('Focus (optional)')}
                </span>
                <div className="flex flex-wrap gap-1" role="group" aria-label={tl('Focus area')}>
                  {specialties.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      aria-pressed={focus === sp}
                      onClick={() => setFocus(focus === sp ? '' : sp)}
                      className={`px-2 py-1 rounded text-[11px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                        focus === sp
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="sr-only">{tl('Notes for the trainer')}</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder={tl('Anything the trainer should know (injuries, goals)…')}
                className="w-full bg-surface-container text-on-surface px-3 py-2 rounded border border-surface-container-high focus:outline-none focus:border-primary text-[13px]"
              />
            </label>

            <button
              type="button"
              onClick={book}
              disabled={!slot || booking}
              className="w-full py-3 rounded-lg bg-primary-container hover:bg-secondary-container text-on-primary-container font-bold uppercase tracking-wider text-[12px] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              {booking
                ? tl('Reserving…')
                : slot
                ? tl('Book {0} · {1}', { 0: slot.label, 1: priceLabel })
                : tl('Pick a time')}
            </button>
            <p className="text-on-surface-variant text-[11px]">
              {tl('Cancel up to')} {CANCEL_HOURS}{' '}
              {tl('hours before for a full refund to your locker credit.')}
            </p>
          </>
        )}

        {mine.length > 0 && (
          <div className="flex flex-col gap-space-xs border-t border-surface-container-high pt-space-md">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              {tl('Your sessions')}
            </span>
            <div className="flex flex-col gap-1" aria-live="polite">
              {mine.map((s) => {
                const [label, tone] = STATUS_LABEL[s.status] || [s.status, 'text-on-surface-variant'];
                const isConfirming = confirmCancel === s.id;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-surface-container rounded px-3 py-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-on-surface text-[13px] font-bold truncate tabular-nums">
                        {formatGymDateTime(s.scheduled_at)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${tone}`}>{label}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => doCancel(s)}
                            className="px-2 py-1 rounded bg-error/15 text-error text-[10px] font-bold uppercase"
                          >
                            {tl('Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancel(null)}
                            className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase"
                          >
                            {tl('Keep')}
                          </button>
                        </>
                      ) : (
                        <>
                          {s.status === 'pending_payment' && (
                            <button
                              type="button"
                              onClick={() => setPaySession(s)}
                              className="px-2 py-1 rounded bg-primary-container text-on-primary-container text-[10px] font-bold uppercase"
                            >
                              {tl('Pay')}
                            </button>
                          )}
                          {canCancel(s) && (
                            <button
                              type="button"
                              onClick={() => setConfirmCancel(s.id)}
                              className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase hover:text-error"
                            >
                              {tl('Cancel')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PayDialog
        request={paySession ? { purpose: 'trainer_session', session_id: paySession.id } : null}
        title={paySession ? tl('Session with {0}', { 0: trainer?.user?.full_name || tl('trainer') }) : ''}
        allowCredit
        onPaid={() => {
          toast.success(tl('Session confirmed!'));
          setNotes('');
          setFocus('');
        }}
        onClose={() => {
          setPaySession(null);
          refetchSessions();
          reloadSlots();
        }}
      />
    </div>
  );
}