// src/components/profile/ProfileBanner.jsx
import { motion } from 'framer-motion';
import { formatRemaining } from '../../utils/membershipTime';
import { tl } from '../../i18n';
export default function ProfileBanner({
  displayName,
  initials,
  user,
  membership,
  stats,
  onExport,
}) {
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const tier = membership?.plan?.display_name || 'Member';
  const totalWorkouts = stats?.total_workouts ?? 0;
  const totalPrs = stats?.total_prs ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full rounded-lg bg-surface-container overflow-hidden shadow-xl p-space-xl mb-space-xl"
    >
      <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary-container via-primary to-transparent" />

      <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-xl">
        {/* Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover bg-surface-container-high shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[32px] shadow-[0_0_24px_rgba(229,25,55,0.4)]">
                {initials}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider leading-none">
                {displayName}
              </h1>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-highest text-primary font-label-md text-label-md uppercase font-bold tracking-widest">
                {tier}
              </span>
            </div>

            <span className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
              {user?.email}
            </span>

            <div className="flex items-center gap-space-md text-on-surface-variant font-body-md text-body-md mt-space-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  calendar_month
                </span>
                {tl("Member Since")}{' '}{memberSince}
              </span>
              <span className="text-surface-bright">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  fitness_center
                </span>
                {totalWorkouts}{' '}{tl("Workouts")}
              </span>
              <span className="text-surface-bright">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  emoji_events
                </span>
                {totalPrs}{' '}{tl("PRs")}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry */}
        <div className="flex flex-wrap items-stretch gap-space-md w-full xl:w-auto justify-start xl:justify-end border-t xl:border-t-0 border-surface-container-high pt-space-md xl:pt-0">
          <div className="px-space-md py-space-sm rounded bg-surface-container-lowest flex flex-col min-w-[120px] flex-1 sm:flex-none">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              {tl("Membership left")}
            </span>
            <span className="font-headline-md text-headline-md text-primary tracking-wide">
              {formatRemaining(membership?.time_remaining)}
            </span>
          </div>

          <div className="px-space-md py-space-sm rounded bg-surface-container-lowest flex flex-col min-w-[120px] flex-1 sm:flex-none">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              {tl("Visits")}
            </span>
            <span className="font-headline-md text-headline-md text-on-surface tracking-wide">
              {membership?.total_check_ins ?? 0}
            </span>
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="px-space-lg py-space-sm rounded bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-label-lg text-label-lg uppercase tracking-wider font-bold shadow-[0_0_16px_rgba(229,25,55,0.4)] transition-all flex items-center gap-space-xs self-stretch xl:self-auto justify-center w-full sm:w-auto py-3 sm:py-space-sm"
            type="button"
            onClick={onExport}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {tl("Download my data")}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}