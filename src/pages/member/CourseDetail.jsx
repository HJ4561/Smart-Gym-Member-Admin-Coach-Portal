// src/pages/member/CourseDetail.jsx
// One course before (or after) enrolling: what it is, who teaches it, and the full day-by-day
// syllabus. Enrol / buy from here; enrolled members jump straight into the player.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import PayDialog from '../../components/payments/PayDialog';
import { categoryLabel } from '../../components/courses/courseOptions';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import { getLocalized, tl } from '../../i18n';

const LEVEL = { beginner: tl('Beginner'), intermediate: tl('Intermediate'), advanced: tl('Advanced'), all_levels: tl('All levels') };

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: c, loading, error, refetch } = useApi(() => catalogService.course(id), [id], { showError: false });

  const weeks = useMemo(() => {
    const out = new Map();
    (c?.modules || []).forEach((m) => {
      if (!out.has(m.week_number)) out.set(m.week_number, []);
      out.get(m.week_number).push(m);
    });
    return [...out.entries()].sort((a, b) => a[0] - b[0]);
  }, [c]);

  const openPlayer = () => navigate(`/dashboard/player/${c.id}`);
  const enroll = async () => {
    if (!c.free_for_me) { setBuying(true); return; }
    setBusy(true);
    try {
      await catalogService.enroll(c.id);
      toast.success(tl('Enrolled in {0}! Opening player...', { 0: c.title }));
      openPlayer();
    } catch (e) {
      if (e.response?.status === 402) setBuying(true);
      else toast.error(errorMessage(e, tl('Failed to enroll')));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !c) {
    return <div className="w-full px-space-xl py-space-xl flex flex-col gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-surface-container animate-pulse" />)}</div>;
  }
  if (error || !c) {
    return (
      <div className="w-full px-space-xl py-space-xl">
        <div className="rounded-xl bg-surface-container p-10 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">menu_book</span>
          <p className="text-on-surface font-bold">{tl('This course isn’t available.')}</p>
          <Link to="/dashboard/courses" className="text-primary font-bold">{tl('Browse courses →')}</Link>
        </div>
      </div>
    );
  }

  const price = Number(c.price) > 0 ? formatSAR(c.price) : tl('Free');
  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="text-primary text-[13px] font-bold w-fit">{tl('← Back')}</button>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden bg-surface-container border border-surface-container-high grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div className="relative min-h-48 bg-surface-container-high">
          {c.cover_image_url && <img src={c.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative p-5 sm:p-6 flex flex-col justify-end h-full gap-2 min-h-48">
            <span className="text-primary text-[11px] font-bold uppercase tracking-widest">{categoryLabel(c.category)} · {LEVEL[c.level] || c.level}</span>
            <h1 className="font-headline-lg text-headline-lg text-white uppercase tracking-wide break-words">{getLocalized(c, 'title')}</h1>
            {c.subtitle && <p className="text-white/80">{getLocalized(c, 'subtitle')}</p>}
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="text-[28px] font-bold text-on-surface">{price}</div>
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            <div><dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Length')}</dt>
              <dd className="text-on-surface">{tl('{0} weeks', { 0: c.duration_weeks })}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Days per week')}</dt>
              <dd className="text-on-surface">{c.days_per_week}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Per session')}</dt>
              <dd className="text-on-surface">{tl('{0} min', { 0: c.estimated_minutes_per_session })}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">{tl('Lessons')}</dt>
              <dd className="text-on-surface">{c.modules?.length || 0}</dd></div>
          </dl>
          {c.enrolled ? (
            <button type="button" onClick={openPlayer}
              className="w-full py-3 rounded-lg bg-primary-container text-on-primary-container font-bold uppercase tracking-wider text-[12px]">
              {tl('Open in player')}
            </button>
          ) : (
            <button type="button" onClick={enroll} disabled={busy}
              className="w-full py-3 rounded-lg bg-primary-container text-on-primary-container font-bold uppercase tracking-wider text-[12px] disabled:opacity-50">
              {c.free_for_me ? tl('Enroll free') : tl('Buy for {0}', { 0: price })}
            </button>
          )}
          {c.trainer && (
            <Link to={`/dashboard/trainers/${c.trainer.id}`} className="flex items-center gap-3 pt-3 border-t border-surface-container-high">
              {c.trainer.photo_url
                ? <img src={c.trainer.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <span className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary grid place-items-center material-symbols-outlined">person</span>}
              <span className="min-w-0">
                <span className="block text-on-surface font-bold truncate">{c.trainer.user?.full_name}</span>
                <span className="block text-[12px] text-on-surface-variant truncate">{getLocalized(c.trainer, 'title')}</span>
              </span>
            </Link>
          )}
        </div>
      </motion.section>

      {c.description && (
        <section className="rounded-xl bg-surface-container border border-surface-container-high p-5">
          <h2 className="text-on-surface font-bold uppercase tracking-wider text-[13px] mb-2">{tl('About this course')}</h2>
          <p className="text-on-surface-variant whitespace-pre-line break-words">{getLocalized(c, 'description')}</p>
        </section>
      )}

      <section className="rounded-xl bg-surface-container border border-surface-container-high p-5 flex flex-col gap-4" aria-labelledby="syllabus-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="syllabus-title" className="text-on-surface font-bold uppercase tracking-wider text-[13px]">{tl('Syllabus')}</h2>
          {!c.enrolled && <span className="text-[12px] text-on-surface-variant">{tl('Videos and notes unlock when you enroll.')}</span>}
        </div>
        {weeks.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant">{tl('No lessons yet.')}</p>
        ) : weeks.map(([week, mods]) => (
          <div key={week} className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-primary font-bold">{tl('Week {0}', { 0: week })}</h3>
            <ol className="flex flex-col gap-1">
              {mods.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-lg bg-surface-container-low px-3 py-2">
                  <span className="text-[11px] font-bold text-on-surface-variant w-12 shrink-0 pt-0.5">{tl('Day {0}', { 0: m.day_number })}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-on-surface text-[14px] font-bold break-words">{m.title}</span>
                    {m.description && <span className="block text-[12px] text-on-surface-variant line-clamp-2">{m.description}</span>}
                  </span>
                  <span className="text-[11px] text-on-surface-variant whitespace-nowrap flex items-center gap-1">
                    {!c.enrolled && <span className="material-symbols-outlined text-[14px]" aria-label={tl('Locked')}>lock</span>}
                    {tl('{0} min', { 0: m.duration_minutes })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <PayDialog
        request={buying ? { purpose: 'course', course_id: c.id } : null}
        title={getLocalized(c, 'title')}
        allowCredit
        onPaid={() => { toast.success(tl('Enrolled! Opening player...')); setBuying(false); openPlayer(); }}
        onClose={() => { setBuying(false); refetch(); }}
      />
    </div>
  );
}
