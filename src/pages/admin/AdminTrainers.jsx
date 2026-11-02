// src/pages/admin/AdminTrainers.jsx
// Trainers (profiles shown to members, verification, visibility) and the course catalogue
// (draft → published → archived, lessons, cover). Weekly hours live on Trainer Hours.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import CourseEditor from '../../components/courses/CourseEditor';
import { NEW_COURSE, STATUS_TONE, categoryLabel } from '../../components/courses/courseOptions';
import { formatSAR } from '../../utils/money';
import PersonEditor from '../../components/admin/PersonEditor';

const TRAINER_API = {
  create: (b) => adminService.createTrainer(b),
  update: (id, b) => adminService.updateTrainer(id, b),
  upload: (id, f) => adminService.uploadTrainerPhoto(id, f),
  remove: (id) => adminService.deleteTrainer(id),
  portalAccess: (id, body) => adminService.trainerPortalAccess(id, body),
};
import { errorMessage } from '../../utils/apiError';
import { tl } from '../../i18n';

const TRAINER_FILTERS = [['', tl("All")], ['verified', tl("Verified")], ['unverified', tl("Not verified")], ['hidden', tl("Hidden")]];
const COURSE_FILTERS = [['', tl("All")], ['published', tl("Published")], ['draft', tl("Drafts")], ['pending', tl("In review")], ['archived', tl("Archived")]];
const COURSE_API = {
  create: (b) => adminService.createCourse(b),
  update: (id, b) => adminService.updateCourse(id, b),
  remove: (id) => adminService.deleteCourse(id),
  upload: (id, f) => adminService.uploadCourseCover(id, f),
};

export default function AdminTrainers() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'courses' ? 'courses' : 'trainers');
  const { data: tStats, refetch: refetchTStats } = useApi(() => adminService.trainerStats(), []);
  const { data: cStats, refetch: refetchCStats } = useApi(() => adminService.courseStats(), []);

  const tiles = [
    [tl("Trainers"), tStats?.total], [tl("Verified"), tStats?.verified], [tl("Taking clients"), tStats?.accepting],
    [tl("Published courses"), cStats?.published], [tl("Enrolments"), cStats?.enrollments],
    [tl("Course sales"), cStats ? formatSAR(cStats.course_revenue) : undefined],
  ];

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <PageHeader title={tl("Trainers & Courses")} subtitle={tl("Who members can book, and the programmes they can buy.")}>
        <Link to="/admin/trainer-hours" className={btn.ghost}>{tl("Weekly hours & 1:1 prices")}</Link>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg px-4 py-3">
            <div className="text-[22px] font-bold text-on-surface">{value ?? '—'}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-[#0e0e0f] border border-[#1a1a1e] p-1 rounded-lg w-fit" role="tablist">
        {[['trainers', tl("Trainers")], ['courses', tl("Courses")]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${
              tab === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {label}
            {id === 'courses' && cStats?.pending > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-black text-[10px] grid place-items-center">{cStats.pending}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'trainers'
        ? <TrainersTab onChanged={refetchTStats} />
        : <CoursesTab onChanged={refetchCStats} initialStatus={params.get('status') || ''} pending={cStats?.pending || 0} />}
    </div>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(([id, label]) => (
        <button key={id || 'all'} type="button" onClick={() => onChange(id)}
          className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${
            value === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// TRAINERS
// ============================================================
const NEW_TRAINER = {
  email: '', first_name: '', last_name: '', phone: '', title: '', credentials: '', bio: '', specialties: [],
  years_experience: 0, hourly_rate: '', is_verified: false, is_accepting_clients: true, offers_1on1: true, is_active: true,
};

function TrainersTab({ onChanged }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);   // trainer row, or NEW_TRAINER
  const { data, loading, refetch } = useApi(
    () => adminService.trainersAdmin({ search: search || undefined, status: status || undefined }), [search, status]);
  const list = Array.isArray(data) ? data : [];

  const saved = () => { refetch(); onChanged(); };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Chips options={TRAINER_FILTERS} value={status} onChange={setStatus} />
        <div className="flex-1" />
        <input className={`${inputCls} md:w-64`} value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={tl("Search name, email, title…")} aria-label={tl("Search trainers")} />
        <button type="button" className={btn.primary} onClick={() => setEditing(NEW_TRAINER)}>{tl("+ Add trainer")}</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-[#0e0e0f] rounded-lg animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <Empty>{search || status ? tl("No trainers match.") : tl("No trainers yet — add your first one.")}</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((t) => (
            <button key={t.id} type="button" onClick={() => setEditing(t)}
              className={`text-left bg-[#0e0e0f] border border-[#1a1a1e] hover:border-primary-container/60 rounded-lg p-4 flex flex-col gap-3 ${t.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                {t.photo_url
                  ? <img src={t.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                  : <div className="w-12 h-12 rounded bg-primary-container/20 text-primary grid place-items-center font-bold">{t.initials}</div>}
                <div className="min-w-0 flex-1">
                  <div className="text-on-surface font-bold truncate flex items-center gap-1">
                    {t.user_name}
                    {t.is_verified && <span className="material-symbols-outlined text-primary text-[16px]" title={tl("Verified")}>verified</span>}
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">{t.title}</div>
                </div>
                {!t.is_active && <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[9px] font-bold uppercase">{tl("Hidden")}</span>}
              </div>
              {t.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.specialties.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-[#131316] text-on-surface-variant text-[10px]">{s}</span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-auto border-t border-[#1a1a1e] text-[12px]">
                <Mini label={tl("1:1 rate")} value={t.offers_1on1 ? `${formatSAR(t.hourly_rate)}/h` : 'No 1:1'} />
                <Mini label={tl("Courses")} value={t.courses} />
                <Mini label={tl("Upcoming")} value={t.upcoming_sessions} />
              </div>
              <div className="text-[11px] text-on-surface-variant">
                {t.total_reviews ? tl("★ {0} · {1} reviews", { 0: t.rating.toFixed(1), 1: t.total_reviews }) : tl("No reviews yet")}
                {!t.is_accepting_clients && tl(" · not taking new clients")}
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && <PersonEditor person={editing} kind="trainer" api={TRAINER_API} onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="text-on-surface font-bold">{value}</div>
    </div>
  );
}

// ============================================================
// COURSES
// ============================================================
function CoursesTab({ onChanged, initialStatus = '', pending = 0 }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(null);
  const { data, loading, refetch } = useApi(
    () => adminService.coursesAdmin({ q: q || undefined, status: status || undefined }), [q, status]);
  const { data: trainers } = useApi(() => adminService.trainersAdmin(), []);
  const list = Array.isArray(data) ? data : [];

  const open = async (c) => {
    try {
      setEditing(await adminService.courseAdmin(c.id));
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not open the course")));
    }
  };
  const saved = () => { refetch(); onChanged(); };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Chips options={COURSE_FILTERS.map(([id, label]) => [id, id === 'pending' && pending ? `${label} (${pending})` : label])}
          value={status} onChange={setStatus} />
        <div className="flex-1" />
        <input className={`${inputCls} md:w-64`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tl("Search title, category…")} aria-label={tl("Search courses")} />
        <button type="button" className={btn.primary} onClick={() => setEditing(NEW_COURSE)}
          disabled={!trainers?.length} title={trainers?.length ? undefined : tl("Add a trainer first")}>{tl("+ New course")}</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-60 bg-[#0e0e0f] rounded-lg animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <Empty>{q || status ? tl("No courses match.") : tl("No courses yet.")}</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => open(c)}
              className="text-left bg-[#0e0e0f] border border-[#1a1a1e] hover:border-primary-container/60 rounded-lg overflow-hidden flex flex-col">
              <div className="relative h-36 bg-[#131316]">
                {c.cover_image_url && <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_TONE[c.status]}`}>{tl(c.status_label)}</span>
                {c.is_featured && <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-amber-300 text-[9px] font-bold uppercase">{tl("Featured")}</span>}
              </div>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <div className="text-on-surface font-bold">{c.title}</div>
                <div className="text-[11px] text-on-surface-variant">{categoryLabel(c.category)} · {c.level_label} · {c.trainer_name}</div>
                {c.status === 'pending' && c.submitted_at && (
                  <div className="text-[11px] text-amber-300">{tl("Sent for review {0}", { 0: new Date(c.submitted_at).toLocaleDateString() })}</div>
                )}
                <div className="flex items-center justify-between pt-3 mt-auto border-t border-[#1a1a1e] text-[12px]">
                  <span className="text-primary font-bold">{Number(c.price) > 0 ? formatSAR(c.price) : tl("Free")}{c.is_included_with_pro && tl(" · in plan")}</span>
                  <span className="text-on-surface-variant">{c.module_count}{' '}{tl("lessons ·")}{' '}{c.total_enrolled} enrolled</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && <CourseEditor course={editing} mode="admin" api={COURSE_API} trainers={trainers || []}
        onClose={() => setEditing(null)} onSaved={saved} />}
    </>
  );
}
