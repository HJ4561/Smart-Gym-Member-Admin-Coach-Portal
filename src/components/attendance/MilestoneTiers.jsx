import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { attendanceService } from '../../services/attendanceService';
import { getLocalized, tl } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

export default function MilestoneTiers({ milestones, onClaim }) {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const handleClaim = async (id) => {
    try {
      await attendanceService.claimMilestone(id);
      toast.success(tl("Milestone claimed! 🎉"));
      onClaim?.();
    } catch (e) {
      toast.error(tl("Failed to claim"));
    }
  };

    if (!safeMilestones || safeMilestones.length === 0) {
    return (
      <div className="text-center py-10 bg-surface-container-low rounded-xl">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">emoji_events</span>
        <p className="text-on-surface-variant mt-2">{tl("No milestones configured")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-label-md text-label-md uppercase text-primary tracking-widest font-bold">
            {tl("Incentive Engines")}
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
            {tl("Milestone Reward Tiers")}
          </h2>
        </div>
        <span className="font-label-md text-label-md uppercase text-on-surface-variant">
          {tl("Continuous Streak unlocks automated perks")}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {safeMilestones.map((m, i) => {
          const isClaimed = m.status === 'claimed';
          const isActive = m.status === 'active';
          const isLocked = m.status === 'locked';

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={`group rounded-lg bg-surface-container p-space-lg shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden ${
                isLocked ? 'opacity-75' : ''
              }`}
            >
              {isClaimed && (
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-container/10 rounded-full blur-xl pointer-events-none" />
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className={`material-symbols-outlined text-[24px] ${
                    isActive ? 'text-primary' : isClaimed ? 'text-primary-container' : 'text-on-surface-variant'
                  }`}>
                    {m.icon}
                  </span>
                  <span className={`font-label-md text-label-md uppercase tracking-wider font-bold ${
                    isLocked ? 'text-on-surface-variant' : 'text-primary'
                  }`}>
                    {getLocalized(m, 'tier')}
                  </span>
                </div>
                <span className={`px-space-xs py-0.5 rounded font-label-md text-label-md font-bold uppercase ${
                  isClaimed
                    ? 'bg-primary-container text-on-primary-container'
                    : isActive
                    ? 'bg-surface-container-high text-primary'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}>
                  {isClaimed ? tl("Claimed") : isActive ? `${m.current_days}/${m.target_days} Days` : `${m.current_days}/${m.target_days}`}
                </span>
              </div>

              <div className="my-space-md">
                <h3 className={`font-headline-md text-headline-md uppercase ${isLocked ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {getLocalized(m, 'title')}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">{getLocalized(m, 'description')}</p>
              </div>

              {isClaimed && (
                <div className="pt-space-sm flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface uppercase font-bold">
                    {tl("Coupon:")}{' '}{m.reward_code}
                  </span>
                </div>
              )}

              {isActive && (
                <div className="pt-space-sm flex flex-col gap-space-2xs">
                  <div className="flex justify-between text-on-surface-variant font-label-md text-label-md">
                    <span>{tl("Progress (")}{m.progress}%)</span>
                    <span className="text-on-surface font-bold">{m.days_left}{' '}{tl("Days Left")}</span>
                  </div>
                  <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-primary-container h-full rounded-full shadow-[0_0_10px_rgba(229,25,55,0.7)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                  {m.progress >= 100 && (
                    <button
                      onClick={() => handleClaim(m.id)}
                      className="mt-2 w-full py-2 rounded bg-primary-container hover:bg-secondary-container text-on-primary-container font-label-md text-[11px] uppercase tracking-wider font-bold"
                      type="button"
                    >
                      {tl("Claim Reward")}
                    </button>
                  )}
                </div>
              )}

              {isLocked && (
                <div className="pt-space-sm flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
                  <span>{tl("Target:")}{' '}{m.target_days}{' '}{tl("Days")}</span>
                  <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}