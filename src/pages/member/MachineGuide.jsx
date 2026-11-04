import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QrScanner from '../../components/QrScanner';
import { machineTagFrom } from '../../utils/machineQr';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { workoutsService } from '../../services/workoutsService';
import { getLocalized, tl } from '../../i18n';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import MachineVideos from '../../components/machines/MachineVideos';

const EASE = [0.22, 1, 0.36, 1];
const MAX_WEIGHT_KG = 500;   // same limits as the backend (apps/workouts/views.py)
const MAX_REPS = 100;

/** Field errors for a set, before it is sent. */
function checkSet(weight, reps) {
  const errors = {};
  const w = Number(weight);
  if (weight === '' || !Number.isFinite(w) || w < 0 || w > MAX_WEIGHT_KG) {
    errors.weight_kg = tl('Enter a weight between 0 and {0} kg.', { 0: MAX_WEIGHT_KG });
  } else if (Math.round(w * 100) !== w * 100) {
    errors.weight_kg = tl('Use at most 2 decimals (e.g. 22.5).');
  }
  const r = Number(reps);
  if (reps === '' || !Number.isInteger(r) || r < 1 || r > MAX_REPS) {
    errors.reps = tl('Enter whole reps between 1 and {0}.', { 0: MAX_REPS });
  }
  return errors;
}

const lineUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
};

const gridV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export default function MachineGuide() {
  const [params, setParams] = useSearchParams();
  const [scanning, setScanning] = useState(params.get('scan') === '1');
  const [qrInput, setQrInput] = useState('');
  const [picked, setPicked] = useState(null);
  const [searching, setSearching] = useState(false);

  const [restSeconds, setRestSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [totalRest, setTotalRest] = useState(90);

  const { data: exercises, loading } = useApi(
    () => workoutsService.exercises(),
    []
  );
  // Opened from a notification (/dashboard/machine-guide?exercise=<id>) until another machine is picked.
  const exerciseParam = params.get('exercise');
  const selectedExercise = picked
    ?? (exerciseParam && Array.isArray(exercises) ? exercises.find((e) => String(e.id) === exerciseParam) ?? null : null);

  // Update rest default when exercise changes
  useEffect(() => {
    if (selectedExercise?.default_rest_seconds) {
      setRestSeconds(selectedExercise.default_rest_seconds);
      setTotalRest(selectedExercise.default_rest_seconds);
      setTimerRunning(false);
    }
  }, [selectedExercise]);

  // Countdown
  useEffect(() => {
    if (!timerRunning) return;
    if (restSeconds <= 0) {
      setTimerRunning(false);
      return;
    }
    const t = setTimeout(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timerRunning, restSeconds]);

  const resetTimer = () => {
    const base = selectedExercise?.default_rest_seconds || 90;
    setRestSeconds(base);
    setTotalRest(base);
    setTimerRunning(false);
  };

  const addTime = (sec) => {
    setRestSeconds((s) => s + sec);
    setTotalRest((s) => s + sec);
  };

  // Called when user logs a set — saves to backend
  const handleLogSet = async ({ weight, reps }) => {
    if (!selectedExercise) return;
    try {
      const result = await workoutsService.quickLogSet(selectedExercise.id, {
        weight_kg: weight,
        reps,
        rpe: 8,
      });

      if (result.pr_achieved) {
        toast.success(tl("🏆 NEW PERSONAL RECORD!"));
      } else {
        toast.success(tl("Set {0} logged", { 0: result.set_number }));
      }

      // Reset timer for rest
      resetTimer();
      setTimerRunning(true);
    } catch (e) {
      toast.error(errorMessage(e, tl('Couldn’t log the set. Please try again.')));
      throw e;     // SetLogger shows the field errors
    }
  };

  const lookup = useCallback(async (raw) => {
    const tag = machineTagFrom(raw);
    if (!tag) return;
    setScanning(false);
    try {
      setSearching(true);
      const ex = await workoutsService.exerciseByQR(tag);
      setPicked(ex);
      setQrInput(tag);
      toast.success(tl("Found: {0}", { 0: getLocalized(ex, 'name') }));
    } catch {
      toast.error(tl("No machine matches that code"));
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = () => lookup(qrInput);

  // Opened from the dashboard scanner: /dashboard/machine-guide?qr=CODE
  const qrParam = params.get('qr');
  useEffect(() => {
    if (!qrParam) return undefined;
    const id = setTimeout(() => lookup(qrParam), 0);
    return () => clearTimeout(id);
  }, [qrParam, lookup]);

  const handleSelect = (ex) => {
    setPicked(ex);
  };


  return (
    <div className="relative flex flex-col w-full gap-space-xl px-space-xl py-space-xl">
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
          className="absolute -top-40 left-[15%] w-[460px] h-[460px] rounded-full bg-primary-container/10 blur-3xl"
          animate={{ x: [0, 36, 0], y: [0, 28, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <MachineBanner
        qrInput={qrInput}
        setQrInput={setQrInput}
        onSearch={handleSearch}
        onScan={() => setScanning(true)}
        searching={searching}
      />

      <QrScanner
        open={scanning}
        title={tl("Scan machine QR")}
        manualLabel={tl("Or type the machine code")}
        onResult={(code) => { setParams({ qr: code }); lookup(code); }}
        onClose={() => { setScanning(false); if (params.get('scan')) setParams({}); }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-space-lg items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="flex flex-col gap-space-lg"
        >
          {selectedExercise ? (
            <>
              <MachineVideos key={selectedExercise.id} exercise={selectedExercise} />
              <ExecutionPhases exercise={selectedExercise} />
            </>
          ) : (
            <NoSelection />
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-lg">
            <div className="md:col-span-7">
              <TargetBiomechanics exercise={selectedExercise} />
            </div>
            <div className="md:col-span-5 flex flex-col gap-space-md">
              <SeatMemory exercise={selectedExercise} />
              <AITrainingDirective exercise={selectedExercise} />
            </div>
          </div>

          <ExerciseList
            exercises={exercises}
            loading={loading}
            selectedExercise={selectedExercise}
            onSelect={handleSelect}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          className="flex flex-col gap-space-md lg:sticky lg:top-space-xl h-fit"
        >
          <RestTimer
            seconds={restSeconds}
            total={totalRest}
            running={timerRunning}
            onToggle={() => setTimerRunning((r) => !r)}
            onReset={resetTimer}
            onAdd={(s) => addTime(s)}
          />
          <SetLogger
            onLogSet={handleLogSet}
            exercise={selectedExercise}
            recommendedWeight={selectedExercise?.recommended_weight_kg}
          />
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   MACHINE BANNER
   ============================================================ */
function MachineBanner({ qrInput, setQrInput, onSearch, onScan, searching }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.09 } },
      }}
      className="flex flex-col gap-space-md"
    >
      <div className="flex flex-col gap-space-xs">
        <motion.div
          variants={lineUp}
          className="flex items-center gap-space-xs text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">
            precision_manufacturing
          </span>
          <span className="font-label-md text-label-md uppercase tracking-widest font-bold">
            {tl("Machine QR Guide")}
          </span>
        </motion.div>

        <motion.h1
          variants={lineUp}
          className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider leading-none m-0"
        >
          {tl("Exercise")}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
            {tl("Catalog")}
          </span>
        </motion.h1>

        <motion.p
          variants={lineUp}
          className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-2xl"
        >
          {tl("Scan a machine's QR code or search to view usage instructions, technique cues, and video tutorials.")}
        </motion.p>
      </div>

      <motion.div
        variants={lineUp}
        className="bg-surface-container rounded-xl p-space-lg"
      >
        <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider block mb-2">
          {tl("Machine code")}
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder={tl("Printed under the machine's QR")}
            className="flex-1 bg-surface-container-lowest text-on-surface p-3 rounded border border-surface-container-high focus:outline-none focus:border-primary font-mono"
          />
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSearch}
            disabled={searching}
            className="px-6 py-3 rounded bg-primary-container hover:bg-secondary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            type="button"
          >
            {searching ? tl("Searching...") : tl("Lookup")}
          </motion.button>
          <button type="button" onClick={onScan} aria-label={tl("Scan with camera")}
            className="px-4 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   EXECUTION PHASES
   ============================================================ */
function ExecutionPhases({ exercise }) {
  const phases = Array.isArray(exercise?.technique_phases)
    ? exercise.technique_phases
    : [];

  // Fallback to technique_cues if no structured phases
  const cues = Array.isArray(exercise?.technique_cues)
    ? exercise.technique_cues
    : [];

  if (phases.length === 0 && cues.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md"
    >
      <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
        {tl("Execution Protocol")}
      </span>
      <h2 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 mb-space-md">
        {tl("Technique Phases")}
      </h2>

      <motion.ol
        initial="hidden"
        animate="show"
        variants={gridV}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {phases.length > 0
          ? phases.map((p, i) => (
              <motion.li
                key={i}
                variants={lineUp}
                className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-primary">
                  <span className="font-label-md text-[10px] uppercase tracking-wider font-bold">
                    {p.num || tl("Phase 0{0}", { 0: i + 1 })}
                  </span>
                </div>
                <span className="font-title-md text-title-md text-on-surface uppercase">
                  {p.title}
                </span>
                <p className="font-body-md text-[11px] text-on-surface-variant leading-relaxed">
                  {p.desc}
                </p>
              </motion.li>
            ))
          : cues.map((cue, i) => (
              <motion.li
                key={i}
                variants={lineUp}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-lowest"
              >
                <span className="w-6 h-6 rounded-full bg-primary-container/20 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {cue}
                </span>
              </motion.li>
            ))}
      </motion.ol>
    </motion.div>
  );
}

/* ============================================================
   TARGET BIOMECHANICS (unchanged — but safe for null)
   ============================================================ */
function TargetBiomechanics({ exercise }) {
  if (!exercise) {
    return (
      <div className="bg-surface-container rounded-xl p-space-lg shadow-md text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
          accessibility_new
        </span>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          {tl("Select an exercise to view biomechanics.")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md"
    >
      <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
        {tl("Biomechanical Target")}
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 mb-space-md">
        {tl("Muscle Activation")}
      </h3>

      <div className="flex flex-col gap-3">
        <div>
          <span className="font-label-md text-[9px] text-on-surface-variant uppercase block mb-2">
            {tl("Primary")}
          </span>
          <span className="px-3 py-1 rounded bg-primary-container/20 text-primary text-[11px] font-bold uppercase tracking-wider inline-block">
            {exercise.primary_muscle || '—'}
          </span>
        </div>

        {Array.isArray(exercise.secondary_muscles) && exercise.secondary_muscles.length > 0 && (
          <div>
            <span className="font-label-md text-[9px] text-on-surface-variant uppercase block mb-2">
              {tl("Secondary")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {exercise.secondary_muscles.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant text-[10px] uppercase tracking-wider"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-surface-container-high">
          <span
            className={`w-2 h-2 rounded-full ${
              exercise.is_compound ? 'bg-primary-container' : 'bg-on-surface-variant'
            }`}
          />
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
            {exercise.is_compound ? tl("Compound Movement") : tl("Isolation Movement")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   SEAT MEMORY
   ============================================================ */
function SeatMemory({ exercise }) {
  if (!exercise?.qr_tag_id) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md"
    >
      <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
        {tl("Setup Memory")}
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 mb-2">
        {tl("QR Tag")}
      </h3>
      <div className="p-3 rounded bg-surface-container-lowest">
        <span className="font-mono text-[12px] text-primary block">
          {exercise.qr_tag_id}
        </span>
      </div>
    </motion.div>
  );
}

/* ============================================================
   TRAINING TARGETS (set per machine in admin)
   ============================================================ */
function AITrainingDirective({ exercise }) {
  if (!exercise) return null;

  const recommendedWeight = exercise.recommended_weight_kg;
  const intensity = exercise.target_intensity || '—';
  const cadence = exercise.cadence || '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
      className="relative bg-surface-container rounded-xl p-space-lg shadow-md overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />
      <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
        {tl("Training targets")}
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 mb-2">
        {tl("Training Target")}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest rounded-lg p-3">
          <span className="font-label-md text-[9px] text-on-surface-variant uppercase block">
            {tl("Recommended")}
          </span>
          <span className="font-headline-md text-headline-md text-on-surface block mt-1">
            {recommendedWeight ? `${Number(recommendedWeight).toFixed(1)}` : '—'}{' '}
            <span className="font-label-md text-[10px] text-primary font-bold">{tl("KG")}</span>
          </span>
        </div>
        <div className="bg-surface-container-lowest rounded-lg p-3">
          <span className="font-label-md text-[9px] text-on-surface-variant uppercase block">
            {tl("Intensity")}
          </span>
          <span className="font-title-md text-title-md text-primary block mt-1">
            {intensity}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container-high flex-wrap gap-2">
        <span className="flex items-center gap-1 font-label-md text-[10px] text-on-surface-variant uppercase">
          <span className="material-symbols-outlined text-primary text-sm">
            bolt
          </span>
          {tl("Cadence:")}{' '}{cadence}
        </span>
        {exercise.equipment_type && (
          <span className="font-label-md text-[10px] text-primary uppercase font-bold">
            {exercise.equipment_type}
          </span>
        )}
      </div>

      {exercise.description && (
        <p className="font-body-md text-body-md text-on-surface-variant mt-3 pt-3 border-t border-surface-container-high">
          {getLocalized(exercise, 'description')}
        </p>
      )}
    </motion.div>
  );
}

/* ============================================================
   REST TIMER — same design, but respects exercise default
   ============================================================ */
function RestTimer({ seconds, total, running, onToggle, onReset, onAdd }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (seconds / total) * 100)) : 0;
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md flex flex-col items-center gap-space-md relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />

      <div>
        <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
          {tl("Recovery Protocol")}
        </span>
        <h3 className="font-headline-md text-headline-md text-on-surface uppercase mt-1">
          {tl("Rest Timer")}
        </h3>
      </div>

      <div className="relative w-[140px] h-[140px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="8"
            className="stroke-surface-container-high"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-primary-container"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C - (C * pct) / 100 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-headline-lg text-headline-lg text-on-surface leading-none">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <span className="font-label-md text-[9px] text-on-surface-variant uppercase tracking-wider mt-1">
            {running ? tl("Active") : tl("Paused")}
          </span>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className="flex-1 py-2.5 rounded bg-primary-container hover:bg-secondary-container text-on-primary-container text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            {running ? 'pause' : 'play_arrow'}
          </span>
          {running ? tl("Pause") : tl("Start")}
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="px-3 py-2.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface-variant text-[10px] font-bold uppercase tracking-wider transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            restart_alt
          </span>
        </motion.button>
      </div>

      <div className="flex gap-2 w-full">
        {[30, 60, 90].map((s) => (
          <button
            key={s}
            onClick={() => onAdd(s)}
            className="flex-1 py-1.5 rounded bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider transition-colors"
            type="button"
          >
            +{s}s
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ============================================================
   SET LOGGER — now saves to backend
   ============================================================ */
function SetLogger({ onLogSet, exercise, recommendedWeight }) {
  const [weight, setWeight] = useState(
    recommendedWeight ? String(recommendedWeight) : ''
  );
  const [reps, setReps] = useState('8');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync weight when exercise changes
  useEffect(() => {
    if (recommendedWeight) {
      setWeight(String(recommendedWeight));
    } else {
      setWeight('');
    }
  }, [recommendedWeight]);

  const handleSubmit = async () => {
    if (!exercise) return;
    const found = checkSet(weight, reps);
    setErrors(found);
    if (Object.keys(found).length) return;
    setLoading(true);
    try {
      await onLogSet({ weight, reps });
      setReps('8');
    } catch (e) {
      setErrors(fieldErrors(e));
    } finally {
      setLoading(false);
    }
  };
  const inputCls = (bad) => `w-full bg-surface-container-lowest text-on-surface p-3 rounded border focus:outline-none font-mono ${
    bad ? 'border-error focus:border-error' : 'border-surface-container-high focus:border-primary'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-transparent" />

      <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
        {tl("Session Log")}
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 mb-space-md">
        {tl("Log a Set")}
      </h3>

      {!exercise ? (
        <div className="text-center py-4">
          <p className="font-body-md text-body-md text-on-surface-variant">
            {tl("Select an exercise to log sets.")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase block mb-1">
                {tl("Weight (kg)")}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_WEIGHT_KG}
                step="0.5"
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setErrors((x) => ({ ...x, weight_kg: undefined })); }}
                placeholder="0"
                aria-invalid={!!errors.weight_kg}
                aria-describedby={errors.weight_kg ? 'set-weight-err' : undefined}
                className={inputCls(errors.weight_kg)}
              />
              {errors.weight_kg && <p id="set-weight-err" role="alert" className="text-error text-[12px] mt-1">{errors.weight_kg}</p>}
            </div>
            <div>
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase block mb-1">
                {tl("Reps")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_REPS}
                step="1"
                value={reps}
                onChange={(e) => { setReps(e.target.value); setErrors((x) => ({ ...x, reps: undefined })); }}
                placeholder="0"
                aria-invalid={!!errors.reps}
                aria-describedby={errors.reps ? 'set-reps-err' : undefined}
                className={inputCls(errors.reps)}
              />
              {errors.reps && <p id="set-reps-err" role="alert" className="text-error text-[12px] mt-1">{errors.reps}</p>}
            </div>
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded bg-primary-container hover:bg-secondary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              {loading ? 'sync' : 'check_circle'}
            </span>
            {loading ? tl("Logging...") : tl("Log Set & Start Rest")}
          </motion.button>
        </>
      )}
    </motion.div>
  );
}

/* ============================================================
   EXERCISE LIST
   ============================================================ */
function ExerciseList({ exercises, loading, selectedExercise, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-lg shadow-md"
    >
      <h2 className="font-headline-md text-headline-md text-on-surface uppercase mb-space-md">
        {tl("All Exercises (")}{exercises?.length || 0})
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-container-low rounded animate-pulse"
            />
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-low rounded-lg">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
            fitness_center
          </span>
          <p className="font-title-md text-title-md text-on-surface mt-3">
            {tl("No exercises yet")}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {tl("Add exercises via the admin panel.")}
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={gridV}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto"
        >
          {exercises.map((ex) => (
            <motion.button
              key={ex.id}
              variants={lineUp}
              onClick={() => onSelect(ex)}
              className={`text-left p-4 rounded-lg border transition-all ${
                selectedExercise?.id === ex.id
                  ? 'bg-primary-container/15 border-primary-container'
                  : 'bg-surface-container-lowest border-surface-container-high hover:border-primary/50'
              }`}
              type="button"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-md text-[10px] text-primary uppercase tracking-wider font-bold">
                    {ex.category}
                  </span>
                  <h3 className="font-title-md text-title-md text-on-surface mt-1">
                    {getLocalized(ex, 'name')}
                  </h3>
                  <span className="font-label-md text-[10px] text-on-surface-variant uppercase">
                    {ex.primary_muscle}
                  </span>
                </div>
                {ex.qr_tag_id && (
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    qr_code_2
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ============================================================
   NO SELECTION
   ============================================================ */
function NoSelection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="bg-surface-container rounded-xl p-space-xl text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full bg-surface-container-high/40 blur-3xl" />
      </div>
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 relative z-10 inline-block mb-space-md">
        touch_app
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase mb-2 relative z-10">
        {tl("Select an Exercise")}
      </h3>
      <p className="font-body-md text-on-surface-variant relative z-10">
        {tl("Choose from the list below or scan a QR tag to load machine telemetry.")}
      </p>
    </motion.div>
  );
}