// src/pages/coach/CoachStudent.jsx — one student: membership, course progress lesson by lesson,
// 1-on-1 history, classes, gym visits, workouts and personal records.
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn } from '../../components/site/siteStyles';
import { formatGymDateTime } from '../../utils/gymTime';
import { tl, locale } from '../../i18n';
import { Chip, Page, Section, Skeleton, Tile, LIVE_MS } from './ui';
import { SESSION_LABEL, SESSION_TONE } from './sessionStatus';

const DAYS = [tl('Monday'), tl('Tuesday'), tl('Wednesday'), tl('Thursday'), tl('Friday'), tl('Saturday'), tl('Sunday')];
const date = (d) => (d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function CoachStudent() {
  const { memberId } = useParams();
  const { data, loading } = useApi(() => coachService.student(memberId), [memberId], { poll: LIVE_MS });
  if (loading && !data) return <Page><Skeleton rows={4} /></Page>;
  if (!data) return <Page><Empty>{tl('Student not found.')}</Empty></Page>;
  const { member: m, membership: ms, insights: i } = data;

  return (
    <Page>
      <PageHeader title={m.name} subtitle={`${m.email}${m.phone ? ` · ${m.phone}` : ''} · ${tl('member since {0}', { 0: date(m.joined) })}`}>
        <Link to="/coach/students" className={btn.ghost}>{tl('All students')}</Link>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label={tl('Gym visits, 30 days')} value={i.visits_30d} icon="login" />
        <Tile label={tl('Workouts, 30 days')} value={i.workouts_30d} icon="fitness_center" />
        <Tile label={tl('Kg lifted, 30 days')} value={Math.round(i.tonnage_30d_kg).toLocaleString(locale)} icon="monitor_weight" />
        <Tile label={tl('Last visit')} value={i.last_visit ? date(i.last_visit) : '—'} icon="schedule"
          tone={i.days_since_visit == null || i.days_since_visit > 14 ? 'text-amber-400' : ''} />
        <Tile label={tl('Sessions completed')} value={i.sessions_completed} icon="task_alt" />
        <Tile label={tl('Missed sessions')} value={i.sessions_missed} icon="event_busy" tone={i.sessions_missed ? 'text-rose-400' : ''} />
        <Tile label={tl('Upcoming sessions')} value={i.upcoming_sessions} icon="event" />
        <Tile label={tl('Membership')} value={ms ? `${ms.plan}` : tl('None')} icon="card_membership"
          tone={ms && ms.days_remaining <= 7 ? 'text-amber-400' : ''} />
      </div>
      {ms && <p className="text-[12px] text-on-surface-variant -mt-3">{tl('{0} · until {1} ({2} days left)', { 0: tl(ms.status), 1: date(ms.expiry_date), 2: ms.days_remaining })}</p>}

      {data.courses.length > 0 && (
        <Section title={tl('Course progress')}>
          {data.courses.map((c) => (
            <details key={c.course_id} className="border-t border-[#1a1a1e] first:border-0 pt-2" open={data.courses.length === 1}>
              <summary className="cursor-pointer flex flex-wrap items-center gap-3 text-[13px]">
                <span className="text-on-surface font-bold flex-1 min-w-0 truncate">{c.course}</span>
                <span className="text-on-surface-variant">{tl('{0} of {1} lessons', { 0: c.done, 1: c.total })}</span>
                <span className="w-32 h-1.5 rounded-full bg-[#1a1a1e] overflow-hidden" role="progressbar" aria-valuenow={c.progress_percent}
                  aria-valuemin={0} aria-valuemax={100} aria-label={tl('Progress')}>
                  <span className="block h-full bg-primary-container" style={{ width: `${c.progress_percent}%` }} />
                </span>
                <span className="text-on-surface font-bold w-10 text-right">{c.progress_percent}%</span>
              </summary>
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1 text-[12px]">
                {c.lessons.map((l) => (
                  <li key={l.id} className={`flex items-center gap-2 ${l.done ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    <span className={`material-symbols-outlined text-[16px] ${l.done ? 'text-emerald-400' : ''}`} aria-hidden="true">{l.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                    {tl('Week {0} · Day {1}', { 0: l.week, 1: l.day })} — {l.title}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title={tl('1-on-1 sessions')}>
          {data.sessions.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('No sessions with you yet.')}</p> : data.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-[13px] border-t border-[#1a1a1e] first:border-0 pt-2">
              <span className="text-on-surface w-40 shrink-0">{formatGymDateTime(s.scheduled_at)}</span>
              <span className="flex-1 min-w-0 truncate text-on-surface-variant">{s.focus_area || s.notes || '—'}</span>
              <Chip tone={SESSION_TONE[s.status]}>{SESSION_LABEL[s.status]}</Chip>
            </div>
          ))}
        </Section>
        <Section title={tl('Personal records')}>
          {data.records.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('No records logged yet.')}</p> : data.records.map((r) => (
            <div key={r.exercise} className="flex items-center justify-between gap-3 text-[13px] border-t border-[#1a1a1e] first:border-0 pt-2">
              <span className="text-on-surface truncate">{r.exercise}</span>
              <span className="text-on-surface-variant whitespace-nowrap">{r.best_weight_kg} kg × {r.best_reps} · 1RM ≈ {Math.round(r.estimated_1rm)} kg</span>
            </div>
          ))}
        </Section>
        <Section title={tl('Recent workouts')}>
          {data.recent_workouts.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('No workouts logged yet.')}</p> : data.recent_workouts.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 text-[13px] border-t border-[#1a1a1e] first:border-0 pt-2">
              <span className="text-on-surface truncate">{w.name} · {date(w.completed_at)}</span>
              <span className="text-on-surface-variant whitespace-nowrap">{tl('{0} sets · {1} kg · {2} min', { 0: w.sets, 1: Math.round(w.tonnage_kg), 2: w.minutes ?? '—' })}</span>
            </div>
          ))}
        </Section>
        <Section title={tl('Classes with you')}>
          {data.classes.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('Not in any of your classes.')}</p> : data.classes.map((c) => (
            <div key={c.class_id} className="flex items-center justify-between gap-3 text-[13px] border-t border-[#1a1a1e] first:border-0 pt-2">
              <span className="text-on-surface truncate">{c.name} · {DAYS[c.day]} {c.start_time}</span>
              <span className="text-on-surface-variant">{tl(c.status)}</span>
            </div>
          ))}
        </Section>
      </div>
    </Page>
  );
}
