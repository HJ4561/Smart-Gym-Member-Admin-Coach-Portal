// src/pages/coach/CoachVideos.jsx — Machine Guide videos by this coach.
// Basic = free for every member. Advanced / Premium = included in some membership plans,
// or bought one by one by members (the coach sets the price).
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { Field } from '../../components/courses/CourseEditor';
import { formatSAR } from '../../utils/money';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';
import { card, Chip, Page, Skeleton, Tabs, Tile, LIVE_MS } from './ui';

const TIERS = [
  ['basic', tl('Basic'), tl('Free for every member.'), 'bg-emerald-500/15 text-emerald-400'],
  ['advanced', tl('Advanced'), tl('Included with some plans, or bought.'), 'bg-sky-500/15 text-sky-300'],
  ['premium', tl('Premium'), tl('Top plans only, or bought.'), 'bg-amber-500/15 text-amber-300'],
];
const TONE = Object.fromEntries(TIERS.map(([k, , , t]) => [k, t]));
const LABEL = Object.fromEntries(TIERS.map(([k, l]) => [k, l]));
const NEW = { exercise_id: '', tier: 'basic', title: '', video_url: '', duration_minutes: 5, price: '', description: '', is_active: true };

export default function CoachVideos() {
  const [tier, setTier] = useState('');
  const [editing, setEditing] = useState(null);
  const { data, loading, refetch } = useApi(() => coachService.videos(), [], { poll: LIVE_MS });
  const { data: machines } = useApi(() => coachService.machines(), [], { poll: LIVE_MS });
  const all = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const list = all.filter((v) => !tier || v.tier === tier);
  const totals = useMemo(() => ({
    sold: all.reduce((a, v) => a + v.purchases, 0),
    revenue: all.reduce((a, v) => a + Number(v.revenue), 0),
  }), [all]);

  return (
    <Page>
      <PageHeader title={tl('Machine videos')}
        subtitle={tl('Teach members how to use each machine. Basic videos are free; Advanced and Premium videos are included with some plans or bought by members.')}>
        <button type="button" className={btn.primary} onClick={() => setEditing(NEW)} disabled={!machines?.length}>{tl('+ Add video')}</button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon="smart_display" label={tl('Videos')} value={all.length} />
        <Tile icon="lock_open" label={tl('Free (basic)')} value={all.filter((v) => v.tier === 'basic').length} tone="text-emerald-400" />
        <Tile icon="shopping_cart" label={tl('Bought by members')} value={totals.sold} />
        <Tile icon="payments" label={tl('Video sales')} value={formatSAR(totals.revenue)} tone="text-emerald-400" />
      </div>

      <Tabs value={tier} onChange={setTier} options={[['', tl('All')], ...TIERS.map(([k, l]) => [k, l])]} />

      {loading && !data ? <Skeleton /> : list.length === 0 ? (
        <Empty>{tier ? tl('No videos in this tier yet.') : tl('No videos yet — pick a machine and add your first how-to.')}</Empty>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setEditing({ ...v, price: v.tier === 'basic' ? '' : v.price })}
                className={`${card} w-full text-left p-4 flex flex-col gap-2 hover:border-primary-container/60 ${v.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-on-surface font-bold break-words">{v.title}</div>
                    <div className="text-[12px] text-on-surface-variant truncate">{v.exercise}{v.machine_id && ` · ${v.machine_id}`}</div>
                  </div>
                  <Chip tone={TONE[v.tier]}>{LABEL[v.tier]}</Chip>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-on-surface-variant mt-auto">
                  <span>{tl('{0} min', { 0: v.duration_minutes })}</span>
                  <span className="text-on-surface font-bold">{v.tier === 'basic' ? tl('Free') : formatSAR(v.price)}</span>
                  {v.tier !== 'basic' && <span>{tl('{0} sold', { 0: v.purchases })}</span>}
                  {!v.is_active && <Chip tone="bg-rose-500/15 text-rose-400">{tl('Hidden')}</Chip>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && <VideoEditor video={editing} machines={machines || []} onClose={() => setEditing(null)} onSaved={refetch}
        api={{ add: coachService.addVideo, update: coachService.updateVideo, remove: coachService.deleteVideo }} />}
    </Page>
  );
}

const FIELD_NAMES = {
  exercise_id: tl('Machine'), tier: tl('Who can watch it'), title: tl('Title'), video_url: tl('Video link'),
  duration_minutes: tl('Length (minutes)'), price: tl('Price'), description: tl('What members learn'),
};

/** The same rules as the server (apps/workouts/videos.py), checked before sending. */
function checkVideo(f, needsMachine) {
  const e = {};
  if (needsMachine && !f.exercise_id) e.exercise_id = tl('Choose the machine this video is for.');
  const title = (f.title || '').trim();
  if (!title) e.title = tl('Give the video a title.');
  else if (title.length < 3 || title.length > 120) e.title = tl('Title must be 3–120 characters.');
  const url = (f.video_url || '').trim();
  if (!url) e.video_url = tl('Paste the link to the video.');
  else if (!/^https:\/\/\S+\.\S+/.test(url) || url.length > 200) e.video_url = tl('Use the full link starting with https:// (e.g. YouTube or Vimeo).');
  const mins = Number(f.duration_minutes);
  if (!Number.isInteger(mins) || mins < 1 || mins > 180) e.duration_minutes = tl('Length must be a whole number from 1 to 180 minutes.');
  if (f.tier !== 'basic') {
    const price = Number(f.price);
    if (f.price === '' || f.price == null) e.price = tl('Set a price — Advanced and Premium videos are bought by members.');
    else if (!Number.isFinite(price) || price < 1 || price > 1000) e.price = tl('Price must be from SAR 1 to SAR 1000.');
  }
  if ((f.description || '').length > 2000) e.description = tl('Keep it under 2000 characters.');
  return e;
}

/** The reason under a field (linked to it for screen readers). */
function FieldMessage({ k, error }) {
  return error ? <span id={`vid-${k}-err`} role="alert" className="text-[12px] text-rose-400">{error}</span> : null;
}

/** Add / edit one video. Shared with the admin Machines page (`fixedMachine` there). */
export function VideoEditor({ video, machines = [], fixedMachine, api, onClose, onSaved }) {
  const [f, setF] = useState(video);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const needsMachine = !f.id && !fixedMachine;
  const set = (k) => (e) => {
    const value = e?.target ? e.target.value : e;
    setF((p) => ({ ...p, [k]: value }));
    setErrors((x) => (x[k] ? { ...x, [k]: undefined } : x));       // the message goes as soon as it's being fixed
  };
  // Red outline + screen-reader link to the message for a field with a problem.
  const invalid = (k) => ({
    'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `vid-${k}-err` : undefined, id: `vid-${k}`,
    className: `${inputCls} ${errors[k] ? '!border-rose-500 ring-1 ring-rose-500/40' : ''}`,
  });
  const focusFirst = (errs) => {
    const first = Object.keys(FIELD_NAMES).find((k) => errs[k]);
    if (first) setTimeout(() => document.getElementById(`vid-${first}`)?.focus(), 50);
  };

  const save = async (patch = {}) => {
    setFormError('');
    if (!patch.is_active && patch.is_active !== false) {
      const found = checkVideo(f, needsMachine);
      if (Object.keys(found).length) {
        setErrors(found);
        focusFirst(found);
        return;
      }
    }
    setBusy(true);
    setErrors({});
    const body = {
      tier: f.tier, title: (f.title || '').trim(), video_url: (f.video_url || '').trim(),
      duration_minutes: f.duration_minutes, price: f.tier === 'basic' ? 0 : f.price, description: f.description, ...patch,
    };
    try {
      if (f.id) await api.update(f.id, body);
      else await api.add(fixedMachine ? body : { ...body, exercise_id: f.exercise_id }, fixedMachine);
      toast.success(f.id ? tl('Video saved') : tl('Video added — members can see it now'));
      onSaved();
      onClose();
    } catch (err) {
      const fe = fieldErrors(err);
      const known = Object.fromEntries(Object.entries(fe).filter(([k]) => FIELD_NAMES[k]));
      setErrors(known);
      focusFirst(known);
      const other = err?.response?.data?.detail || Object.entries(fe).filter(([k]) => !FIELD_NAMES[k]).map(([, v]) => v).join(' ');
      if (other || !Object.keys(known).length) setFormError(other || errorMessage(err, tl('Could not save the video')));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(tl('Delete “{0}”?', { 0: f.title }))) return;
    try {
      await api.remove(f.id);
      toast.success(tl('Video deleted'));
      onSaved();
      onClose();
    } catch (err) { setFormError(errorMessage(err)); }
  };

  const problems = Object.entries(errors).filter(([, v]) => v);

  return (
    <Drawer open title={f.id ? f.title : tl('Add a machine video')} onClose={onClose}
      subtitle={f.id ? `${f.exercise} · ${LABEL[f.tier]}` : tl('Members see it on the machine’s page in the Machine Guide.')}
      footer={<>
        {f.id && <button type="button" className={btn.danger} disabled={busy} onClick={remove}>{tl('Delete')}</button>}
        {f.id && <button type="button" className={btn.ghost} disabled={busy} onClick={() => save({ is_active: !f.is_active })}>
          {f.is_active ? tl('Hide') : tl('Show again')}</button>}
        <div className="flex-1" />
        <button type="button" className={btn.ghost} onClick={onClose}>{tl('Cancel')}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={() => save()}>{busy ? tl('Saving…') : tl('Save')}</button>
      </>}>
      {(problems.length > 0 || formError) && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-[13px] text-rose-200">
          {formError && <p className="mb-1">{formError}</p>}
          {problems.length > 0 && (
            <>
              <p className="font-bold">{tl('Please fix {0} thing(s) before saving:', { 0: problems.length })}</p>
              <ul className="list-disc ps-5 mt-1">
                {problems.map(([k, v]) => (
                  <li key={k}>
                    <button type="button" className="underline text-start" onClick={() => document.getElementById(`vid-${k}`)?.focus()}>
                      {FIELD_NAMES[k]}</button>: {v}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {needsMachine && (
          <Field label={tl('Machine')} className="md:col-span-2">
            <select {...invalid('exercise_id')} value={f.exercise_id} onChange={set('exercise_id')}>
              <option value="">{tl('Choose a machine')}</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}{m.machine_id ? ` (${m.machine_id})` : ''}</option>)}
            </select>
            <FieldMessage k="exercise_id" error={errors.exercise_id} />
          </Field>
        )}
        <fieldset className="md:col-span-2 flex flex-col gap-2" disabled={f.purchases > 0}>
          <legend className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{tl('Who can watch it')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" id="vid-tier">
            {TIERS.map(([k, label, hint, tone]) => (
              <button key={k} type="button" role="radio" aria-checked={f.tier === k}
                onClick={() => { setF((p) => ({ ...p, tier: k })); setErrors((x) => ({ ...x, tier: undefined, price: undefined })); }}
                className={`text-left rounded-lg border p-3 ${f.tier === k ? 'border-primary-container bg-primary-container/10' : 'border-[#1a1a1e] bg-[#0e0e0f]'}`}>
                <Chip tone={tone}>{label}</Chip>
                <span className="block text-[11px] text-on-surface-variant mt-1">{hint}</span>
              </button>
            ))}
          </div>
          {f.purchases > 0 && <span className="text-[11px] text-on-surface-variant">{tl('Members bought this video, so its tier stays the same.')}</span>}
          <FieldMessage k="tier" error={errors.tier} />
        </fieldset>
        <Field label={tl('Title')} className="md:col-span-2">
          <input {...invalid('title')} value={f.title} onChange={set('title')} maxLength={120} placeholder={tl('e.g. Seat height and grip')} />
          <FieldMessage k="title" error={errors.title} />
        </Field>
        <Field label={tl('Video link')} className="md:col-span-2">
          <input {...invalid('video_url')} value={f.video_url} onChange={set('video_url')} inputMode="url" placeholder="https://youtu.be/…" />
          <FieldMessage k="video_url" error={errors.video_url} />
        </Field>
        <Field label={tl('Length (minutes)')}>
          <input {...invalid('duration_minutes')} type="number" min="1" max="180" step="1" value={f.duration_minutes} onChange={set('duration_minutes')} />
          <FieldMessage k="duration_minutes" error={errors.duration_minutes} />
        </Field>
        <Field label={f.tier === 'basic' ? tl('Price') : tl('Price to buy it (SAR)')}>
          <input {...invalid('price')} inputMode="decimal" value={f.tier === 'basic' ? tl('Free') : f.price} disabled={f.tier === 'basic'}
            onChange={set('price')} placeholder="15" />
          <FieldMessage k="price" error={errors.price} />
        </Field>
        <Field label={tl('What members learn (optional)')} className="md:col-span-2">
          <textarea {...invalid('description')} rows={3} value={f.description} onChange={set('description')} />
          <FieldMessage k="description" error={errors.description} />
        </Field>
      </div>
    </Drawer>
  );
}
