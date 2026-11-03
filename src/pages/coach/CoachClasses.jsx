// src/pages/coach/CoachClasses.jsx — group classes the coach teaches, with who's booked.
// The gym sets the timetable and prices (admin → Classes).
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { formatSAR } from '../../utils/money';
import { tl, locale } from '../../i18n';
import { card, Chip, Page, Skeleton, LIVE_MS } from './ui';

const DAYS = [tl('Monday'), tl('Tuesday'), tl('Wednesday'), tl('Thursday'), tl('Friday'), tl('Saturday'), tl('Sunday')];

export default function CoachClasses() {
  const { data, loading } = useApi(() => coachService.classes(), [], { poll: LIVE_MS });
  const [open, setOpen] = useState(null);
  const list = Array.isArray(data) ? data : [];

  return (
    <Page>
      <PageHeader title={tl('My classes')} subtitle={tl('The group classes you teach. The gym sets times, rooms and prices — ask them for changes.')} />
      {loading && !data ? <Skeleton rows={3} h="h-24" /> : list.length === 0 ? (
        <Empty>{tl('You don’t teach any classes yet.')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(({ class: c, roster, sessions }) => {
            const expanded = open === c.id;
            const byDate = sessions.reduce((m, s) => ({ ...m, [s.date]: [...(m[s.date] || []), s] }), {});
            return (
              <section key={c.id} className={`${card} p-4 flex flex-col gap-3 ${c.is_active ? '' : 'opacity-60'}`}>
                <button type="button" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}
                  className="flex flex-col md:flex-row md:items-center gap-2 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-on-surface font-bold flex flex-wrap items-center gap-2">
                      {c.name}
                      {!c.is_active && <Chip tone="bg-rose-500/15 text-rose-400">{tl('Paused')}</Chip>}
                      {c.is_paid && <Chip tone="bg-amber-500/15 text-amber-300">{tl('Paid')}</Chip>}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      {DAYS[c.day_of_week]} · {c.start_time}–{c.end_time}{c.location && ` · ${c.location}`}
                      {c.ends_on && ` · ${tl('until {0}', { 0: new Date(c.ends_on).toLocaleDateString(locale) })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    {c.is_paid && <span className="text-on-surface-variant">{formatSAR(c.price_per_session)} {tl('/ session')}</span>}
                    <span className="text-on-surface font-bold">{tl('{0}/{1} booked', { 0: c.booked, 1: c.capacity })}</span>
                    {c.waitlisted > 0 && <span className="text-amber-300">{tl('{0} waiting', { 0: c.waitlisted })}</span>}
                    <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">{expanded ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </button>
                {expanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#1a1a1e] pt-3">
                    <div>
                      <h3 className="text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">{tl('Every week')}</h3>
                      {roster.length === 0 ? <p className="text-[12px] text-on-surface-variant">{tl('Nobody yet.')}</p> : (
                        <ul className="flex flex-col gap-1 text-[13px]">
                          {roster.map((r) => (
                            <li key={r.id} className="flex justify-between gap-2">
                              <span className="text-on-surface truncate">{r.name}</span>
                              {r.status === 'waitlist' && <span className="text-amber-300 text-[11px]">{tl('waitlist')}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {c.is_paid && (
                      <div>
                        <h3 className="text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">{tl('Single sessions')}</h3>
                        {sessions.length === 0 ? <p className="text-[12px] text-on-surface-variant">{tl('No single-session bookings.')}</p> : (
                          Object.entries(byDate).map(([d, rows]) => (
                            <div key={d} className="mb-2">
                              <div className="text-[12px] text-on-surface font-bold">{new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                              <div className="text-[12px] text-on-surface-variant">{rows.map((r) => r.name).join(', ')}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
