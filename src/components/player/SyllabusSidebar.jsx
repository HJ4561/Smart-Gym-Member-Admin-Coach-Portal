import { motion } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

// Clicking a day only opens it; finishing a day is the explicit button under the video.
export default function SyllabusSidebar({ modules = [], enrollment, selectedId, onSelect }) {
  const progress = enrollment?.progress_percent ?? 0;
  const completedCount = enrollment?.completed_count ?? 0;
  const totalModules = enrollment?.total_modules ?? modules.length;

  // Group modules by week_number
  const weeks = {};
  modules.forEach((m) => {
    const w = m.week_number || 1;
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push(m);
  });

  return (
    <div className="flex flex-col gap-space-md">
      {/* Progress header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs"
      >
        <div className="flex items-center justify-between">
          <span className="font-headline-md text-headline-md text-on-surface tracking-wider uppercase">
            {tl("Course Syllabus")}
          </span>
          <span className="text-label-lg font-label-lg text-primary uppercase">
            {progress}{tl("% Completed")}
          </span>
        </div>
        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-space-2xs">
          <motion.div
            className="h-full bg-primary-container rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        <div className="flex justify-between items-center text-label-md font-label-md text-on-surface-variant mt-1">
          <span>{tl("Week {0} of {1}", { 0: modules.find((m) => m.is_current)?.week_number || Object.keys(weeks).length, 1: Object.keys(weeks).length })}</span>
          <span>{completedCount} / {totalModules}{' '}{tl("Modules")}</span>
        </div>
      </motion.div>

      {/* Week groups */}
      <div className="flex flex-col gap-space-xs max-h-[600px] overflow-y-auto pr-1">
        {Object.entries(weeks).map(([weekNum, weekModules], i) => {
          const allDone = weekModules.every((m) => m.is_completed);
          const hasCurrent = weekModules.some((m) => m.is_current);

          return (
            <motion.div
              key={weekNum}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              className={`rounded-xl p-space-md flex flex-col gap-space-2xs transition-colors ${
                hasCurrent
                  ? 'bg-surface-container shadow-md border border-primary-container/30'
                  : allDone
                  ? 'bg-surface-container-low hover:bg-surface-container'
                  : 'bg-surface-container-lowest opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-space-xs">
                  {allDone ? (
                    <span
                      className="material-symbols-outlined text-primary text-title-md"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : hasCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
                  ) : (
                    <span className="material-symbols-outlined text-outline text-title-md">
                      lock
                    </span>
                  )}
                  <span className="font-title-md text-title-md text-on-surface uppercase">
                    {tl("Week")}{' '}{String(weekNum).padStart(2, '0')}
                  </span>
                </div>
                {hasCurrent && (
                  <span className="text-label-md font-label-md text-on-primary-container bg-primary-container px-space-xs py-0.5 rounded uppercase">
                    {tl("In Progress")}
                  </span>
                )}
                {allDone && (
                  <span className="text-label-md font-label-md text-primary bg-primary-container/10 px-space-xs py-0.5 rounded uppercase">
                    100%
                  </span>
                )}
              </div>

              {/* Module list for this week */}
              <div className="flex flex-col gap-1 pl-space-xs">
                {weekModules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelect?.(m)}
                    aria-current={selectedId === m.id ? 'step' : undefined}
                    title={tl("Open this day")}
                    className={`flex items-center justify-between gap-2 p-space-xs rounded-lg transition-colors text-start ${
                      selectedId === m.id
                        ? 'bg-surface-container-high ring-1 ring-primary-container/60'
                        : 'hover:bg-surface-container-high'
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-space-xs min-w-0">
                      {m.is_completed && (
                        <span className="material-symbols-outlined text-primary text-title-md">
                          check
                        </span>
                      )}
                      {m.is_current && (
                        <span
                          className="material-symbols-outlined text-primary-container text-title-md"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          play_circle
                        </span>
                      )}
                      {!m.is_completed && !m.is_current && (
                        <span className="material-symbols-outlined text-outline text-title-md">
                          lock
                        </span>
                      )}
                      <span
                        className={`text-body-md font-body-md truncate ${
                          m.is_current
                            ? 'text-primary font-title-md text-title-md'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {getLocalized(m, 'title')}
                      </span>
                    </div>
                    <span
                      className={`text-label-md font-label-md uppercase whitespace-nowrap ${
                        m.is_current
                          ? 'text-primary-container font-bold'
                          : 'text-outline'
                      }`}
                    >
                      {m.is_completed ? tl("Done") : m.is_current ? tl("Now") : `${m.duration_minutes}m`}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}