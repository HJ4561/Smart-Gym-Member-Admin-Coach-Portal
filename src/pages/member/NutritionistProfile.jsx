// src/pages/member/NutritionistProfile.jsx
// One nutritionist: who they are, what they focus on, and a plan request with the member's goal.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { nutritionService } from '../../services/nutritionService';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import PayDialog from '../../components/payments/PayDialog';
import { tl } from '../../i18n';

// Same starting targets the backend gives each goal (apps/nutrition/views.py GOAL_DEFAULTS).
const GOALS = [
  { id: 'hypertrophy', icon: 'fitness_center', label: 'Build muscle', kcal: 3200, protein: 200 },
  { id: 'fat_loss', icon: 'local_fire_department', label: 'Lose fat', kcal: 2000, protein: 180 },
  { id: 'recomp', icon: 'balance', label: 'Recomposition', kcal: 2500, protein: 190 },
  { id: 'maintenance', icon: 'self_improvement', label: 'Maintain', kcal: 2700, protein: 160 },
  { id: 'endurance', icon: 'directions_run', label: 'Endurance', kcal: 3000, protein: 150 },
];

const initials = (name = '') => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function NutritionistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: n, loading, error } = useApi(() => nutritionService.nutritionist(id), [id], { showError: false });
  const { data: plans, refetch: refetchPlan } = useApi(() => nutritionService.myPlans(), [], { showError: false });
  const [goal, setGoal] = useState('hypertrophy');
  const [sending, setSending] = useState(false);
  const [payPlan, setPayPlan] = useState(null);     // requested plan waiting for the consultation fee

  if (loading) {
    return (
      <div className="w-full px-space-xl py-space-xl flex flex-col gap-4">
        <div className="h-48 rounded-xl bg-surface-container animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 rounded-xl bg-surface-container animate-pulse" />
          <div className="h-64 rounded-xl bg-surface-container animate-pulse" />
        </div>
      </div>
    );
  }
  if (error || !n) {
    return (
      <div className="w-full px-space-xl py-space-xl">
        <div className="rounded-xl bg-surface-container p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">person_off</span>
          <p className="text-on-surface font-bold mt-3">{tl('This nutritionist isn’t available.')}</p>
          <Link to="/dashboard/nutritionists" className="inline-block mt-4 text-primary text-[14px] font-bold">{tl('Back to nutrition')}</Link>
        </div>
      </div>
    );
  }

  const name = n.user?.full_name || tl('Nutritionist');
  const photo = n.photo_url || n.user?.avatar;
  const rated = n.total_reviews > 0;
  // A member can have a plan with several nutritionists; this page is about the one with this person.
  const myPlans = Array.isArray(plans) ? plans : [];
  const activePlan = myPlans.find((x) => Number(x.nutritionist_id) === Number(n.id)) || null;
  const isMine = !!activePlan;
  const chosen = GOALS.find((g) => g.id === goal);

  const request = async () => {
    setSending(true);
    try {
      const created = await nutritionService.requestPlan(n.id, goal);
      if (created.status === 'pending_payment') {
        setPayPlan(created);          // pay the consultation fee; the plan starts once paid
        return;
      }
      toast.success(isMine ? tl('Goal updated — your nutritionist will review the new targets.') : tl('Plan requested from {0}', { 0: name }));
      refetchPlan();
      navigate('/dashboard/nutrition-plan');
    } catch (e) {
      toast.error(errorMessage(e, tl('Couldn’t request the plan. Please try again.')));
    } finally {
      setSending(false);
    }
  };

  const stats = [
    ['star', rated ? Number(n.rating).toFixed(1) : tl('New'), rated ? tl('{0} reviews', { 0: n.total_reviews }) : tl('No reviews yet')],
    ['workspace_premium', n.years_experience || '—', tl('Years experience')],
    ['groups', n.total_clients || 0, tl('Clients coached')],
    ['payments', Number(n.hourly_rate) > 0 ? formatSAR(n.hourly_rate) : '—', tl('Per consultation')],
  ];

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-6">
      <Link to="/dashboard/nutritionists" className="w-fit flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-[13px]">
        <span className="material-symbols-outlined text-[18px] rtl:rotate-180">arrow_back</span>{tl('All nutritionists')}
      </Link>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-surface-container border border-surface-container-high p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
          {photo
            ? <img src={photo} alt="" className="w-28 h-28 rounded-xl object-cover" />
            : <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest border border-primary-container/30 grid place-items-center text-[36px] font-bold text-primary">{initials(name)}</div>}
          <div className="min-w-0 flex-1">
            <span className="text-primary text-[11px] font-bold uppercase tracking-widest">{tl('Sports nutrition')}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md text-on-surface">{name}</h1>
              {n.is_verified && <span className="material-symbols-outlined text-primary text-[22px]" title={tl('Verified')} style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
            </div>
            <p className="text-on-surface-variant">{n.title}{n.credentials ? ` · ${n.credentials}` : ''}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {isMine && <Badge tone="primary" icon="check_circle">{tl('Your nutritionist')}</Badge>}
              {n.is_accepting_clients
                ? <Badge tone="ok" icon="event_available">{tl('Taking new clients')}</Badge>
                : <Badge icon="event_busy">{tl('Not taking new clients')}</Badge>}
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(([icon, value, label]) => (
          <div key={label} className="rounded-xl bg-surface-container border border-surface-container-high px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
            <div className="min-w-0">
              <div className="text-[18px] font-bold text-on-surface leading-tight truncate">{value}</div>
              <div className="text-[11px] text-on-surface-variant truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <section className="rounded-xl bg-surface-container border border-surface-container-high p-5">
            <h2 className="text-on-surface font-bold text-[16px] mb-2">{tl('About')}</h2>
            <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">
              {n.bio || tl('{0} hasn’t added a bio yet.', { 0: name })}
            </p>
          </section>
          {(n.specialties || []).length > 0 && (
            <section className="rounded-xl bg-surface-container border border-surface-container-high p-5">
              <h2 className="text-on-surface font-bold text-[16px] mb-3">{tl('Specialties')}</h2>
              <div className="flex flex-wrap gap-2">
                {n.specialties.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface text-[13px]">{s}</span>
                ))}
              </div>
            </section>
          )}
          <section className="rounded-xl bg-surface-container border border-surface-container-high p-5">
            <h2 className="text-on-surface font-bold text-[16px] mb-3">{tl('How it works')}</h2>
            <ol className="grid sm:grid-cols-3 gap-3">
              {[
                ['flag', tl('Pick your goal'), tl('You get daily calorie, protein, carb and water targets for it straight away.')],
                ['restaurant', tl('Log your meals'), tl('Track what you eat on the nutrition page against those targets.')],
                ['rate_review', tl('Get reviewed'), tl('Your nutritionist checks in and fine-tunes the plan as you go.')],
              ].map(([icon, title, text], i) => (
                <li key={title} className="rounded-lg bg-surface-container-low p-3">
                  <div className="flex items-center gap-2 text-on-surface font-bold text-[14px]">
                    <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container grid place-items-center text-[12px]">{i + 1}</span>
                    <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>{title}
                  </div>
                  <p className="text-on-surface-variant text-[13px] mt-1.5">{text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-4 rounded-xl bg-surface-container border border-surface-container-high p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-on-surface font-bold text-[16px]">{isMine ? tl('Change your goal') : tl('Request a nutrition plan')}</h2>
            <p className="text-on-surface-variant text-[13px] mt-1">
              {isMine
                ? tl('Your current plan: {0}. Picking a new goal replaces it.', { 0: activePlan.name || tl(GOALS.find((g) => g.id === activePlan.goal)?.label || activePlan.goal) })
                : myPlans.length > 0
                  ? tl('Requesting here adds a plan with {0}. Your other plans stay as they are.', { 0: name })
                  : tl('Choose what you’re working towards.')}
            </p>
          </div>

          <div className="flex flex-col gap-2" role="radiogroup" aria-label={tl('Your goal')}>
            {GOALS.map((g) => (
              <button key={g.id} type="button" role="radio" aria-checked={goal === g.id} onClick={() => setGoal(g.id)}
                disabled={!n.is_accepting_clients}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors disabled:opacity-50 ${
                  goal === g.id ? 'border-primary-container bg-primary-container/10' : 'border-surface-container-high hover:border-outline'}`}>
                <span className={`material-symbols-outlined text-[20px] ${goal === g.id ? 'text-primary' : 'text-on-surface-variant'}`}>{g.icon}</span>
                <span className="flex-1 text-on-surface text-[14px] font-bold">{tl(g.label)}</span>
                <span className="text-on-surface-variant text-[11px]">{tl('{0} kcal', { 0: g.kcal.toLocaleString('en-US') })}</span>
              </button>
            ))}
          </div>

          {chosen && (
            <p className="text-[12px] text-on-surface-variant rounded-lg bg-surface-container-low px-3 py-2">
              {tl('Starts at {0} kcal and {1} g protein a day — your nutritionist adjusts it after reviewing you.', { 0: chosen.kcal.toLocaleString('en-US'), 1: chosen.protein })}
            </p>
          )}

          <button type="button" onClick={request} disabled={sending || !n.is_accepting_clients || (isMine && activePlan.goal === goal)}
            className="w-full py-3 rounded-lg bg-primary-container text-on-primary-container font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed">
            {!n.is_accepting_clients ? tl('Not taking new clients')
              : sending ? tl('Sending…')
                : isMine && activePlan.goal === goal ? tl('This is your current goal')
                  : isMine ? tl('Switch goal (free)')
                    : Number(n.hourly_rate) > 0 ? tl('Request plan · {0}', { 0: formatSAR(n.hourly_rate) }) : tl('Request plan')}
          </button>
          {!isMine && Number(n.hourly_rate) > 0 && n.is_accepting_clients && (
            <p className="text-[11px] text-on-surface-variant -mt-2">
              {tl('One-time consultation fee, paid by card, STC Pay or locker credit. Your plan starts as soon as it’s paid.')}
            </p>
          )}
        </aside>
      </div>

      <PayDialog
        request={payPlan ? { purpose: 'nutrition_plan', plan_id: payPlan.id } : null}
        title={tl('Nutrition plan with {0}', { 0: name })}
        allowCredit
        onPaid={() => { toast.success(tl('Paid — your nutrition plan has started.')); setPayPlan(null); navigate('/dashboard/nutrition-plan'); }}
        onClose={() => { setPayPlan(null); refetchPlan(); }}
      />
    </div>
  );
}

function Badge({ tone, icon, children }) {
  const cls = tone === 'ok' ? 'bg-emerald-500/15 text-emerald-300'
    : tone === 'primary' ? 'bg-primary-container text-on-primary-container'
      : 'bg-surface-container-high text-on-surface-variant';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold ${cls}`}>
      <span className="material-symbols-outlined text-[16px]">{icon}</span>{children}
    </span>
  );
}
