// src/pages/member/Nutritionists.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { nutritionService } from '../../services/nutritionService';
import { formatSAR } from '../../utils/money';
import { tl } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

const lineUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
};

const gridV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardV = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 240, damping: 24 },
  },
};

// ============================================================
// PAGE
// ============================================================
export default function Nutritionists() {
  const navigate = useNavigate();
  const openProfile = (n) => navigate(`/dashboard/nutritionists/${n.id}`);
  // ---- API data ----
  const {
    data: nutritionists,
    loading,
    error,
    refetch: refetchNutritionists,
  } = useApi(() => nutritionService.nutritionists(), []);

  const { data: summary, refetch: refetchSummary } = useApi(
    () => nutritionService.dailySummary(),
    [],
    { showError: false }
  );

  const { data: plan } = useApi(
    () => nutritionService.myPlan(),
    [],
    { showError: false }
  );

  const { data: latestDexa } = useApi(
    () => nutritionService.latestDexa(),
    [],
    { showError: false }
  );

  // ---- Local state ----
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealForm, setMealForm] = useState({
    meal_type: 'breakfast',
    description: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
  });

  // ---- Derived ----
  const list = Array.isArray(nutritionists) ? nutritionists : [];
  const consumed = summary?.consumed || {};
  const targets = summary?.targets || {};

  const macros = [
    {
      label: tl("Calories"),
      consumed: consumed.calories || 0,
      target: targets.calories || 0,
      unit: 'kcal',
    },
    {
      label: tl("Protein"),
      consumed: Math.round(consumed.protein_g || 0),
      target: targets.protein_g || 0,
      unit: 'g',
    },
    {
      label: tl("Carbs"),
      consumed: Math.round(consumed.carbs_g || 0),
      target: targets.carbs_g || 0,
      unit: 'g',
    },
    {
      label: tl("Fats"),
      consumed: Math.round(consumed.fats_g || 0),
      target: targets.fats_g || 0,
      unit: 'g',
    },
  ];

  // Featured = is_featured flag, else top-rated, else first
  const featured =
    list.find((n) => n.is_featured) ||
    [...list].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0] ||
    null;

  const others = list.filter((n) => n.id !== featured?.id);

  const assignedNutritionistName = plan?.nutritionist_name || null;
  const isFeaturedAssigned =
    assignedNutritionistName &&
    featured &&
    (plan?.nutritionist_id ? plan.nutritionist_id === featured.id : assignedNutritionistName === featured.user?.full_name);

  // ---- Handlers ----
  const handleLogMeal = async () => {
    if (!mealForm.description.trim()) {
      toast.error(tl("Please add a description"));
      return;
    }
    try {
      await nutritionService.logMeal(mealForm);
      toast.success(tl("Meal logged!"));
      setShowMealModal(false);
      setMealForm({
        meal_type: 'breakfast',
        description: '',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
      });
      refetchSummary();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to log meal');
    }
  };

  const handleAddWater = async (amount) => {
    try {
      await nutritionService.addWater(amount);
      toast.success(tl("+{0}ml", { 0: amount }));
      refetchSummary();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to add water');
    }
  };

  // ---- Error state ----
  if (error && !loading) {
    return (
      <div className="w-full px-space-xl py-space-xl">
        <div className="bg-surface-container rounded-xl p-space-xl text-center">
          <span className="material-symbols-outlined text-4xl text-error">
            error
          </span>
          <p className="font-body-md text-on-surface mt-space-sm">
            {tl("Failed to load nutritionists.")}
          </p>
          <button
            onClick={refetchNutritionists}
            className="mt-space-md px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-md uppercase"
          >
            {tl("Retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col overflow-hidden px-space-xl py-space-xl">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 80%)',
          }}
        />
        <motion.div
          className="absolute -top-40 right-[8%] w-[480px] h-[480px] rounded-full bg-primary-container/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 -left-48 w-[420px] h-[420px] rounded-full bg-secondary-container/10 blur-3xl"
          animate={{ x: [0, 32, 0], y: [0, -26, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <NutritionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-space-xl">
          {/* Left column */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            {loading ? (
              <>
                <div className="h-72 bg-surface-container rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-60 bg-surface-container rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              </>
            ) : list.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {featured && (
                  <FeaturedNutritionist
                    nutritionist={featured}
                    isAssigned={isFeaturedAssigned}
                    onOpen={() => openProfile(featured)}
                  />
                )}
                <SpecialistsGrid
                  nutritionists={others}
                  heading={
                    assignedNutritionistName
                      ? tl("Additional Specialists")
                      : tl("Elite Specialists")
                  }
                  onOpen={openProfile}
                />
              </>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-4">
            <MacroSyncPanel
              plan={plan}
              macros={macros}
              consumed={consumed}
              targets={targets}
              latestDexa={latestDexa}
              onAddWater={handleAddWater}
              onOpenMeal={() => setShowMealModal(true)}
            />
          </div>
        </div>
      </motion.div>

      {/* Meal modal */}
      <AnimatePresence>
        {showMealModal && (
          <MealModal
            form={mealForm}
            setForm={setMealForm}
            onSubmit={handleLogMeal}
            onClose={() => setShowMealModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================
function NutritionHeader() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.09 } },
      }}
      className="flex flex-col gap-space-xs"
    >
      <motion.div
        variants={lineUp}
        className="flex items-center gap-space-xs text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">
          restaurant
        </span>
        <span className="font-label-md text-label-md uppercase tracking-widest font-bold">
          {tl("Clinical Sports Nutrition")}
        </span>
      </motion.div>

      <motion.h1
        variants={lineUp}
        className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider leading-none m-0"
      >
        {tl("Nutrition &")}{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
          {tl("Macro Sync")}
        </span>
      </motion.h1>

      <motion.span
        className="h-[2px] w-40 bg-gradient-to-r from-primary-container to-transparent rounded-full origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      />

      <motion.p
        variants={lineUp}
        className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-2xl"
      >
        {tl("Track macros, log meals, and consult certified sports dietitians.")}
      </motion.p>
    </motion.div>
  );
}

// ============================================================
// FEATURED NUTRITIONIST
// ============================================================
function FeaturedNutritionist({ nutritionist: n, isAssigned, onOpen }) {
  const initials = (n.user?.full_name || 'NN')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const photo = n.photo_url || n.user?.avatar;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="relative bg-surface-container rounded-xl p-space-xl overflow-hidden shadow-xl cursor-pointer hover:ring-1 hover:ring-primary-container/60 transition-shadow"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-space-lg">
        {photo ? (
          <img
            src={photo}
            alt={n.user?.full_name}
            className="w-20 h-20 rounded-lg object-cover shadow-[0_0_24px_rgba(229,25,55,0.4)]"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[28px] shadow-[0_0_24px_rgba(229,25,55,0.4)]">
            {initials}
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
              {n.user?.full_name}
            </h2>
            {isAssigned && (
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-label-md text-[10px] uppercase font-bold tracking-widest">
                {tl("Assigned")}
              </span>
            )}
          </div>
          <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
            {n.title}
          </span>
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase mt-0.5">
            {n.credentials}
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 line-clamp-2">
            {n.bio || tl("Sports nutrition specialist")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <span
              className="material-symbols-outlined text-primary-container text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-title-md text-title-md text-on-surface">
              {Number(n.rating) > 0 ? Number(n.rating).toFixed(1) : tl("New")}
            </span>
            <span className="font-label-md text-[10px] text-outline uppercase ml-1">
              ({n.total_reviews})
            </span>
          </div>
          <span className="font-headline-md text-headline-md text-primary font-bold">
            {formatSAR(n.hourly_rate)}
            <span className="font-label-md text-[10px] text-on-surface-variant ms-1">
              / {tl("consultation")}
            </span>
          </span>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all bg-primary-container hover:bg-secondary-container text-on-primary-container"
            type="button"
          >
            {isAssigned ? tl("Your plan") : tl("View profile")}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SPECIALISTS GRID
// ============================================================
function SpecialistsGrid({ nutritionists, heading, onOpen }) {
  if (!nutritionists || nutritionists.length === 0) return null;

  return (
    <div className="flex flex-col gap-space-md">
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
        {heading}
      </h3>

      <motion.div
        initial="hidden"
        animate="show"
        variants={gridV}
        className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
      >
        {nutritionists.map((n) => {
          const initials = (n.user?.full_name || 'NN')
            .split(' ')
            .map((x) => x[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const photo = n.photo_url || n.user?.avatar;

          return (
            <motion.div
              key={n.id}
              variants={cardV}
              whileHover={{ y: -4 }}
              onClick={() => onOpen(n)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpen(n); }}
              className="bg-surface-container rounded-xl p-5 flex flex-col gap-3 shadow-md hover:shadow-xl hover:ring-1 hover:ring-primary-container/60 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {photo ? (
                  <img
                    src={photo}
                    alt={n.user?.full_name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[20px]">
                    {initials}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-title-lg text-title-lg text-on-surface truncate">
                    {n.user?.full_name}
                  </span>
                  <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
                    {n.title}
                  </span>
                  <span className="font-label-md text-[9px] text-on-surface-variant uppercase">
                    {n.credentials}
                  </span>
                </div>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                {n.bio || tl("Sports nutrition specialist")}
              </p>

              {Array.isArray(n.specialties) && n.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.specialties.slice(0, 3).map((sp) => (
                    <span
                      key={sp}
                      className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-md text-[9px] uppercase tracking-wider"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
                <div className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-primary text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span className="font-title-md text-title-md text-on-surface text-[13px]">
                    {Number(n.rating) > 0 ? Number(n.rating).toFixed(1) : tl("New")}
                  </span>
                  <span className="font-label-md text-[9px] text-outline">
                    ({n.total_reviews})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-title-md text-title-md text-primary font-bold">
                    {formatSAR(n.hourly_rate)}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onOpen(n); }}
                    className="px-3 py-1 rounded bg-primary-container text-on-primary-container font-label-md text-[9px] uppercase tracking-wider font-bold"
                    type="button"
                  >
                    {tl("View")}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ============================================================
// MACRO SYNC PANEL
// ============================================================
function MacroSyncPanel({
  plan,
  macros,
  consumed,
  targets,
  latestDexa,
  onAddWater,
  onOpenMeal,
}) {
  const waterPct = Math.min(
    100,
    Math.round(
      ((consumed.water_ml || 0) / (targets.water_ml || 4000)) * 100
    )
  );

  const caloriesPct =
    targets.calories > 0
      ? Math.min(100, Math.round((consumed.calories / targets.calories) * 100))
      : 0;

  const remaining =
    (targets.calories || 0) - (consumed.calories || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
      className="relative bg-surface-container rounded-xl p-space-xl flex flex-col gap-space-md shadow-xl lg:sticky lg:top-space-xl h-fit"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />

      <div>
        <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
          {tl("Live Telemetry")}
        </span>
        <h3 className="font-headline-md text-headline-md text-on-surface uppercase">
          {tl("Today's Macros")}
        </h3>
      </div>

      {plan && (
        <p className={`text-[12px] ${plan.reviewed_at ? 'text-on-surface-variant' : 'text-amber-300'}`}>
          {plan.reviewed_at
            ? tl("Targets set by {0}.", { 0: plan.nutritionist_name || 'your nutritionist' })
            : tl("Starter targets for your goal — {0} will review them shortly.", { 0: plan.nutritionist_name || 'your nutritionist' })}
          {plan.notes && <span className="block mt-1 text-on-surface">{plan.notes}</span>}
        </p>
      )}

      {!plan ? (
        <div className="text-center py-8 bg-surface-container-lowest rounded-lg">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
            restaurant_menu
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 px-4">
            {tl("No active plan — request one from a nutritionist to unlock tracking.")}
          </p>
        </div>
      ) : (
        <>
          {/* Daily target */}
          <div className="p-space-md bg-surface-container-lowest rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-[10px] uppercase text-outline">
                {tl("Daily Target")}
              </span>
              <span className="font-label-md text-[10px] text-primary uppercase font-bold">
                {plan.goal}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface tabular-nums">
                {targets.calories || 0}
              </span>
              <span className="font-label-md text-[10px] text-outline uppercase">
                kcal
              </span>
            </div>
            <div className="relative w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full rounded-full bg-primary-container"
                initial={{ width: 0 }}
                animate={{ width: `${caloriesPct}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </div>
            <div className="flex justify-between mt-2 font-label-md text-[10px] tabular-nums">
              <span className="text-on-surface-variant">
                {consumed.calories || 0} consumed
              </span>
              <span
                className={
                  remaining > 0 ? 'text-primary font-bold' : 'text-outline'
                }
              >
                {remaining > 0 ? tl("{0} left", { 0: remaining }) : tl("Complete")}
              </span>
            </div>
          </div>

          {/* Macro tiles */}
          {macros.map((m) => {
            const pct =
              m.target > 0
                ? Math.min(100, Math.round((m.consumed / m.target) * 100))
                : 0;
            return (
              <div
                key={m.label}
                className="bg-surface-container-lowest rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-title-md text-title-md text-on-surface text-[13px]">
                    {m.label}
                  </span>
                  <span className="font-label-md text-[10px] text-on-surface-variant tabular-nums">
                    {m.consumed} / {m.target} {m.unit}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary-container"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: EASE }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="font-label-md text-[9px] text-on-surface-variant uppercase">
                    {pct}{tl("% of target")}
                  </span>
                  <span className="font-label-md text-[9px] text-primary font-bold uppercase">
                    {m.target - m.consumed > 0
                      ? tl("{0} left", { 0: m.target - m.consumed })
                      : tl("Complete")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Water */}
          <div className="bg-surface-container-lowest rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-title-md text-title-md text-on-surface text-[13px]">
                {tl("Water")}
              </span>
              <span className="font-label-md text-[10px] text-on-surface-variant tabular-nums">
                {consumed.water_ml || 0} / {targets.water_ml || 4000} ml
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full rounded-full bg-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${waterPct}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </div>
            <div className="flex gap-2">
              {[250, 500, 750].map((ml) => (
                <motion.button
                  key={ml}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAddWater(ml)}
                  className="flex-1 py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-[10px] font-bold uppercase tracking-wider transition-colors"
                  type="button"
                >
                  +{ml}ml
                </motion.button>
              ))}
            </div>
          </div>

          {/* DEXA */}
          <div className="bg-surface-container-lowest rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">
                {tl("Body Composition / Biometrics (DEXA)")}
              </span>
              <span className="font-label-md text-[10px] text-primary font-bold uppercase">
                {latestDexa?.scan_date || tl("No data")}
              </span>
            </div>
            {latestDexa ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="font-label-md text-[9px] text-outline uppercase block">
                    {tl("Body Fat")}
                  </span>
                  <span className="font-title-md text-title-md text-on-surface tabular-nums">
                    {Number(latestDexa.body_fat_percent).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-[9px] text-outline uppercase block">
                    {tl("Lean")}
                  </span>
                  <span className="font-title-md text-title-md text-on-surface tabular-nums">
                    {Number(latestDexa.lean_mass_kg).toFixed(1)}kg
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-[9px] text-outline uppercase block">
                    {tl("Visceral")}
                  </span>
                  <span className="font-title-md text-title-md text-primary tabular-nums">
                    {latestDexa.visceral_fat_kg
                      ? tl("{0}kg", { 0: Number(latestDexa.visceral_fat_kg).toFixed(1) })
                      : tl("N/A")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-body-md text-[11px] text-on-surface-variant">
                {tl("No DEXA scan on record — upload one to track body composition.")}
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenMeal}
            className="w-full py-3 rounded-lg bg-primary-container hover:bg-secondary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(229,25,55,0.3)]"
            type="button"
          >
            {tl("Log a Meal")}
          </motion.button>
        </>
      )}
    </motion.div>
  );
}

// ============================================================
// MEAL MODAL
// ============================================================
function MealModal({ form, setForm, onSubmit, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md border border-surface-container-high shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline-md text-headline-md text-on-surface uppercase">
            {tl("Log a Meal")}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error/20 text-on-surface-variant flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="font-label-md text-[10px] uppercase text-on-surface-variant block mb-1">
              {tl("Meal Type")}
            </label>
            <select
              value={form.meal_type}
              onChange={(e) =>
                setForm({ ...form, meal_type: e.target.value })
              }
              className="w-full bg-surface-container-low text-on-surface rounded-lg p-3 border border-surface-container-high focus:outline-none focus:border-primary"
            >
              <option value="breakfast">{tl("Breakfast")}</option>
              <option value="lunch">{tl("Lunch")}</option>
              <option value="dinner">{tl("Dinner")}</option>
              <option value="snack">{tl("Snack")}</option>
              <option value="pre_workout">{tl("Pre-Workout")}</option>
              <option value="post_workout">{tl("Post-Workout")}</option>
            </select>
          </div>

          <div>
            <label className="font-label-md text-[10px] uppercase text-on-surface-variant block mb-1">
              {tl("Description")}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder={tl("e.g. Chicken + rice + broccoli")}
              className="w-full bg-surface-container-low text-on-surface rounded-lg p-3 border border-surface-container-high focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={tl("Calories")}
              value={form.calories}
              onChange={(v) => setForm({ ...form, calories: v })}
            />
            <NumberField
              label={tl("Protein (g)")}
              value={form.protein_g}
              onChange={(v) => setForm({ ...form, protein_g: v })}
            />
            <NumberField
              label={tl("Carbs (g)")}
              value={form.carbs_g}
              onChange={(v) => setForm({ ...form, carbs_g: v })}
            />
            <NumberField
              label={tl("Fats (g)")}
              value={form.fats_g}
              onChange={(v) => setForm({ ...form, fats_g: v })}
            />
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-3 mt-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              submitting
                ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                : 'bg-primary-container hover:bg-secondary-container text-on-primary-container'
            }`}
            type="button"
          >
            {submitting ? tl("Saving...") : tl("Save Meal")}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="font-label-md text-[10px] uppercase text-on-surface-variant block mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-surface-container-low text-on-surface rounded-lg p-3 border border-surface-container-high focus:outline-none focus:border-primary"
      />
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="bg-surface-container-lowest rounded-xl p-space-xl text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full bg-surface-container-high/40 blur-3xl" />
      </div>
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 relative z-10 inline-block mb-space-md">
        restaurant
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mb-2 relative z-10">
        {tl("No Nutritionists Yet")}
      </h3>
      <p className="font-body-md text-on-surface-variant relative z-10">
        {tl("Run")}{' '}<code className="px-2 py-0.5 bg-surface-container rounded">python manage.py seed_nutritionists</code>{' '}{tl("to load demo data.")}
      </p>
    </motion.div>
  );
}