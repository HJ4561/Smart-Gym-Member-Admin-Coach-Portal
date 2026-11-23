// src/pages/coach/CoachStudents.jsx — members in the coach's courses (with progress) and 1-on-1 clients.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useListState';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { inputCls } from '../../components/site/siteStyles';
import { tl, locale } from '../../i18n';
import { card, Page, Skeleton, Tabs, LIVE_MS } from './ui';

export default function CoachStudents() {
  const [tab, setTab] = useState('courses');
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');
  const [state, setState] = useState('');
  const search = useDebounced(q);
  const { data, loading } = useApi(() => coachService.students({ q: search || undefined, course: course || undefined,
    status: state || undefined }), [search, course, state], { poll: LIVE_MS });
  const { data: mine } = useApi(() => coachService.courses(), []);
  const enrolments = data?.enrolments || [];
  const clients = data?.clients || [];

  return (
    <Page>
      <PageHeader title={tl('Students')} subtitle={tl('Who is following your courses, how far they are, and your 1-on-1 clients. Open a name for their progress and insights.')} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onChange={setTab} options={[
          ['courses', tl('In my courses ({0})', { 0: data?.enrolments?.length ?? 0 })],
          ['clients', tl('1-on-1 clients ({0})', { 0: data?.clients?.length ?? 0 })]]} />
        <div className="flex-1" />
        {tab === 'courses' && (
          <>
            <select className={`${inputCls} sm:w-52`} value={course} onChange={(e) => setCourse(e.target.value)} aria-label={tl('Course')}>
              <option value="">{tl('All courses')}</option>
              {(mine?.courses || []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select className={`${inputCls} sm:w-40`} value={state} onChange={(e) => setState(e.target.value)} aria-label={tl('Status')}>
              <option value="">{tl('Any status')}</option>
              <option value="active">{tl('Active')}</option><option value="completed">{tl('Completed')}</option>
              <option value="refunded">{tl('Refunded')}</option>
            </select>
          </>
        )}
        <input className={`${inputCls} sm:w-64`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tl('Search name, email, course…')} aria-label={tl('Search students')} />
      </div>

      {loading && !data ? <Skeleton /> : tab === 'courses' ? (
        enrolments.length === 0 ? <Empty>{tl('No students yet.')}</Empty> : (
          <ul className="flex flex-col gap-2">
            {enrolments.map((e) => (
              <li key={e.id} className={`${card} p-4 flex flex-col md:flex-row md:items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <Link to={`/coach/students/${e.member_id}`} className="text-on-surface font-bold truncate hover:underline block">{e.name}</Link>
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
              <Link to={`/coach/students/${c.member_id}`} className="text-on-surface font-bold truncate hover:underline block">{c.name}</Link>
              <div className="text-[12px] text-on-surface-variant truncate">{c.email}</div>
              <div className="text-[12px] text-on-surface mt-2">{tl('{0} sessions · {1} completed', { 0: c.sessions, 1: c.completed })}</div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
