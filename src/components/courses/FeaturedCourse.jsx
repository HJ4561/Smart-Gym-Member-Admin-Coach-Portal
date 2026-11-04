import { motion } from 'framer-motion';
import { categoryLabel } from './courseOptions';
import CountUp from '../CountUp';
import { getLocalized, tl, locale } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

export default function FeaturedCourse({ course, enrolled, onEnroll }) {
  if (!course) return null;

  const stats = [
    {
      label: tl("Duration"),
      value: `${course.duration_weeks} Weeks`,
      accent: false,
    },
    {
      label: tl("Frequency"),
      value: `${course.days_per_week} Days/Wk`,
      accent: false,
    },
    {
      label: tl("Intensity"),
      value: course.level?.replace('_', ' ') || 'All Levels',
      accent: true,
    },
  ];

  const image = course.cover_image_url;
  const rating = course.rating || '—';
  const enrolledCount = course.total_enrolled || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
      className="relative w-full rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl flex flex-col lg:flex-row min-h-[380px]"
    >
      {/* Image */}
      <div className="relative lg:w-7/12 w-full h-72 lg:h-auto overflow-hidden">
        {image && (
          <motion.img
            src={image}
            alt={getLocalized(course, 'title')}
            className="w-full h-full object-cover object-center"
            animate={{ scale: [1.06, 1.12, 1.06] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/70 to-transparent" />

        <motion.div
          className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent pointer-events-none"
          animate={{ left: ['-12%', '106%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear', delay: 1.5 }}
        />

        <div className="absolute top-space-md left-space-md flex flex-wrap gap-space-2xs">
          <motion.span
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 320, damping: 20 }}
            className="bg-primary-container text-on-primary-container font-label-lg text-label-lg uppercase px-space-sm py-space-2xs rounded-sm tracking-wider shadow-lg shadow-[0_0_20px_rgba(229,25,55,0.4)]"
          >
            {tl("Masterclass of the Month")}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 20 }}
            className="bg-surface-container-highest/80 backdrop-blur-md text-on-surface font-label-md text-label-md uppercase px-space-sm py-space-2xs rounded-sm flex items-center gap-space-2xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping" />
            {tl("Live Tracking Supported")}
          </motion.span>
        </div>
      </div>

      {/* Content */}
      <div className="relative lg:w-5/12 w-full p-space-lg lg:p-space-xl flex flex-col justify-between bg-surface-container-lowest">
        <span className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary-container/50 to-transparent" />

        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-space-xs flex-wrap">
            <div className="flex items-center gap-space-xs">
              <span
                className="material-symbols-outlined text-primary-container text-title-md"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="font-title-md text-title-md text-on-surface font-bold tabular-nums">
                {rating}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                ({enrolledCount.toLocaleString(locale)}{' '}{tl("Athletes)")}
              </span>
            </div>
            <span className="font-label-md text-label-md text-primary uppercase bg-surface-container px-space-xs py-space-2xs rounded-sm">
              {categoryLabel(course.category)}
            </span>
          </div>

          <h2 className="font-headline-lg text-headline-lg uppercase text-on-surface tracking-wider mt-space-sm leading-tight m-0">
            {getLocalized(course, 'title')}
          </h2>

          <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
            {tl("By")}{' '}<strong className="text-on-surface">{course.trainer_name}</strong>.{' '}
            {getLocalized(course, 'subtitle') || getLocalized(course, 'description')}
          </p>

          <div className="grid grid-cols-3 gap-space-xs mt-space-md pt-space-md bg-surface-container-low/50 rounded-lg p-space-sm">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">
                  {s.label}
                </span>
                <span
                  className={`font-title-md text-title-md capitalize ${
                    s.accent ? 'text-primary' : 'text-on-surface'
                  }`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-space-lg flex items-center justify-between gap-space-md pt-space-md border-t border-surface-container-high/60">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-space-2xs">
              <span className="font-headline-md text-headline-md text-on-surface leading-none tabular-nums">
                {course.free_for_me ? tl("Free") : (
                  <CountUp
                    to={Number(course.price) || 0}
                    duration={1.2}
                    delay={0.9}
                    decimals={course.price % 1 !== 0 ? 2 : 0}
                  />
                )}
              </span>
              {!course.free_for_me && (
                <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                  {tl("SAR")}
                </span>
              )}
            </div>
            {course.is_included_with_pro && (
              <span className="font-label-md text-label-md text-primary tracking-wide">
                {tl("Included with Pro")}
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => !enrolled && onEnroll?.(course)}
            disabled={enrolled}
            className={`relative px-space-lg py-space-sm rounded-sm font-label-lg text-label-lg uppercase tracking-widest flex items-center gap-space-xs transition-colors group overflow-hidden ${
              enrolled
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : 'bg-primary-container text-on-primary-container hover:bg-secondary-container shadow-[0_0_20px_rgba(229,25,55,0.35)]'
            }`}
            type="button"
          >
            {!enrolled && (
              <motion.span
                className="absolute inset-0 rounded-sm bg-primary-container/50 pointer-events-none"
                animate={{ scale: [1, 1.15], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <span className="relative z-10">{enrolled ? tl("Enrolled") : tl("Enroll Now")}</span>
            <span className="material-symbols-outlined text-title-md relative z-10 transition-transform duration-300 group-hover:translate-x-1">
              {enrolled ? 'check_circle' : 'arrow_forward'}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}