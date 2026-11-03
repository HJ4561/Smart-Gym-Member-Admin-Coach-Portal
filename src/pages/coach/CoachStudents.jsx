// src/pages/coach/CoachStudents.jsx — members in the coach's courses (with progress) and 1-on-1 clients.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { inputCls } from '../../components/site/siteStyles';
import { tl, locale } from '../../i18n';
import { card, Page, Skeleton, Tabs, LIVE_MS } from './ui';

export default function CoachStudents() {
  const [tab, setTab] = useState('courses');
  const [q, setQ] = useState('');
  const { data, loading } = useApi(() => coachService.students(), [], { poll: LIVE_MS });
  const match = (r) => !q || `${r.name} ${r.email} ${r.course || ''}`.toLowerCase().includes(q.toLowerCase());
  const enrolments = (data?.enrolments || []).filter(match);
  const clients = (data?.clients || []).filter(match);

  return (
    <Page>
      <PageHeader title={tl('Students')} subtitle={tl('Who is following your courses, how far they are, and your 1-on-1 clients.')} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onChange={setTab} options={[
          ['courses', tl('In my courses ({0})', { 0: data?.enrolments?.length ?? 0 })],
          ['clients', tl('1-on-1 clients ({0})', { 0: data?.clients?.length ?? 0 })]]} />
        <div className="flex-1" />
        <input className={`${inputCls} sm:w-64`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tl('Search name, email, course…')} aria-label={tl('Search students')} />
      </div>

      {loading && !data ? <Skeleton /> : tab === 'courses' ? (
        enrolments.length === 0 ? <Empty>{tl('No students yet.')}</Empty> : (
          <ul className="flex flex-col gap-2">
            {enrolments.map((e) => (
              <li key={e.id} className={`${card} p-4 flex flex-col md:flex-row md:items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className="text-on-surface font-bold truncate">{e.name}</div>
                  <div className="text-[12px] text-on-surface-variant truncate">{e.course} · {tl('since {0}', { 0: new Date(e.enrolled_at).toLocaleDateString(locale) })}</div>
                </div>
                <div className="md:w-72 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-on-surface-variant">
                    <span>{e.status === 'completed' ? tl('Completed') : tl('Day {0} of {1}', { 0: e.completed_days, 1: e.total_days })}</span>
                    <span className="font-bold text-on-surface">{e.progress_percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1a1a1e] overflow-hidden" role="progressbar"
                    aria-valuenow={e.progress_percent} aria-valuemin={0} aria-valuemax={100} aria-label={tl('Progress')}>
                    <div className="h-full bg-primary-container" style={{ width: `${e.progress_percent}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : clients.length === 0 ? <Empty>{tl('No 1-on-1 clients yet.')}</Empty> : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {clients.map((c) => (
            <li key={c.member_id} className={`${card} p-4`}>
              <div className="text-on-surface font-bold truncate">{c.name}</div>
              <div className="text-[12px] text-on-surface-variant truncate">{c.email}</div>
              <div className="text-[12px] text-on-surface mt-2">{tl('{0} sessions · {1} completed', { 0: c.sessions, 1: c.completed })}</div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
