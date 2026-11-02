// src/pages/coach/CoachCourses.jsx — the coach's courses: write a draft, send it for review,
// the gym publishes it (or sends it back with a note).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn } from '../../components/site/siteStyles';
import CourseEditor from '../../components/courses/CourseEditor';
import { NEW_COURSE, STATUS_TONE, categoryLabel } from '../../components/courses/courseOptions';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import { tl } from '../../i18n';
import { card, Chip, Page, Skeleton, Tabs } from './ui';

const API = {
  create: (b) => coachService.createCourse(b),
  update: (id, b) => coachService.updateCourse(id, b),
  remove: (id) => coachService.deleteCourse(id),
  upload: (id, f) => coachService.uploadCourseCover(id, f),
  submit: (id) => coachService.submitCourse(id),
};
const FILTERS = [['', tl('All')], ['draft', tl('Drafts')], ['pending', tl('In review')], ['published', tl('Live')], ['archived', tl('Archived')]];

export default function CoachCourses() {
  const { courseId } = useParams();          // /coach/courses/:id opens that course (from notifications)
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const { data, loading, refetch } = useApi(() => coachService.courses(), []);
  const list = (data?.courses || []).filter((c) => !status || c.status === status);

  // /coach/courses/:id (from a notification) opens that course until it's closed.
  const { data: linked } = useApi(() => (courseId ? coachService.course(courseId) : Promise.resolve(null)), [courseId],
    { showError: false });
  const shown = editing || (courseId && linked && String(linked.id) === courseId ? linked : null);

  const open = async (id) => {
    try { setEditing(await coachService.course(id)); } catch (err) { toast.error(errorMessage(err, tl('Could not open the course'))); }
  };
  const close = () => { setEditing(null); if (courseId) navigate('/coach/courses', { replace: true }); };

  return (
    <Page>
      <PageHeader title={tl('My courses')}
        subtitle={tl('Write a programme day by day, then send it for review. The gym checks it and publishes it to members.')}>
        <button type="button" className={btn.primary} onClick={() => setEditing(NEW_COURSE)}>{tl('+ New course')}</button>
      </PageHeader>
      <Tabs value={status} onChange={setStatus} options={FILTERS} />

      {loading && !data ? <Skeleton rows={3} h="h-28" /> : list.length === 0 ? (
        <Empty>{status ? tl('No courses here.') : tl('No courses yet — create your first programme.')}</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => open(c.id)}
              className={`${card} text-left overflow-hidden flex flex-col hover:border-primary-container/60`}>
              <div className="relative h-32 bg-[#131316]">
                {c.cover_image_url && <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />}
                <span className="absolute top-2 left-2"><Chip tone={STATUS_TONE[c.status]}>{tl(c.status_label)}</Chip></span>
              </div>
              <div className="p-4 flex flex-col gap-1 flex-1 min-w-0">
                <div className="text-on-surface font-bold break-words">{c.title}</div>
                <div className="text-[11px] text-on-surface-variant">{categoryLabel(c.category)} · {c.level_label}</div>
                {c.status === 'draft' && c.review_note && (
                  <div className="text-[12px] text-amber-300 line-clamp-2">{tl('Gym asked for changes:')} {c.review_note}</div>
                )}
                {c.status === 'pending' && <div className="text-[12px] text-amber-300">{tl('Waiting for the gym to review')}</div>}
                <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#1a1a1e] text-[12px]">
                  <span className="text-primary font-bold">{Number(c.price) > 0 ? formatSAR(c.price) : tl('Free')}</span>
                  <span className="text-on-surface-variant">{tl('{0} lessons · {1} enrolled', { 0: c.module_count ?? 0, 1: c.total_enrolled })}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {shown && <CourseEditor key={shown.id || 'new'} course={shown} mode="coach" api={API} categories={data?.categories}
        onClose={close} onSaved={refetch} />}
    </Page>
  );
}
