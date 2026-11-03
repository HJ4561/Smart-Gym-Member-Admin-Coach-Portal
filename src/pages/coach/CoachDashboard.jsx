// src/pages/coach/CoachDashboard.jsx — the coach's day at a glance.
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { PageHeader } from '../../components/site/SiteUi';
import { formatGymDateTime } from '../../utils/gymTime';
import { formatSAR } from '../../utils/money';
import { tl, locale } from '../../i18n';
import { Chip, Page, Section, Skeleton, Tile, LIVE_MS } from './ui';
import { SESSION_LABEL, SESSION_TONE } from './sessionStatus';

export default function CoachDashboard() {
  const { data, loading } = useApi(() => coachService.dashboard(), [], { poll: LIVE_MS });
  if (loading && !data) return <Page><Skeleton rows={4} h="h-24" /></Page>;
  if (!data) return <Page><PageHeader title={tl('Dashboard')} /></Page>;
  const p = data.profile;
  const s = p.stats;

  return (
    <Page>
      <PageHeader title={tl('Dashboard')}
        subtitle={p.is_accepting_clients ? tl('You’re taking new clients.') : tl('You’re not taking new 1-on-1 clients right now — change it on My hours.')}>
        <Link to="/coach/courses" className="px-4 py-2 rounded bg-primary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider">
          {tl('+ New course')}
        </Link>
      </PageHeader>

      {!p.photo_url || !p.bio ? (
        <Link to="/coach/profile" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[13px] text-amber-200 flex items-center gap-3">
          <span className="material-symbols-outlined" aria-hidden="true">person_edit</span>
          {tl('Members see your photo and bio when they choose a coach. Finish your profile →')}
        </Link>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile icon="event_available" label={tl('Upcoming sessions')} value={s.upcoming_sessions} />
        <Tile icon="groups" label={tl('Active students')} value={s.active_students} />
        <Tile icon="school" label={tl('Live courses')} value={s.courses_published} />
        <Tile icon="rate_review" label={tl('In review')} value={s.courses_in_review} tone="text-amber-300" />
        <Tile icon="star" label={tl('Rating')} value={s.reviews ? `${s.rating.toFixed(1)} (${s.reviews})` : tl('No reviews')} tone="text-amber-300" />
        <Tile icon="payments" label={tl('Last 30 days')} value={formatSAR(s.earnings_30d)} tone="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title={tl('Next 1-on-1 sessions')} className="xl:col-span-2"
          action={<Link to="/coach/sessions" className="text-primary text-[12px] font-bold">{tl('All sessions →')}</Link>}>
          {data.next_sessions.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">{tl('No sessions booked yet. Members book inside your weekly hours.')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#1a1a1e]">
              {data.next_sessions.map((x) => (
                <li key={x.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-on-surface font-bold text-[13px] w-40 shrink-0">{formatGymDateTime(x.scheduled_at)}</span>
                  <span className="text-on-surface text-[13px] flex-1 min-w-0 truncate">{x.member.name}</span>
                  {x.focus_area && <span className="text-[12px] text-on-surface-variant truncate">{x.focus_area}</span>}
                  <Chip tone={SESSION_TONE[x.status]}>{SESSION_LABEL[x.status]}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={tl('Classes today')} action={<Link to="/coach/classes" className="text-primary text-[12px] font-bold">{tl('My classes →')}</Link>}>
          {data.classes_today.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">{tl('No classes today.')}</p>
          ) : data.classes_today.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="text-on-surface font-bold truncate">{c.start_time} · {c.name}</span>
              <span className="text-on-surface-variant whitespace-nowrap">{c.booked}/{c.capacity}</span>
            </div>
          ))}
        </Section>

        <Section title={tl('New in your courses')} className="xl:col-span-2"
          action={<Link to="/coach/students" className="text-primary text-[12px] font-bold">{tl('Students →')}</Link>}>
          {data.recent_students.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">{tl('Nobody has joined your courses yet.')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#1a1a1e]">
              {data.recent_students.map((r, i) => (
                <li key={i} className="py-2 flex flex-wrap justify-between gap-2 text-[13px]">
                  <span className="text-on-surface">{r.member} <span className="text-on-surface-variant">{tl('started')}</span> {r.course}</span>
                  <span className="text-on-surface-variant">{new Date(r.enrolled_at).toLocaleDateString(locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={tl('Earnings')} action={<Link to="/coach/earnings" className="text-primary text-[12px] font-bold">{tl('Details →')}</Link>}>
          {[['sessions', tl('1-on-1 sessions')], ['courses', tl('Courses')], ['classes', tl('Classes')], ['videos', tl('Videos')]].map(([k, label]) => (
            <div key={k} className="flex justify-between text-[13px]">
              <span className="text-on-surface-variant">{label}</span>
              <span className="text-on-surface font-bold">{formatSAR(data.earnings.last_30_days[k])}</span>
            </div>
          ))}
          <div className="flex justify-between text-[13px] border-t border-[#1a1a1e] pt-2">
            <span className="text-on-surface-variant">{tl('Last 30 days')}</span>
            <span className="text-emerald-400 font-bold">{formatSAR(data.earnings.last_30_days.total)}</span>
          </div>
        </Section>
      </div>
    </Page>
  );
}
