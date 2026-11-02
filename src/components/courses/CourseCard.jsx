import { motion } from 'framer-motion';
import { categoryLabel } from './courseOptions';
import CountUp from '../CountUp';
import { tl } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

export default function CourseCard({ course, index = 0, enrolled, onEnroll }) {
  // Backend uses `cover_image_url` / `trainer_name` / `duration_weeks` / `level`
  const image = course.cover_image_url || course.image;
  const trainer = course.trainer_name || course.author || 'Smart Gym';
  const trainerRole = course.trainer_title || course.trainer_role || '';
  const duration = course.duration_weeks
    ? `${course.duration_weeks} Weeks`
    : course.duration;
  const level = course.level?.replace('_', ' ') || 'All Levels';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.22 } }}
      transition={{
        duration: 0.45,
        delay: index * 0.05,
        ease: EASE,
        layout: { type: 'spring', stiffness: 320, damping: 30 },
      }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 380, damping: 20 } }}
      className="bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex flex-col">
        {/* Thumbnail */}
        <div className="relative w-full h-52 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-container/30 to-secondary-container/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />

          {/* Sheen sweep */}
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[320%] transition-transform duration-[900ms] ease-out" />
          </div>

          <motion.div
            className="absolute top-space-sm left-space-sm flex gap-space-2xs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05, duration: 0.4, ease: EASE }}
          >
            <span className="bg-surface-container-lowest/80 backdrop-blur-md font-label-md text-label-md uppercase tracking-wider px-space-xs py-space-2xs rounded-sm text-primary">
              {categoryLabel(course.category)}
            </span>
          </motion.div>

          {/* Enrollment badge */}
          {enrolled && (
            <div className="absolute top-space-sm right-space-sm bg-primary-container text-on-primary-container font-label-md text-label-md uppercase tracking-wider px-space-xs py-space-2xs rounded-sm">
              {tl("Enrolled")}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05, type: 'spring', stiffness: 320, damping: 20 }}
            className="absolute bottom-space-xs right-space-sm flex items-center gap-space-2xs bg-surface-container-lowest/90 backdrop-blur-md px-space-xs py-space-2xs rounded-sm"
          >
            <motion.span
              className="material-symbols-outlined text-primary-container text-body-md"
              style={{ fontVariationSettings: "'FILL' 1" }}
              animate={{ scale: [1, 1.18, 1], rotate: [0, 12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              star
            </motion.span>
            <span className="font-label-lg text-label-lg text-on-surface tabular-nums">
              {course.rating || '—'}
            </span>
          </motion.div>
        </div>

        {/* Meta */}
        <div className="p-space-md flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="relative">
              {course.trainer_avatar ? (
                <img
                  src={course.trainer_avatar}
                  alt={trainer}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-surface-container-highest"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container text-[10px] font-bold">
                  {trainer.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-container ring-2 ring-surface-container-lowest" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase leading-none">
                {trainer}
              </span>
              <span className="font-label-md text-label-md text-primary tracking-widest leading-tight">
                {trainerRole}
              </span>
            </div>
          </div>

          <h3 className="font-headline-md text-headline-md uppercase text-on-surface tracking-wide mt-space-xs leading-tight transition-colors duration-300 group-hover:text-primary">
            {course.title}
          </h3>

          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
            {course.subtitle || course.description}
          </p>

          <div className="flex items-center justify-between text-on-surface-variant pt-space-xs mt-space-xs border-t border-surface-container-high/60">
            <span className="flex items-center gap-space-2xs font-label-md text-label-md uppercase">
              <span className="material-symbols-outlined text-body-md">
                calendar_today
              </span>{' '}
              {duration}
            </span>
            <span className="flex items-center gap-space-2xs font-label-md text-label-md uppercase text-primary">
              <span className="material-symbols-outlined text-body-md">
                signal_cellular_alt
              </span>{' '}
              {level}
            </span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="p-space-md pt-0">
        <div className="flex items-center justify-between mb-space-sm">
          <span className="font-headline-md text-headline-md text-on-surface tabular-nums">
            {course.free_for_me ? tl("Free") : (
              <>
                {tl("SAR")}{' '}
                <CountUp
                  to={Number(course.price) || 0}
                  duration={1.2}
                  delay={0.3 + index * 0.05}
                  decimals={course.price % 1 !== 0 ? 2 : 0}
                />
              </>
            )}
          </span>
          <span className="font-label-md text-label-md uppercase text-on-surface-variant">
            {course.free_for_me && Number(course.price) > 0 ? tl("Included in your plan") : tl("Lifetime access")}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => !enrolled && onEnroll?.(course)}
          disabled={enrolled}
          className={`relative w-full font-label-lg text-label-lg uppercase tracking-widest py-space-sm rounded-sm transition-colors duration-300 flex items-center justify-center gap-space-xs overflow-hidden group/btn ${
            enrolled
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              : 'bg-surface-container-high hover:bg-primary-container hover:text-on-primary-container text-on-surface'
          }`}
          type="button"
        >
          {!enrolled && (
            <span className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover/btn:translate-x-[320%] transition-transform duration-700 ease-out" />
          )}
          <span className="material-symbols-outlined text-title-md relative z-10">
            {enrolled ? 'check_circle' : 'touch_app'}
          </span>
          <span className="relative z-10">
            {enrolled ? tl("Enrolled") : course.free_for_me ? tl("Enroll") : tl("Buy & enroll")}
          </span>
        </motion.button>
      </div>
    </motion.article>
  );
}