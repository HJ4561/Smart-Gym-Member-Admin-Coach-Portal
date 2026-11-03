// src/pages/member/NutritionPlan.jsx
// The member's active nutrition plans (one per nutritionist they've paid): daily targets, today's
// progress and each nutritionist's message.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { nutritionService } from '../../services/nutritionService';
import { formatGymDateTime } from '../../utils/gymTime';
import { tl } from '../../i18n';

const GOAL_LABEL = {
  hypertrophy: 'Build muscle', fat_loss: 'Lose fat', recomp: 'Recomposition', maintenance: 'Maintain', endurance: 'Endurance',
};
const initials = (name = '') => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function NutritionPlan() {
  const { data: plans, loading, error } = useApi(() => nutritionService.myPlans(), [], { showError: false });
  const { data: summary } = useApi(() => nutritionService.dailySummary(), [], { showError: false });
  const [pickedId, setPickedId] = useState(null);
  const list = Array.isArray(plans) ? plans : [];
  const plan = list.find((p) => p.id === pickedId) || list[0];

  if (loading) {
    return (
      <div className="w-full px-space-xl py-space-xl flex flex-col gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-surface-container animate-pulse" />)}
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="w-full px-space-xl py-space-xl">
        <div className="rounded-xl bg-surface-container border border-surface-container-high p-10 text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">restaurant</span>
          <h1 className="text-on-surface font-bold text-[20px]">{tl('You don’t have a nutrition plan yet')}</h1>
          <p className="text-on-surface-variant max-w-md">{tl('Pick a nutritionist, choose your goal and you’ll get daily targets straight away. Your nutritionist then reviews them and leaves you a message here.')}</p>
          <Link to="/dashboard/nutritionists" className="mt-2 px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-bold text-[14px]">
            {tl('Find a nutritionist')}
          </Link>
        </div>
      </div>
    );
  }

  const name = plan.nutritionist_name || tl('Your nutritionist');
  const consumed = summary?.consumed || {};
  const targets = [
    ['local_fire_department', tl('Calories'), plan.target_calories, consumed.calories, tl('kcal')],
    ['egg_alt', tl('Protein'), plan.target_protein_g, consumed.protein_g, 'g'],
    ['bakery_dining', tl('Carbs'), plan.target_carbs_g, consumed.carbs_g, 'g'],
    ['opacity', tl('Fats'), plan.target_fats_g, consumed.fats_g, 'g'],
    ['water_drop', tl('Water'), plan.target_water_ml, consumed.water_ml, 'ml'],
  ];

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-5">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">restaurant</span>{tl('My nutrition')}
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide break-words">{plan.name}</h1>
        <p className="text-on-surface-variant">
          {tl('Goal')}: <b className="text-on-surface">{tl(GOAL_LABEL[plan.goal] || plan.goal)}</b>
          {plan.cycle_weeks ? ` · ${tl('{0}-week cycle', { 0: plan.cycle_weeks })}` : ''}
        </p>
      </motion.header>

      {list.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
            {tl('Your nutritionists ({0})', { 0: list.length })}
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={tl('Your nutritionists')}>
            {list.map((p) => {
              const on = p.id === plan.id;
              const who = p.nutritionist_name || tl('Your nutritionist');
              return (
                <button key={p.id} type="button" aria-pressed={on} onClick={() => setPickedId(p.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] ${on
                    ? 'border-primary-container bg-primary-container/15 text-on-surface'
                    : 'border-surface-container-high bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                  {p.nutritionist_avatar
                    ? <img src={p.nutritionist_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    : <span className="w-6 h-6 rounded-full bg-primary-container/20 text-primary grid place-items-center text-[10px] font-bold">{initials(who)}</span>}
                  <span className="font-bold">{who}</span>
                  <span className="text-[11px]">· {tl(GOAL_LABEL[p.goal] || p.goal)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {plan.reviewed_at ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          <span className="material-symbols-outlined">verified</span>
          <p className="text-[14px]">{tl('Reviewed by {0} on {1}.', { 0: name, 1: formatGymDateTime(plan.reviewed_at) })}</p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
          <span className="material-symbols-outlined">pending</span>
          <p className="text-[14px]">
            <b>{tl('Pending review by your nutritionist.')}</b>{' '}
            {tl('These are starter targets for your goal — {0} will adjust them for you.', { 0: name })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl bg-surface-container border border-surface-container-high p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-on-surface font-bold text-[16px]">{tl('Daily targets')}</h2>
              <span className="text-[12px] text-on-surface-variant">{tl('Today so far')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {targets.map(([icon, label, target, done, unit]) => {
                const pct = target ? Math.min(100, Math.round((Number(done || 0) / target) * 100)) : 0;
                return (
                  <div key={label} className="rounded-lg bg-surface-container-low p-3 flex flex-col gap-2 min-w-0">
                    <span className="flex items-center gap-1.5 text-on-surface-variant text-[12px]">
                      <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>{label}
                    </span>
                    <span className="text-on-surface font-bold text-[20px] leading-none">
                      {Number(target).toLocaleString('en-US')}<span className="text-[12px] font-normal text-on-surface-variant"> {unit}</span>
                    </span>
                    <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                      <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-on-surface-variant">{Math.round(Number(done || 0)).toLocaleString('en-US')} {unit} · {pct}%</span>
                  </div>
                );
              })}
            </div>
            <Link to="/dashboard/nutritionists" className="mt-4 inline-flex items-center gap-1 text-primary text-[13px] font-bold">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>{tl('Log a meal or water')}
            </Link>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface-container border border-primary-container/40 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {plan.nutritionist_avatar
                ? <img src={plan.nutritionist_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                : <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary grid place-items-center font-bold">{initials(name)}</div>}
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-on-surface-variant">{tl('Message from your nutritionist')}</div>
                <div className="text-on-surface font-bold truncate">{name}</div>
                {plan.nutritionist_credentials && <div className="text-[12px] text-on-surface-variant truncate">{plan.nutritionist_credentials}</div>}
              </div>
            </div>
            {plan.notes ? (
              <p className="text-on-surface text-[15px] leading-relaxed whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-4" dir="auto">{plan.notes}</p>
            ) : (
              <p className="text-on-surface-variant text-[13px] rounded-lg bg-surface-container-low p-4">
                {plan.reviewed_at ? tl('{0} didn’t leave a note this time.', { 0: name }) : tl('{0} will leave you a message here after reviewing your plan.', { 0: name })}
              </p>
            )}
            {plan.nutritionist_id && (
              <Link to={`/dashboard/nutritionists/${plan.nutritionist_id}`} className="text-[13px] text-primary font-bold">{tl('View profile / change goal')}</Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
