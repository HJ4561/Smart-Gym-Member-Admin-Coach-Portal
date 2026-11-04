import { motion } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

export default function PlayerHeader({ course, currentModule, enrollment, onLog, logged, starting }) {
  const moduleLabel = currentModule
    ? `Week ${currentModule.week_number} · Day ${currentModule.day_number}`
    : 'Curriculum';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-surface-container-lowest rounded-xl p-space-lg flex flex-col xl:flex-row xl:items-center justify-between gap-space-md shadow-sm relative overflow-hidden"
    >
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-space-2xs relative z-10 min-w-0">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-primary-container/15 text-primary text-label-md font-label-md uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
            {enrollment?.status === 'completed' ? tl("Course Complete") : tl("Live Curriculum")}
          </span>
          <span className="text-outline text-label-md font-label-md">/</span>
          <span className="text-on-surface-variant text-label-md font-label-md uppercase tracking-widest">
            {moduleLabel}
          </span>
        </div>
        <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-wider uppercase leading-tight m-0">
          {course?.title || tl("Course Player")}
          {currentModule && (
            <>
              <span className="text-primary-container font-headline-md text-headline-md tracking-normal mx-2">
                •
              </span>
              {getLocalized(currentModule, 'title')}
            </>
          )}
        </h1>
      </div>

      <div className="flex items-center gap-space-sm relative z-10 flex-shrink-0 flex-wrap">
        {currentModule?.pdf_url && (
          <motion.a
            whileTap={{ scale: 0.95 }}
            href={currentModule.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-bright transition-colors font-label-lg text-label-lg uppercase"
            type="button"
          >
            <span className="material-symbols-outlined text-title-md">picture_as_pdf</span>
            <span>{tl("Day PDF")}</span>
          </motion.a>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onLog}
          disabled={starting || !course}
          className={`flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg transition-all shadow-md font-label-lg text-label-lg uppercase disabled:opacity-50 ${
            logged
              ? 'bg-surface-container-highest text-primary'
              : 'bg-primary-container text-on-primary-container hover:bg-secondary-container'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-title-md"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {starting ? 'sync' : logged ? 'done_all' : 'check_circle'}
          </span>
          <span>
            {starting ? tl("Starting...") : logged ? tl("Session Logged!") : tl("Start Workout")}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}