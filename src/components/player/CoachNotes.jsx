import { motion } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

export default function CoachNotes({ trainer, course }) {
  const coachName = trainer?.user?.full_name || course?.trainer_name || 'Your Coach';
  const coachRole = trainer?.title || 'Instructor';
  const initials = coachName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-md"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-space-sm">
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {trainer?.user?.avatar ? (
              <img
                src={trainer.user.avatar}
                alt={coachName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[12px]">
                {initials}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-title-md font-title-md text-on-surface leading-tight">
              {coachName}
            </span>
            <span className="text-label-md font-label-md text-primary tracking-wider uppercase">
              {coachRole}
            </span>
          </div>
        </div>

        {course?.category && (
          <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-space-2xs rounded-lg">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase">
              {tl("Category:")}
            </span>
            <span className="text-label-lg font-label-lg text-on-surface">
              {course.category}
            </span>
          </div>
        )}
      </div>

      <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
        {trainer?.bio ||
          course?.description ||
          tl("Follow the day-by-day protocol. Log each set to sync your velocity and tonnage to your profile.")}
      </p>

      {trainer && getLocalized(trainer, 'credentials') && (
        <div className="p-space-sm rounded-lg bg-surface-container-lowest flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-title-md">
              verified
            </span>
            <span className="text-label-md font-label-md text-on-surface-variant uppercase">
              {tl("Credentials:")}
            </span>
            <span className="text-body-md font-body-md text-on-surface">
              {getLocalized(trainer, 'credentials')}
            </span>
          </div>
          {trainer.years_experience > 0 && (
            <span className="font-headline-md text-headline-md text-primary">
              {trainer.years_experience}{tl("+ YRS")}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}