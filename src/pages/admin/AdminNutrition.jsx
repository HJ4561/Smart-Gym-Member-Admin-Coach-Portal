// src/pages/admin/AdminNutrition.jsx
// Nutritionists shown to members, the plans members request (starter targets until reviewed)
// and body-scan results.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import PersonEditor from '../../components/admin/PersonEditor';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl, locale } from '../../i18n';

const NUTRITIONIST_API = {
  create: (b) => adminService.createNutritionist(b),
  update: (id, b) => adminService.updateNutritionist(id, b),
  upload: (id, f) => adminService.uploadNutritionistPhoto(id, f),
  remove: (id) => adminService.deleteNutritionist(id),
};
const GOALS = [['hypertrophy', tl("Build muscle")], ['fat_loss', tl("Fat loss")], ['recomp', tl("Recomposition")],
  ['maintenance', tl("Maintenance")], ['endurance', tl("Endurance")]];
const PLAN_FILTERS = [['all', tl("All")], ['to_review', tl("To review")], ['active', tl("Active")]];
const NEW_PERSON = {
  email: '', first_name: '', last_name: '', phone: '', title: '', credentials: '', bio: '', specialties: [],
  years_experience: 0, hourly_rate: '', is_verified: false, is_accepting_clients: true, is_active: true,
};

export default function AdminNutrition() {
  const [tab, setTab] = useState('plans');
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <PageHeader title={tl("Nutrition")} subtitle={tl("Members request a plan from a nutritionist and get starter targets straight away; review them here.")} />
      <div className="flex gap-1 bg-[#0e0e0f] border border-[#1a1a1e] p-1 rounded-lg w-fit" role="tablist">
        {[['plans', tl("Plans")], ['people', tl("Nutritionists")]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider ${
              tab === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'plans' ? <Plans /> : <People />}
    </div>
  );
}

function People() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const { data, loading, refetch } = useApi(() => adminService.nutritionists({ search: search || undefined }), [search]);
  const list = Array.isArray(data) ? data : [];
  return (
    <>
      <div className="flex gap-3">
        <input className={`${inputCls} md:w-72`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tl("Search…")} aria-label={tl("Search nutritionists")} />
        <div className="flex-1" />
        <button type="button" className={btn.primary} onClick={() => setEditing(NEW_PERSON)}>{tl("+ Add nutritionist")}</button>
      </div>
      {loading ? <div className="h-40 bg-[#0e0e0f] rounded-lg animate-pulse" /> : list.length === 0 ? <Empty>{tl("No nutritionists yet.")}</Empty> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((n) => (
            <button key={n.id} type="button" onClick={() => setEditing(n)}
              className={`text-left bg-[#0e0e0f] border border-[#1a1a1e] hover:border-primary-container/60 rounded-lg p-4 flex items-center gap-3 ${n.is_active ? '' : 'opacity-60'}`}>
              {n.photo_url ? <img src={n.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                : <div className="w-12 h-12 rounded bg-primary-container/20 text-primary grid place-items-center font-bold">{n.initials}</div>}
              <div className="min-w-0 flex-1">
                <div className="text-on-surface font-bold truncate">{n.user_name}{n.is_verified && ' ✓'}</div>
                <div className="text-[11px] text-on-surface-variant truncate">{n.title}</div>
                <div className="text-[11px] text-on-surface-variant">{n.active_plans}{' '}{tl("active plan")}{n.active_plans === 1 ? '' : 's'}
                  {!n.is_active ? tl(" · hidden") : !n.is_accepting_clients ? tl(" · not taking clients") : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {editing && <PersonEditor person={editing} kind="nutritionist" api={NUTRITIONIST_API} onClose={() => setEditing(null)} onSaved={refetch} />}
    </>
  );
}

function Plans() {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const { data, loading, refetch } = useApi(() => adminService.nutritionPlans({ status, q: q || undefined }), [status, q], { poll: 30_000 });
  const list = Array.isArray(data) ? data : [];
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-1">
          {PLAN_FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setStatus(id)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                status === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input className={`${inputCls} md:w-64`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tl("Search member…")} aria-label={tl("Search plans")} />
      </div>
      {loading ? <div className="h-40 bg-[#0e0e0f] rounded-lg animate-pulse" /> : list.length === 0 ? (
        <Empty>{status === 'to_review' ? tl("Nothing to review — every plan has been checked.") : tl("No plans.")}</Empty>
      ) : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl("Member")}</th><th className="px-4 py-3">{tl("Nutritionist")}</th><th className="px-4 py-3">{tl("Goal")}</th>
                <th className="px-4 py-3">{tl("Daily targets")}</th><th className="px-4 py-3">{tl("Requested")}</th><th className="px-4 py-3">{tl("Review")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => setEditing(p)} className="border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer">
                  <td className="px-4 py-3"><div className="text-on-surface">{p.member}</div><div className="text-[11px] text-on-surface-variant">{p.member_email}</div></td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.nutritionist}</td>
                  <td className="px-4 py-3">{tl(p.goal_label)}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{p.target_calories}{' '}{tl("kcal ·")}{' '}{p.target_protein_g}{' '}{tl("g P")}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{new Date(p.created_at).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${p.reviewed_at ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
                      {p.reviewed_at ? tl("Reviewed") : tl("Starter targets")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <PlanEditor plan={editing} onClose={() => setEditing(null)} onSaved={refetch} />}
    </>
  );
}

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </label>
  );
}

/** What the member logged in the portal over the last 14 days, against the plan's targets. */
function MealLogPanel({ memberId, targets }) {
  const { data, loading } = useApi(() => adminService.memberMeals(memberId, 14), [memberId], { poll: 30_000 });
  const days = Array.isArray(data) ? data : [];
  const [openDay, setOpenDay] = useState(null);
  const pct = (v, t) => (Number(t) > 0 ? Math.round((Number(v) / Number(t)) * 100) : 0);
  return (
    <div className="flex flex-col gap-2 border-t border-[#1a1a1e] pt-4">
      <span className={labelCls}>{tl("Meal log — last 14 days")}</span>
      {loading ? <div className="h-16 rounded bg-[#131316] animate-pulse" /> : days.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant">{tl("The member hasn’t logged any meals yet.")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#1a1a1e] rounded-lg border border-[#1a1a1e]">
          {days.map((d) => {
            const isOpen = openDay === d.date;
            const kcal = pct(d.calories, targets.target_calories);
            return (
              <div key={d.date}>
                <button type="button" onClick={() => setOpenDay(isOpen ? null : d.date)}
                  className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-start hover:bg-[#131316] text-[12px]">
                  <span className="text-on-surface font-bold w-28 shrink-0">{new Date(d.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className={kcal > 110 ? 'text-amber-300' : kcal >= 85 ? 'text-emerald-400' : 'text-on-surface-variant'}>
                    {d.calories} / {targets.target_calories} {tl("kcal")} ({kcal}%)
                  </span>
                  <span className="text-on-surface-variant">P {d.protein_g}g · C {d.carbs_g}g · F {d.fats_g}g</span>
                  <span className="text-on-surface-variant">{tl("Water")} {d.water_ml} ml</span>
                  <span className="ms-auto text-on-surface-variant">{tl("{0} meals", { 0: d.meals.length })}</span>
                </button>
                {isOpen && d.meals.length > 0 && (
                  <ul className="px-3 pb-2 flex flex-col gap-1">
                    {d.meals.map((m) => (
                      <li key={m.id} className="flex flex-wrap gap-x-3 text-[12px] bg-[#131316] rounded px-2 py-1">
                        <span className="text-primary font-bold w-24 shrink-0">{tl(m.meal_label)}</span>
                        <span className="text-on-surface flex-1 min-w-0 break-words">{m.description}</span>
                        <span className="text-on-surface-variant">{m.calories} {tl("kcal")} · P {m.protein_g} · C {m.carbs_g} · F {m.fats_g}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanEditor({ plan, onClose, onSaved }) {
  const [f, setF] = useState(plan);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState({ weight_kg: '', body_fat_percent: '', lean_mass_kg: '', fat_mass_kg: '', visceral_fat_kg: '', notes: '' });
  const [scanErrors, setScanErrors] = useState({});
  const { data: scans, refetch: refetchScans } = useApi(() => adminService.memberScans(plan.member_id), [plan.member_id]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setS = (k) => (e) => setScan((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await adminService.updateNutritionPlan(plan.id, {
        goal: f.goal, status: f.status, target_calories: f.target_calories, target_protein_g: f.target_protein_g,
        target_carbs_g: f.target_carbs_g, target_fats_g: f.target_fats_g, target_water_ml: f.target_water_ml,
        cycle_weeks: f.cycle_weeks, notes: f.notes,
      });
      toast.success(tl("Plan saved — the member has been notified"));
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Could not save the plan")));
    } finally {
      setBusy(false);
    }
  };

  const addScan = async (e) => {
    e.preventDefault();
    setScanErrors({});
    try {
      await adminService.addMemberScan(plan.member_id, scan);
      toast.success(tl("Scan saved — the member can see it now"));
      setScan({ weight_kg: '', body_fat_percent: '', lean_mass_kg: '', fat_mass_kg: '', visceral_fat_kg: '', notes: '' });
      refetchScans();
    } catch (err) {
      setScanErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Could not save the scan")));
    }
  };

  return (
    <Drawer open title={plan.member} onClose={onClose} subtitle={tl("{0} · with {1}", { 0: plan.goal_label, 1: plan.nutritionist })}
      footer={<>
        <button type="button" className={btn.ghost} onClick={onClose}>{tl("Cancel")}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl("Saving…") : plan.reviewed_at ? tl("Save") : tl("Save & mark reviewed")}</button>
      </>}>
      {!plan.reviewed_at && (
        <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-[12px] text-amber-200">
          <span className="material-symbols-outlined text-[18px]">pending_actions</span>
          <span>
            <b>{tl("Not reviewed yet.")}</b>{' '}
            {tl("The member is on the default targets for “{0}”. Check their meal log below, adjust the numbers, add a note and press “Save & mark reviewed” — they’ll be notified.", { 0: tl(plan.goal_label) })}
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label={tl("Goal")} error={errors.goal}><select className={inputCls} value={f.goal} onChange={set('goal')}>{GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label={tl("Calories / day")} error={errors.target_calories}><input className={inputCls} type="number" value={f.target_calories} onChange={set('target_calories')} /></Field>
        <Field label={tl("Protein g")} error={errors.target_protein_g}><input className={inputCls} type="number" value={f.target_protein_g} onChange={set('target_protein_g')} /></Field>
        <Field label={tl("Carbs g")} error={errors.target_carbs_g}><input className={inputCls} type="number" value={f.target_carbs_g} onChange={set('target_carbs_g')} /></Field>
        <Field label={tl("Fats g")} error={errors.target_fats_g}><input className={inputCls} type="number" value={f.target_fats_g} onChange={set('target_fats_g')} /></Field>
        <Field label={tl("Water ml")} error={errors.target_water_ml}><input className={inputCls} type="number" value={f.target_water_ml} onChange={set('target_water_ml')} /></Field>
        <Field label={tl("Weeks")} error={errors.cycle_weeks}><input className={inputCls} type="number" value={f.cycle_weeks} onChange={set('cycle_weeks')} /></Field>
        <Field label={tl("Status")} error={errors.status}>
          <select className={inputCls} value={f.status} onChange={set('status')}>
            {[['active', tl("Active")], ['paused', tl("Paused")], ['completed', tl("Completed")], ['archived', tl("Archived")]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></Field>
        <Field label={tl("Notes for the member")} error={errors.notes} className="col-span-2 md:col-span-3">
          <textarea className={inputCls} rows={3} value={f.notes} onChange={set('notes')} /></Field>
      </div>

      <MealLogPanel memberId={plan.member_id} targets={f} />

      <form onSubmit={addScan} className="flex flex-col gap-3 border-t border-[#1a1a1e] pt-4">
        <span className={labelCls}>{tl("Body Composition / Biometrics (DEXA scans)")}</span>
        {(scans || []).length > 0 && (
          <div className="flex flex-col gap-1 text-[12px] text-on-surface-variant">
            {scans.map((s) => <div key={s.id}>{s.scan_date}: {s.weight_kg}{' '}{tl("kg ·")}{' '}{s.body_fat_percent}{tl("% fat ·")}{' '}{s.lean_mass_kg}{' '}{tl("kg lean")}</div>)}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[['weight_kg', tl("Weight kg")], ['body_fat_percent', tl("Body fat %")], ['lean_mass_kg', tl("Lean kg")], ['fat_mass_kg', tl("Fat kg")], ['visceral_fat_kg', tl("Visceral kg")]].map(([k, l]) => (
            <Field key={k} label={l} error={scanErrors[k]}><input className={inputCls} inputMode="decimal" value={scan[k]} onChange={setS(k)} /></Field>
          ))}
        </div>
        <button type="submit" className={`${btn.ghost} w-fit`}>{tl("Add scan result")}</button>
      </form>
    </Drawer>
  );
}
