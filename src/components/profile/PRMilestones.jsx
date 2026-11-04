// src/components/profile/PRMilestones.jsx
import { motion } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

export default function PRMilestones({ prs, loading }) {
  const list = Array.isArray(prs) ? prs : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-lg bg-surface-container p-space-xl flex flex-col justify-between shadow-lg"
    >
      <div>
        <div className="flex items-center justify-between mb-space-md flex-wrap gap-2">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-primary uppercase tracking-widest font-bold">
              {tl("Validated Achievements")}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
              {tl("Personal Records")}
            </h2>
          </div>
          <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface font-label-md text-label-md font-bold uppercase">
            {list.length}{' '}{tl("PRs")}
          </span>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
          {tl("Verified by Smart Gym plate sensors and linear transducer telemetry.")}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-container-low rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low rounded-lg">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
            emoji_events
          </span>
          <p className="font-title-md text-title-md text-on-surface mt-3">
            {tl("No PRs yet")}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {tl("Log heavy sets in the Machine Guide to set your first record.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          {list.map((pr, i) => (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
              whileHover={{ y: -3 }}
              className="p-space-md rounded bg-surface-container-low flex items-start gap-space-md relative overflow-hidden group hover:bg-surface-container-high transition-all"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
              <div className="w-12 h-12 rounded bg-primary-container/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[28px]">
                  trophy
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface leading-snug">
                  {getLocalized(pr, 'exercise_name')}
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  {Number(pr.best_weight_kg).toFixed(1)}{' '}{tl("kg ×")}{' '}{pr.best_reps} reps
                </span>
                <span className="font-label-md text-label-md text-primary font-bold mt-1">
                  {tl("Estimated 1RM:")}{' '}{Number(pr.best_estimated_1rm).toFixed(1)} kg
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-space-lg p-space-sm rounded bg-surface-container-lowest flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">
            verified
          </span>
          <span className="font-body-md text-body-md text-on-surface">
            {list.length > 0
              ? tl("Logged {0} verified record{1}", { 0: list.length, 1: list.length > 1 ? 's' : '' })
              : tl("Start logging to build your record history")}
          </span>
        </div>
        <button className="font-label-md text-label-md text-primary uppercase font-bold hover:underline">
          {tl("View Full Log")}
        </button>
      </div>
    </motion.div>
  );
}