import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { workoutsService } from '../services/workoutsService';
import { errorMessage } from '../utils/apiError';
import { getLocalized, tl, locale } from '../i18n';

const EASE = [0.22, 1, 0.36, 1];

/**
 * Today's in-progress workout: log sets per exercise, or finish the session.
 * `workout` comes from the dashboard API (null when nothing is in progress).
 */
export default function WorkoutCard({ workout, onStartWorkout, starting, onChanged }) {
  const exercises = workout?.exercises || [];
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (!workout) return;
    setFinishing(true);
    try {
      const done = await workoutsService.complete(workout.id);
      toast.success(tl("Workout saved — {0} sets, {1} kg", { 0: done.total_sets, 1: Number(done.total_tonnage_kg).toLocaleString(locale) }));
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e, tl("Could not finish the workout")));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="lg:col-span-8 bg-surface-container rounded-xl p-space-lg shadow-xl relative overflow-hidden flex flex-col gap-space-md"
    >
      <span className="material-symbols-outlined absolute -right-10 -bottom-16 text-on-surface/5 pointer-events-none select-none"
        style={{ fontSize: '260px', lineHeight: 1 }} aria-hidden="true">
        fitness_center
      </span>

      <div className="relative flex items-start justify-between gap-space-md flex-wrap">
        <div className="flex flex-col gap-1">
          <span className={`w-fit px-space-xs py-0.5 rounded font-label-md text-label-md uppercase tracking-widest font-bold ${
            workout ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
            {workout ? tl("In progress") : tl("Ready")}
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide m-0">
            {workout?.name || tl("Ready for today’s session")}
          </h2>
          <span className="font-body-md text-body-md text-on-surface-variant">
            {workout
              ? tl("Started {0} · {1} exercise{2} · {3} sets", { 0: new Date(workout.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 1: exercises.length, 2: exercises.length === 1 ? '' : 's', 3: exercises.reduce((n, e) => n + (e.total_sets || 0), 0) })
              : tl("Start a session, then scan machines or pick exercises to log your sets.")}
          </span>
        </div>
      </div>

      {workout && exercises.length > 0 && (
        <div className="relative flex flex-col gap-space-xs">
          {exercises.map((ex) => <ExerciseRow key={ex.id} ex={ex} onLogged={onChanged} />)}
        </div>
      )}

      {workout && exercises.length === 0 && (
        <div className="relative rounded-lg bg-surface-container-low p-space-md text-on-surface-variant text-[13px]">
          {tl("No exercises yet — scan a machine or open the")}{' '}
          <Link to="/dashboard/machine-guide" className="text-primary hover:underline">{tl("Machine Guide")}</Link>{' '}{tl("to log your first set.")}
        </div>
      )}

      <div className="relative flex gap-space-sm flex-wrap mt-auto">
        {!workout ? (
          <button type="button" onClick={onStartWorkout} disabled={starting}
            className="px-space-lg py-space-sm rounded bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-lg uppercase tracking-wider font-bold flex items-center gap-space-xs disabled:opacity-60">
            <span className="material-symbols-outlined text-[18px]">{starting ? 'sync' : 'play_arrow'}</span>
            {starting ? tl("Starting…") : tl("Start workout")}
          </button>
        ) : (
          <>
            <Link to="/dashboard/machine-guide"
              className="px-space-lg py-space-sm rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg uppercase tracking-wider font-bold flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px]">add</span>{' '}{tl("Add exercise")}
            </Link>
            <button type="button" onClick={finish} disabled={finishing}
              className="px-space-lg py-space-sm rounded bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-lg uppercase tracking-wider font-bold flex items-center gap-space-xs disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">flag</span>
              {finishing ? tl("Saving…") : tl("Finish workout")}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function ExerciseRow({ ex, onLogged }) {
  const last = ex.sets?.[ex.sets.length - 1];
  const [reps, setReps] = useState(String(last?.reps ?? 8));
  const [weight, setWeight] = useState(String(last?.weight_kg ?? 0));
  const [saving, setSaving] = useState(false);

  const log = async (e) => {
    e.preventDefault();
    const r = parseInt(reps, 10);
    const w = parseFloat(weight);
    if (!(r > 0) || !(w >= 0)) {
      toast.error(tl("Enter reps and weight"));
      return;
    }
    setSaving(true);
    try {
      const set = await workoutsService.logSet(ex.id, { set_number: (ex.total_sets || 0) + 1, reps: r, weight_kg: w });
      toast.success(set.is_pr ? tl("New PR on {0}!", { 0: getLocalized(ex, 'name') }) : tl("Set {0} logged", { 0: set.set_number }));
      onLogged?.();
    } catch (err) {
      toast.error(errorMessage(err, tl("Could not log the set")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={log} className="flex items-center justify-between gap-space-sm bg-surface-container-low rounded-lg px-space-md py-space-sm flex-wrap">
      <div className="flex flex-col min-w-0">
        <span className="font-title-md text-title-md text-on-surface truncate">{getLocalized(ex, 'name')}</span>
        <span className="font-label-md text-label-md text-on-surface-variant uppercase">
          {ex.muscle ? `${ex.muscle} · ` : ''}{ex.total_sets || 0} sets{last ? tl(" · last {0} kg × {1}", { 0: last.weight_kg, 1: last.reps }) : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input aria-label={tl("{0} reps", { 0: getLocalized(ex, 'name') })} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)}
          className="w-14 bg-surface-container-lowest text-on-surface text-center px-1 py-1 rounded border border-surface-container-high" />
        <span className="text-on-surface-variant text-[11px]">{tl("reps ×")}</span>
        <input aria-label={tl("{0} weight in kg", { 0: getLocalized(ex, 'name') })} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)}
          className="w-16 bg-surface-container-lowest text-on-surface text-center px-1 py-1 rounded border border-surface-container-high" />
        <span className="text-on-surface-variant text-[11px]">kg</span>
        <button type="submit" disabled={saving}
          className="ml-1 px-space-sm py-1 rounded bg-primary-container text-on-primary-container font-label-md text-label-md uppercase font-bold disabled:opacity-60">
          {saving ? '…' : tl("+ Log")}
        </button>
      </div>
    </form>
  );
}
