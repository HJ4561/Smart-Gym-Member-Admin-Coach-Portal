// src/pages/nutrition/NutritionPages.jsx — the nutritionist portal: today, clients (plans, scans, meals), profile.
// Plans and scans go straight to the member; the public profile waits for an admin.
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useListState';
import { nutritionistService as api } from '../../services/nutritionistService';
import { Drawer, Empty, ImageUploader, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { FilterBar } from '../../components/common/ListTools';
import SecuritySettings from '../../components/SecuritySettings';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { isAr, locale, tl } from '../../i18n';
import { card, Page, Section, Skeleton, Tile } from '../coach/ui';

const GOALS = [['hypertrophy', tl('Muscle gain')], ['fat_loss', tl('Fat loss')], ['recomp', tl('Body recomposition')],
  ['maintenance', tl('Maintenance')], ['endurance', tl('Endurance')]];
const STATUSES = [['active', tl('Active')], ['to_review', tl('To review')], ['paused', tl('Paused')],
  ['completed', tl('Completed')], ['archived', tl('Archived')]];
const STATUS_TONE = { active: 'bg-emerald-500/15 text-emerald-400', paused: 'bg-amber-500/15 text-amber-300',
  completed: 'bg-[#1a1a1e] text-on-surface-variant', archived: 'bg-[#1a1a1e] text-on-surface-variant' };
const day = (d) => new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {error && <span className="text-[11px] text-rose-400">{tl(error)}</span>}
    </label>
  );
}

function PlanChip({ plan }) {
  if (!plan) return null;
  const review = plan.status === 'active' && !plan.reviewed_at;
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${review ? 'bg-amber-500/15 text-amber-300' : STATUS_TONE[plan.status] || ''}`}>
      {review ? tl('To review') : tl(plan.status)}
    </span>
  );
}

// ------------------------------------------------------------------ today
export function NutritionHome() {
  const { data, loading } = useApi(() => api.me(), [], { poll: 30_000 });
  const { data: toReview } = useApi(() => api.plans({ status: 'to_review' }), [], { poll: 30_000 });
  const s = data?.stats || {};
  return (
    <Page>
      <PageHeader title={tl('Today')} subtitle={tl('New plans to set up, your clients and their progress. Plans you set go straight to the member.')} />
      {loading && !data ? <Skeleton rows={2} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label={tl('Active clients')} value={s.active_clients} icon="groups" />
          <Tile label={tl('Plans to review')} value={s.to_review} icon="pending_actions" tone="text-amber-400" />
          <Tile label={tl('Paused')} value={s.paused} icon="pause_circle" />
          <Tile label={tl('Awaiting payment')} value={s.awaiting_payment} icon="hourglass_top" />
        </div>
      )}
      {data?.profile?.pending_change && (
        <p className={`${card} p-4 text-[13px] text-amber-300`}>{tl('Your profile change is waiting for an admin. Members see your current profile until then.')}</p>
      )}
      <Section title={tl('Plans to review')} action={<Link to="/nutrition/clients?status=to_review" className="text-primary text-[12px] font-bold">{tl('See all')}</Link>}>
        {!toReview ? <Skeleton rows={2} h="h-12" /> : toReview.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant">{tl('You’re up to date — no new plans to set up.')}</p>
        ) : toReview.slice(0, 8).map((p) => (
          <Link key={p.id} to={`/nutrition/clients/${p.member_id}`}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded hover:bg-[#131316] text-[13px]">
            <span className="text-on-surface font-bold truncate">{p.member}</span>
            <span className="text-on-surface-variant truncate">{tl(p.goal_label)} · {new Date(p.created_at).toLocaleDateString(locale)}</span>
          </Link>
        ))}
      </Section>
    </Page>
  );
}

// ------------------------------------------------------------------ clients
export function NutritionClients() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const search = useDebounced(q);
  const { data, loading } = useApi(() => api.clients({ q: search || undefined, status: status || undefined }), [search, status], { poll: 30_000 });
  const rows = Array.isArray(data) ? data : [];
  return (
    <Page>
      <PageHeader title={tl('Clients')} subtitle={tl('Members with a plan from you. Open one to see their meals, scans and progress, and adjust their plan.')} />
      <FilterBar search={q} onSearch={setQ} placeholder={tl('Search name or email…')}
        tabs={{ value: status, onChange: setStatus, options: [{ value: '', label: tl('All') }, ...STATUSES.map(([value, label]) => ({ value, label }))] }}
        onClear={() => { setQ(''); setStatus(''); }} />
      {loading && !data ? <Skeleton /> : rows.length === 0 ? <Empty>{q || status ? tl('No clients match.') : tl('No clients yet. Members choose you from the Nutritionists page.')}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl('Client')}</th><th className="px-4 py-3">{tl('Goal')}</th><th className="px-4 py-3">{tl('Daily target')}</th>
                <th className="px-4 py-3">{tl('Meals logged (14 days)')}</th><th className="px-4 py-3">{tl('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/nutrition/clients/${r.id}`)} className="border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer">
                  <td className="px-4 py-3"><div className="text-on-surface font-bold">{r.name}</div><div className="text-[11px] text-on-surface-variant">{r.email}</div></td>
                  <td className="px-4 py-3 text-on-surface-variant">{r.plan ? tl(r.plan.goal_label) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.plan ? `${r.plan.target_calories} kcal · ${r.plan.target_protein_g} g` : '—'}</td>
                  <td className={`px-4 py-3 ${r.meals_14d ? 'text-on-surface' : 'text-amber-300'}`}>{r.meals_14d}</td>
                  <td className="px-4 py-3"><PlanChip plan={r.plan} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ one client
export function NutritionClient() {
  const { memberId } = useParams();
  const { data, loading, refetch } = useApi(() => api.client(memberId), [memberId], { poll: 30_000 });
  const [plan, setPlan] = useState(null);
  const [scan, setScan] = useState(false);
  if (loading && !data) return <Page><Skeleton rows={4} /></Page>;
  if (!data) return <Page><Empty>{tl('Client not found.')}</Empty></Page>;
  const m = data.member;
  const t = data.last_14_days;
  const pct = (v, target) => (v && target ? Math.round((v / target) * 100) : null);
  return (
    <Page>
      <PageHeader title={m.name} subtitle={`${m.email}${m.phone ? ` · ${m.phone}` : ''}${m.plan ? ` · ${m.plan}` : ''}`}>
        <Link to="/nutrition/clients" className={btn.ghost}>{tl('All clients')}</Link>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label={tl('Days logged (of 14)')} value={t.days_logged} icon="event_available" />
        <Tile label={tl('Average calories')} value={t.avg_calories != null ? `${Math.round(t.avg_calories)}${t.target_calories ? ` / ${t.target_calories}` : ''}` : '—'} icon="local_fire_department"
          tone={pct(t.avg_calories, t.target_calories) && Math.abs(pct(t.avg_calories, t.target_calories) - 100) > 15 ? 'text-amber-400' : ''} />
        <Tile label={tl('Average protein (g)')} value={t.avg_protein_g != null ? `${t.avg_protein_g}${t.target_protein_g ? ` / ${t.target_protein_g}` : ''}` : '—'} icon="egg" />
        <Tile label={tl('Average water (ml)')} value={t.avg_water_ml ?? '—'} icon="water_drop" />
      </div>

      <Section title={tl('Plans')}>
        {data.plans.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('No plans.')}</p> : data.plans.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded border border-[#1a1a1e] text-[13px]">
            <div className="flex-1 min-w-0">
              <div className="text-on-surface font-bold">{p.name} <PlanChip plan={p} /></div>
              <div className="text-on-surface-variant">{tl(p.goal_label)} · {p.target_calories} kcal · P {p.target_protein_g} g · C {p.target_carbs_g} g · F {p.target_fats_g} g · {p.target_water_ml} ml</div>
              {p.notes && <div className="text-[12px] text-on-surface-variant mt-1 whitespace-pre-line">{p.notes}</div>}
            </div>
            {p.status !== 'pending_payment' && <button type="button" className={btn.primary} onClick={() => setPlan(p)}>{p.reviewed_at ? tl('Adjust') : tl('Set up plan')}</button>}
          </div>
        ))}
      </Section>

      <Section title={tl('Body scans')} action={<button type="button" className={btn.ghost} onClick={() => setScan(true)}>{tl('+ Add result')}</button>}>
        {data.scans.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('No scans yet.')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="py-2 pr-3">{tl('Date')}</th><th className="py-2 pr-3">{tl('Weight (kg)')}</th><th className="py-2 pr-3">{tl('Body fat %')}</th>
                <th className="py-2 pr-3">{tl('Lean mass (kg)')}</th><th className="py-2">{tl('Notes')}</th></tr></thead>
              <tbody>{data.scans.map((s) => (
                <tr key={s.id} className="border-t border-[#1a1a1e]">
                  <td className="py-2 pr-3">{new Date(s.scan_date).toLocaleDateString(locale)}</td><td className="py-2 pr-3">{s.weight_kg}</td>
                  <td className="py-2 pr-3">{s.body_fat_percent}</td><td className="py-2 pr-3">{s.lean_mass_kg}</td>
                  <td className="py-2 text-on-surface-variant">{s.notes || '—'}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={tl('Meals, last 14 days')}>
        {data.days.length === 0 ? <p className="text-[13px] text-on-surface-variant">{tl('Nothing logged yet.')}</p> : data.days.map((d) => (
          <details key={d.date} className="border-t border-[#1a1a1e] first:border-0 py-2">
            <summary className="cursor-pointer flex flex-wrap gap-3 text-[13px]">
              <span className="text-on-surface font-bold w-28">{day(d.date)}</span>
              <span>{d.calories} kcal</span><span className="text-on-surface-variant">P {d.protein_g} · C {d.carbs_g} · F {d.fats_g}</span>
              <span className="text-on-surface-variant">{d.water_ml} ml</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-[12px] text-on-surface-variant">
              {d.meals.map((meal) => <li key={meal.id}>{tl(meal.meal_label)} · {meal.description || '—'} · {meal.calories} kcal</li>)}
            </ul>
          </details>
        ))}
      </Section>

      {plan && <PlanEditor plan={plan} onClose={() => setPlan(null)} onSaved={() => { setPlan(null); refetch(); }} />}
      {scan && <ScanEditor memberId={m.id} onClose={() => setScan(false)} onSaved={() => { setScan(false); refetch(); }} />}
    </Page>
  );
}

function PlanEditor({ plan, onClose, onSaved }) {
  const [f, setF] = useState(plan);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.updatePlan(plan.id, { name: f.name, goal: f.goal, status: f.status, notes: f.notes,
        target_calories: f.target_calories, target_protein_g: f.target_protein_g, target_carbs_g: f.target_carbs_g,
        target_fats_g: f.target_fats_g, target_water_ml: f.target_water_ml, cycle_weeks: f.cycle_weeks });
      toast.success(tl('Plan saved — the member has been told'));
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not save the plan')));
    } finally {
      setBusy(false);
    }
  };
  const num = (k, label) => (
    <Field label={label} error={errors[k]}><input className={inputCls} type="number" value={f[k]} onChange={set(k)} /></Field>
  );
  return (
    <Drawer open title={plan.member} subtitle={tl('Daily targets and notes. Saving tells the member.')} onClose={onClose}
      footer={<><div className="flex-1" /><button type="button" className={btn.ghost} onClick={onClose}>{tl('Cancel')}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl('Saving…') : tl('Save plan')}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={tl('Plan name')} error={errors.name} className="md:col-span-2"><input className={inputCls} value={f.name} onChange={set('name')} maxLength={120} /></Field>
        <Field label={tl('Goal')} error={errors.goal}>
          <select className={inputCls} value={f.goal} onChange={set('goal')}>{GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label={tl('Status')} error={errors.status}>
          <select className={inputCls} value={f.status} onChange={set('status')}>
            {STATUSES.filter(([v]) => v !== 'to_review').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        {num('target_calories', tl('Calories (kcal)'))}{num('target_protein_g', tl('Protein (g)'))}
        {num('target_carbs_g', tl('Carbs (g)'))}{num('target_fats_g', tl('Fats (g)'))}
        {num('target_water_ml', tl('Water (ml)'))}{num('cycle_weeks', tl('Cycle (weeks)'))}
        <Field label={tl('Notes for the member')} error={errors.notes} className="md:col-span-2">
          <textarea className={inputCls} rows={5} value={f.notes} onChange={set('notes')} maxLength={4000} /></Field>
      </div>
    </Drawer>
  );
}

function ScanEditor({ memberId, onClose, onSaved }) {
  const [f, setF] = useState({ weight_kg: '', body_fat_percent: '', lean_mass_kg: '', fat_mass_kg: '', visceral_fat_kg: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      await api.addScan(memberId, f);
      toast.success(tl('Scan saved — the member has been told'));
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not save')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open title={tl('Add body scan result')} onClose={onClose}
      footer={<><div className="flex-1" /><button type="button" className={btn.ghost} onClick={onClose}>{tl('Cancel')}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl('Saving…') : tl('Save')}</button></>}>
      <div className="grid grid-cols-2 gap-3">
        {[['weight_kg', tl('Weight (kg)')], ['body_fat_percent', tl('Body fat %')], ['lean_mass_kg', tl('Lean mass (kg)')],
          ['fat_mass_kg', tl('Fat mass (kg)')], ['visceral_fat_kg', tl('Visceral fat (kg, optional)')]].map(([k, l]) => (
          <Field key={k} label={l} error={errors[k]}><input className={inputCls} inputMode="decimal" value={f[k]} onChange={set(k)} /></Field>
        ))}
        <Field label={tl('Notes')} error={errors.notes} className="col-span-2"><textarea className={inputCls} rows={3} value={f.notes} onChange={set('notes')} /></Field>
      </div>
    </Drawer>
  );
}

// ------------------------------------------------------------------ profile
export function NutritionProfile() {
  const { data, refetch } = useApi(() => api.me(), []);
  return (
    <Page>
      <PageHeader title={tl('Profile & security')} subtitle={tl('What members read when they choose a nutritionist. Changes go live once an admin approves them.')} />
      {!data ? <Skeleton rows={2} h="h-40" /> : <ProfileForm key={JSON.stringify(data.profile.pending_change)} profile={data.profile} onSaved={refetch} />}
      <SecuritySettings />
    </Page>
  );
}

function ProfileForm({ profile, onSaved }) {
  const start = { ...profile, ...(profile.pending_change || {}) };
  const [f, setF] = useState(() => ({ ...start, specialties: (start.specialties || []).join(', '),
    specialties_ar: (start.specialties_ar || []).join('، ') }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.updateMe({ title: f.title, title_ar: f.title_ar || '', credentials: f.credentials || '',
        credentials_ar: f.credentials_ar || '', bio: f.bio || '', bio_ar: f.bio_ar || '', specialties: f.specialties,
        specialties_ar: f.specialties_ar, years_experience: f.years_experience, hourly_rate: f.hourly_rate });
      toast.success(res.detail ? tl(res.detail) : tl('Nothing changed'), { duration: 6000 });
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not save')));
    } finally {
      setBusy(false);
    }
  };
  const accepting = async (on) => {
    try { await api.updateMe({ is_accepting_clients: on }); toast.success(on ? tl('Taking new clients') : tl('Not taking new clients')); onSaved(); }
    catch (err) { toast.error(errorMessage(err)); }
  };
  const upload = async (file) => {
    try { const res = await api.uploadPhoto(file); toast.success(tl(res.detail)); onSaved(); }
    catch (err) { toast.error(errorMessage(err, tl('Upload failed'))); throw err; }
  };
  return (
    <Section>
      {profile.pending_change && <p className="text-[12px] text-amber-300">{tl('A change is waiting for an admin — the form shows it. Members see your current profile until it’s approved.')}</p>}
      <label className="flex items-center gap-2 text-[13px] text-on-surface">
        <input type="checkbox" checked={!!profile.is_accepting_clients} onChange={(e) => accepting(e.target.checked)} />
        {tl('Taking new clients (changes straight away)')}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <div className="max-w-[200px]"><ImageUploader label={tl('Photo')} aspect="aspect-square" url={start.photo_url} customized={!!start.photo_url} onUpload={upload} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={tl('Title')} error={errors.title}><input className={inputCls} value={f.title || ''} onChange={set('title')} maxLength={120} /></Field>
          <Field label={tl('Title (Arabic)')} error={errors.title_ar}><input className={`${inputCls} text-right`} dir="rtl" value={f.title_ar || ''} onChange={set('title_ar')} maxLength={120} /></Field>
          <Field label={tl('Credentials')} error={errors.credentials}><input className={inputCls} value={f.credentials || ''} onChange={set('credentials')} placeholder="RD, CSSD" /></Field>
          <Field label={tl('Years of experience')} error={errors.years_experience}><input className={inputCls} type="number" min="0" max="60" value={f.years_experience ?? ''} onChange={set('years_experience')} /></Field>
          <Field label={tl('Consultation fee (SAR)')} error={errors.hourly_rate}><input className={inputCls} inputMode="decimal" value={f.hourly_rate ?? ''} onChange={set('hourly_rate')} /></Field>
          <Field label={tl('Specialties (comma-separated)')} error={errors.specialties}><input className={inputCls} value={f.specialties} onChange={set('specialties')} /></Field>
          <Field label={tl('About you')} error={errors.bio} className="md:col-span-2"><textarea className={inputCls} rows={4} value={f.bio || ''} onChange={set('bio')} /></Field>
          <Field label={tl('About you (Arabic)')} error={errors.bio_ar} className="md:col-span-2"><textarea className={`${inputCls} text-right`} dir="rtl" rows={4} value={f.bio_ar || ''} onChange={set('bio_ar')} /></Field>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl('Sending…') : tl('Send for approval')}</button>
        <span className="text-[12px] text-on-surface-variant">{tl('Live now: {0} · {1}', { 0: (isAr && profile.title_ar) || profile.title, 1: formatSAR(profile.hourly_rate) })}</span>
      </div>
    </Section>
  );
}
