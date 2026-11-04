// src/components/courses/CourseEditor.jsx
// One course editor for the admin console and the coach portal.
//  · admin: picks the coach, publishes / sends back with a note / archives, featured + plan toggles.
//  · coach: writes drafts, sends them for review; once published, title and price are the gym's.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { BiInput, Drawer, ImageUploader } from '../site/SiteUi';
import { btn, inputCls, labelCls } from '../site/siteStyles';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';
import { COURSE_CATEGORIES, LEVELS, categoryLabel } from './courseOptions';

export function Field({ label, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-[13px] text-on-surface">
      <input type="checkbox" className="mt-1" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <span className="block text-[11px] text-on-surface-variant">{hint}</span>}</span>
    </label>
  );
}

/**
 * @param {'admin'|'coach'} mode
 * @param {object} api  {get?, create, update, remove, upload, submit?}
 * @param {Array} trainers  admin only: who can teach it
 */
export default function CourseEditor({ course, mode = 'admin', api, trainers = [], categories = COURSE_CATEGORIES, onClose, onSaved }) {
  const admin = mode === 'admin';
  const [f, setF] = useState(() => ({ ...course, trainer_id: course.trainer_id || trainers[0]?.id || '' }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);      // admin "send back" note (null = closed)
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));
  const setLesson = (i, k, v) => setF((p) => ({ ...p, modules: p.modules.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const move = (i, d) => setF((p) => {
    const m = [...p.modules];
    [m[i], m[i + d]] = [m[i + d], m[i]];
    return { ...p, modules: m };
  });
  const lockedLive = !admin && f.status === 'published';     // title + price belong to the gym once live
  const lockedReview = !admin && f.status === 'pending';      // waiting for the gym

  const body = () => {
    const b = {
      title: f.title, subtitle: f.subtitle, description: f.description, category: f.category, level: f.level,
      title_ar: f.title_ar || '', subtitle_ar: f.subtitle_ar || '', description_ar: f.description_ar || '',
      duration_weeks: f.duration_weeks, days_per_week: f.days_per_week,
      estimated_minutes_per_session: f.estimated_minutes_per_session, price: f.price || 0, promo_video_url: f.promo_video_url,
      modules: f.modules.map(({ id, title, title_ar, description, description_ar, week_number, day_number, duration_minutes,
        video_url, pdf_url }) => ({
        id, title, title_ar: title_ar || '', description, description_ar: description_ar || '', week_number, day_number,
        duration_minutes, video_url, pdf_url })),
    };
    if (admin) Object.assign(b, { trainer_id: f.trainer_id, is_included_with_pro: f.is_included_with_pro, is_featured: f.is_featured });
    return b;
  };

  const run = async (fn, done) => {
    setBusy(true);
    setErrors({});
    try {
      const row = await fn();
      setF((p) => ({ ...p, ...row }));
      toast.success(done(row));
      onSaved?.();
      return row;
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Could not save the course")));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = (status) => run(
    () => (f.id ? api.update(f.id, admin && status ? { ...body(), status } : body()) : api.create(body())),
    (row) => (f.id && status && status !== f.status ? tl("Course {0}", { 0: row.status_label.toLowerCase() }) : tl("Course saved")));

  const submit = async () => {          // coach: save, then send for review
    const saved = await save();
    if (saved) await run(() => api.submit(saved.id), () => tl("Sent to the gym for review"));
  };

  const sendBack = () => run(() => api.update(f.id, { status: 'draft', review_note: note }),
    () => tl("Sent back to the coach")).then((row) => row && setNote(null));

  const remove = async () => {
    if (!window.confirm(tl("Delete “{0}”? This can’t be undone.", { 0: f.title }))) return;
    try {
      await api.remove(f.id);
      toast.success(tl("Course deleted"));
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not delete the course")));
    }
  };

  const upload = async (file) => {
    try {
      const row = await api.upload(f.id, file);
      setF((p) => ({ ...p, cover_image_url: row.cover_image_url }));
      toast.success(tl("Cover updated"));
      onSaved?.();
    } catch (err) {
      toast.error(errorMessage(err, tl("Upload failed")));
      throw err;
    }
  };

  const subtitle = f.id
    ? tl("{0} · {1} enrolled", { 0: tl(f.status_label), 1: f.total_enrolled })
    : admin ? tl("Saved as a draft — members see it once you publish.")
      : tl("Saved as a draft. Send it for review when it’s ready — the gym publishes it.");

  return (
    <Drawer open title={f.id ? f.title : tl("New course")} onClose={onClose} subtitle={subtitle}
      footer={<>
        {f.id && !lockedReview && (
          <button type="button" className={btn.danger} onClick={remove}
            title={f.total_enrolled ? tl("Courses with enrolled members can’t be deleted — archive them instead.") : undefined}>
            {tl("Delete")}
          </button>
        )}
        <div className="flex-1" />
        {admin && f.id && f.status === 'pending' && note === null && (
          <button type="button" className={btn.ghost} disabled={busy} onClick={() => setNote('')}>{tl("Send back")}</button>
        )}
        {admin && f.id && f.status === 'published' && <button type="button" className={btn.ghost} disabled={busy} onClick={() => save('archived')}>{tl("Archive")}</button>}
        {admin && f.id && f.status === 'archived' && <button type="button" className={btn.ghost} disabled={busy} onClick={() => save('draft')}>{tl("Back to draft")}</button>}
        {!lockedReview && <button type="button" className={btn.ghost} disabled={busy} onClick={() => save()}>{busy ? tl("Saving…") : tl("Save")}</button>}
        {admin && f.id && f.status !== 'published' && <button type="button" className={btn.primary} disabled={busy} onClick={() => save('published')}>{tl("Publish")}</button>}
        {!admin && ['draft', 'archived'].includes(f.status) && (
          <button type="button" className={btn.primary} disabled={busy} onClick={submit}>{tl("Send for review")}</button>
        )}
      </>}>
      {lockedReview && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[12px] p-3">
          {tl("Waiting for the gym to review it. You can edit it again if they send it back.")}
        </p>
      )}
      {f.review_note && f.status === 'draft' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">{tl("Changes requested by the gym")}</div>
          <p className="text-[13px] text-on-surface mt-1 whitespace-pre-line">{f.review_note}</p>
        </div>
      )}
      {note !== null && (
        <div className="rounded-lg border border-[#26262b] bg-[#0e0e0f] p-3 flex flex-col gap-2">
          <Field label={tl("What should the coach change?")} error={errors.review_note}>
            <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2 justify-end">
            <button type="button" className={btn.ghost} onClick={() => setNote(null)}>{tl("Cancel")}</button>
            <button type="button" className={btn.primary} disabled={busy || !note.trim()} onClick={sendBack}>{tl("Send back to coach")}</button>
          </div>
        </div>
      )}
      {f.id ? (
        <ImageUploader label={tl("Cover")} url={f.cover_image_url} customized={!!f.cover_image_url} onUpload={upload} />
      ) : (
        <p className="text-[12px] text-on-surface-variant">{tl("You can add a cover image after the first save.")}</p>
      )}
      <fieldset disabled={lockedReview} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BiInput label={tl("Title")} form={f} field="title" errors={errors} required maxLength={120} readOnly={lockedLive}
          hint={lockedLive ? tl("The gym changes the title of a live course.") : undefined}
          className="md:col-span-2" onChange={(k, v) => set(k)(v)} />
        <BiInput label={tl("Subtitle")} form={f} field="subtitle" errors={errors} maxLength={200}
          className="md:col-span-2" onChange={(k, v) => set(k)(v)} />
        <BiInput label={tl("Description")} form={f} field="description" errors={errors} multiline rows={4} required
          className="md:col-span-2" onChange={(k, v) => set(k)(v)} />
        {admin && (
          <Field label={tl("Trainer")} error={errors.trainer_id}>
            <select className={inputCls} value={f.trainer_id} onChange={set('trainer_id')}>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.user_name}{t.is_active ? '' : tl(" (hidden)")}</option>)}
            </select></Field>
        )}
        <Field label={tl("Category")} error={errors.category}>
          <select className={inputCls} value={f.category} onChange={set('category')}>
            <option value="">{tl("Choose a category")}</option>
            {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </Field>
        <Field label={tl("Level")} error={errors.level}>
          <select className={inputCls} value={f.level} onChange={set('level')}>
            {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></Field>
        <Field label={tl("Price (SAR, 0 = free)")} error={errors.price}>
          <input className={inputCls} inputMode="decimal" value={f.price} onChange={set('price')} readOnly={lockedLive}
            title={lockedLive ? tl("The gym changes the price of a live course.") : undefined} /></Field>
        <Field label={tl("Weeks")} error={errors.duration_weeks}><input className={inputCls} type="number" min="1" max="104" value={f.duration_weeks} onChange={set('duration_weeks')} /></Field>
        <Field label={tl("Days per week")} error={errors.days_per_week}><input className={inputCls} type="number" min="1" max="7" value={f.days_per_week} onChange={set('days_per_week')} /></Field>
        <Field label={tl("Minutes per session")} error={errors.estimated_minutes_per_session}>
          <input className={inputCls} type="number" min="5" max="300" value={f.estimated_minutes_per_session} onChange={set('estimated_minutes_per_session')} /></Field>
        <Field label={tl("Promo video link")} error={errors.promo_video_url}><input className={inputCls} value={f.promo_video_url} onChange={set('promo_video_url')} placeholder="https://…" /></Field>
      </fieldset>
      {admin && (
        <div className="flex flex-col gap-2">
          <Toggle label={tl("Included with plans that include courses")} hint={tl("Those members enrol without paying.")} checked={f.is_included_with_pro} onChange={set('is_included_with_pro')} />
          <Toggle label={tl("Featured")} hint={tl("Shown first in the member portal.")} checked={f.is_featured} onChange={set('is_featured')} />
        </div>
      )}

      <fieldset disabled={lockedReview} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={labelCls}>{tl("Lessons ({0})", { 0: f.modules.length })}</span>
          <button type="button" className={btn.ghost}
            onClick={() => setF((p) => ({ ...p, modules: [...p.modules, { title: '', description: '', week_number: 1, day_number: 1, duration_minutes: 30, video_url: '', pdf_url: '' }] }))}>
            {tl("+ Add lesson")}
          </button>
        </div>
        {errors.modules && <span className="text-[11px] text-rose-400">{errors.modules}</span>}
        {f.modules.length === 0 && <p className="text-[12px] text-on-surface-variant">{tl("A course needs at least one lesson before it can be published.")}</p>}
        {f.modules.map((m, i) => (
          <div key={m.id ?? `new-${i}`} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-3 grid grid-cols-6 gap-2">
            <BiInput label={tl("Lesson {0}", { 0: i + 1 })} form={m} field="title" maxLength={200} className="col-span-6"
              onChange={(k, v) => setLesson(i, k, v)} />
            <Field label={tl("Week")} className="col-span-2 md:col-span-1"><input className={inputCls} type="number" min="1" value={m.week_number} onChange={(e) => setLesson(i, 'week_number', e.target.value)} /></Field>
            <Field label={tl("Day")} className="col-span-2 md:col-span-1"><input className={inputCls} type="number" min="1" max="7" value={m.day_number} onChange={(e) => setLesson(i, 'day_number', e.target.value)} /></Field>
            <Field label={tl("Min")} className="col-span-2 md:col-span-1"><input className={inputCls} type="number" min="1" value={m.duration_minutes} onChange={(e) => setLesson(i, 'duration_minutes', e.target.value)} /></Field>
            <Field label={tl("Video link")} className="col-span-6 md:col-span-3">
              <input className={inputCls} value={m.video_url} onChange={(e) => setLesson(i, 'video_url', e.target.value)} placeholder="https://…" /></Field>
            <Field label={tl("PDF link")} className="col-span-6 md:col-span-3">
              <input className={inputCls} value={m.pdf_url} onChange={(e) => setLesson(i, 'pdf_url', e.target.value)} placeholder="https://…" /></Field>
            <BiInput label={tl("Notes")} form={m} field="description" multiline rows={2} className="col-span-6"
              onChange={(k, v) => setLesson(i, k, v)} />
            <div className="col-span-6 flex gap-2 justify-end">
              <button type="button" className={btn.ghost} disabled={i === 0} onClick={() => move(i, -1)} aria-label={tl("Move lesson up")}>↑</button>
              <button type="button" className={btn.ghost} disabled={i === f.modules.length - 1} onClick={() => move(i, 1)} aria-label={tl("Move lesson down")}>↓</button>
              <button type="button" className={btn.danger}
                onClick={() => setF((p) => ({ ...p, modules: p.modules.filter((_, j) => j !== i) }))}>{tl("Remove")}</button>
            </div>
          </div>
        ))}
      </fieldset>
    </Drawer>
  );
}
