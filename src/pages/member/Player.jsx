import { useState, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import { workoutsService } from '../../services/workoutsService';
import PlayerHeader from '../../components/player/PlayerHeader';
import VideoStage from '../../components/player/VideoStage';
import CoachNotes from '../../components/player/CoachNotes';
import SyllabusSidebar from '../../components/player/SyllabusSidebar';
import SessionSummaryDock from '../../components/player/SessionSummaryDock';
import { errorMessage } from '../../utils/apiError';
import { getLocalized, tl } from '../../i18n';

export default function Player() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [starting, setStarting] = useState(false);
  const [logged, setLogged] = useState(false);
  const [selectedId, setSelectedId] = useState(null);   // day opened in the syllabus (null = current day)
  const [busy, setBusy] = useState(false);

  // Enrollments
  const { data: enrollments, loading: enrollmentsLoading, refetch: refetchEnrollments } = useApi(
    () => catalogService.enrollments(),
    []
  );
  const allEnrollments = useMemo(() => (Array.isArray(enrollments) ? enrollments : []), [enrollments]);

  const activeEnrollment = useMemo(() => {
    if (allEnrollments.length === 0) return null;
    if (courseId) {
      // Not enrolled in that course: no other course is opened in its place (see the redirect below).
      return allEnrollments.find((e) => e.course?.id === parseInt(courseId, 10)) || null;
    }
    return allEnrollments.find((e) => e.status === 'active') || allEnrollments[0];
  }, [allEnrollments, courseId]);

  const targetCourseId = activeEnrollment?.course?.id;

  // Player data
  const {
    data: playerData,
    loading: playerLoading,
    refetch: refetchPlayer,
  } = useApi(
    () => (targetCourseId ? catalogService.coursePlayer(targetCourseId) : null),
    [targetCourseId],
    { immediate: !!targetCourseId, showError: false }
  );

  const course = playerData?.course;
  const trainer = playerData?.trainer;
  const modules = useMemo(() => playerData?.modules || [], [playerData]);
  const enrollment = playerData?.enrollment;
  const currentModule = playerData?.current_module;
  const shown = modules.find((m) => m.id === selectedId) || modules.find((m) => m.id === currentModule?.id) || null;

  // A day can be completed once every earlier day is done (unless it isn't locked).
  const canComplete = (m) => !!m && !m.is_completed
    && (!m.is_locked_until_prev || modules.filter((x) => x.order < m.order).every((x) => x.is_completed));

  const openCourse = (id) => {
    setSelectedId(null);
    navigate(`/dashboard/player/${id}`);
  };

  const handleStartWorkout = async () => {
    if (!course) {
      toast.error(tl("No active course. Enroll in one from the Courses page."));
      return;
    }

    try {
      setStarting(true);
      await workoutsService.start({
        name: shown ? `${getLocalized(course, 'title')} — ${shown.title}` : getLocalized(course, 'title'),
      });

      toast.success(tl("Workout started! Log sets in Machine Guide or here."));
      setLogged(true);
      setTimeout(() => setLogged(false), 3000);
    } catch (e) {
      toast.error(errorMessage(e, tl('Couldn’t start the workout.')));
    } finally {
      setStarting(false);
    }
  };

  const markDone = async (m) => {
    if (!enrollment || !m) return;
    setBusy(true);
    try {
      await catalogService.completeModule(enrollment.id, m.id);
      toast.success(tl("“{0}” marked as done 🎉", { 0: m.title }));
      setSelectedId(null);   // jump to the next day
      refetchPlayer();
      refetchEnrollments();  // the course cards at the top show the new percentage
    } catch (e) {
      toast.error(errorMessage(e, tl("Couldn’t mark this day as done.")));
    } finally {
      setBusy(false);
    }
  };

  const undoDone = async (m) => {
    if (!enrollment || !m) return;
    if (!window.confirm(tl("Mark “{0}” as not done?", { 0: m.title }))) return;
    setBusy(true);
    try {
      await catalogService.uncompleteModule(enrollment.id, m.id);
      toast.success(tl("Day marked as not done"));
      refetchPlayer();
      refetchEnrollments();
    } catch (e) {
      toast.error(errorMessage(e, tl("Couldn’t undo that.")));
    } finally {
      setBusy(false);
    }
  };

  const handleBrowseCourses = () => navigate('/dashboard/courses');

  // A course the member hasn't joined: show its page (details, syllabus, enrol) instead.
  if (courseId && !enrollmentsLoading && Array.isArray(enrollments) && !activeEnrollment) {
    return <Navigate to={`/dashboard/courses/${courseId}`} replace />;
  }

  // ============================================
  // EMPTY STATE
  // ============================================
  if (!enrollmentsLoading && allEnrollments.length === 0) {
    return (
      <div className="w-full px-space-xl py-space-xl flex flex-col gap-space-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-surface-container-low rounded-xl max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 rounded-full bg-primary-container/15 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">
              play_circle
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide mb-3">
            {tl("No Active Course")}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto mb-6">
            {tl("Enroll in a course to unlock the guided player with workout tracking, exercise videos, and progress monitoring.")}
          </p>
          <button
            onClick={handleBrowseCourses}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-lg uppercase tracking-wider font-bold transition-all shadow-[0_0_20px_rgba(229,25,55,0.4)]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>{tl("Browse Courses")}</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-space-lg pb-space-3xl">
      <CourseSwitcher enrollments={allEnrollments} activeId={targetCourseId} onOpen={openCourse} />

      {playerLoading || enrollmentsLoading ? (
        <div className="flex flex-col gap-6">
          <div className="h-32 bg-surface-container rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            <div className="h-96 bg-surface-container rounded-xl animate-pulse" />
            <div className="h-96 bg-surface-container rounded-xl animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <PlayerHeader
            course={course}
            currentModule={shown}
            enrollment={enrollment}
            onLog={handleStartWorkout}
            logged={logged}
            starting={starting}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-space-lg items-start">
            <div className="flex flex-col gap-space-md min-w-0">
              <VideoStage key={shown?.id || 'course'} course={course} currentModule={shown} />
              {shown && (
                <DayActions module={shown} busy={busy} canComplete={canComplete(shown)}
                  onDone={() => markDone(shown)} onUndo={() => undoDone(shown)} />
              )}
              <CoachNotes trainer={trainer} course={course} />
            </div>

            <SyllabusSidebar
              modules={modules}
              enrollment={enrollment}
              selectedId={shown?.id}
              onSelect={(m) => setSelectedId(m.id)}
            />
          </div>

          <SessionSummaryDock
            onLog={handleStartWorkout}
            logged={logged}
          />
        </>
      )}
    </div>
  );
}

/** Every course the member is enrolled in, so they can switch between them. */
function CourseSwitcher({ enrollments, activeId, onOpen }) {
  return (
    <section aria-label={tl("My courses")} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-on-surface font-bold text-[14px] uppercase tracking-wider">
          {tl("My courses")} <span className="text-on-surface-variant font-normal">({enrollments.length})</span>
        </h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
        {enrollments.map((e) => {
          const active = e.course?.id === activeId;
          const pct = e.progress_percent || 0;
          return (
            <button key={e.id} type="button" onClick={() => onOpen(e.course?.id)} aria-current={active ? 'true' : undefined}
              className={`snap-start shrink-0 w-60 text-start rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
                active ? 'border-primary-container bg-primary-container/10' : 'border-surface-container-high bg-surface-container hover:border-outline'}`}>
              <span className="text-on-surface font-bold text-[14px] line-clamp-2 break-words">{getLocalized(e.course, 'title')}</span>
              <span className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>{e.status === 'completed' ? tl("Completed") : tl("{0}% done", { 0: pct })}</span>
                {active && <span className="text-primary font-bold">{tl("Open")}</span>}
              </span>
              <span className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <span className="block h-full bg-primary-container" style={{ width: `${pct}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Status of the open day and the explicit "done" / "undo" actions. */
function DayActions({ module: m, busy, canComplete, onDone, onUndo }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-surface-container border border-surface-container-high p-4">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-on-surface-variant">
          {tl("Week {0} · Day {1}", { 0: m.week_number, 1: m.day_number })}
        </div>
        <div className="text-on-surface font-bold break-words">{m.title}</div>
        <div className="text-[12px] text-on-surface-variant">
          {m.is_completed ? tl("You’ve finished this day.")
            : canComplete ? tl("Watch the session, train, then mark the day as done.")
              : tl("Finish the earlier days first — days unlock in order.")}
        </div>
      </div>
      {m.is_completed ? (
        <button type="button" disabled={busy} onClick={onUndo}
          className="shrink-0 inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-bold disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]">undo</span>{tl("Mark as not done")}
        </button>
      ) : (
        <button type="button" disabled={busy || !canComplete} onClick={onDone}
          className="shrink-0 inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg bg-primary-container text-on-primary-container text-[12px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined text-[18px]">{canComplete ? 'task_alt' : 'lock'}</span>
          {busy ? tl("Saving…") : tl("Mark day as done")}
        </button>
      )}
    </div>
  );
}
