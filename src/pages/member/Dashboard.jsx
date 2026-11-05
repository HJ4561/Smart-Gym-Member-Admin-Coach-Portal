import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { dashboardService } from '../../services/dashboardService';
import { workoutsService } from '../../services/workoutsService';
import { useAuth } from '../../context/AuthContext';
import StreakBadge from '../../components/StreakBadge';
import ScannerCard from '../../components/ScannerCard';
import WorkoutCard from '../../components/WorkoutCard';
import BiometricStream from '../../components/BiometricStream';
import AIDirectives from '../../components/AIDirectives';
import FloorDensity from '../../components/FloorDensity';
import RecentLogs from '../../components/RecentLogs';
import MembershipCountdown from '../../components/MembershipCountdown';
import ReferralCard from '../../components/ReferralCard';
import { tl, locale } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

const lineUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
};

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const [starting, setStarting] = useState(false);

  // Single aggregated call
  const { data, loading, refetch } = useApi(
    () => dashboardService.fetch(),
    []
  );
  // Full recent history for the logs (the dashboard payload only carries 5).
  const { data: history, refetch: refetchHistory } = useApi(() => workoutsService.list(), [], { showError: false });
  const stats = data?.stats;
  const membership = data?.membership;
  const todayWorkout = data?.today_workout;
  const biometric = data?.biometric;
  const directives = data?.directives || [];
  const density = data?.floor_density;
  const user = data?.user || authUser;

  const refreshAll = () => {
    refetch();
    refetchHistory();
  };

  const handleStartWorkout = async () => {
    try {
      setStarting(true);
      await workoutsService.start({ name: 'Training Session' });
      toast.success(tl("Workout started — log sets below or scan a machine"));
      refreshAll();
    } catch {
      toast.error(tl("Failed to start workout"));
    } finally {
      setStarting(false);
    }
  };

  const streak = stats?.current_streak_days ?? 0;
  const totalWorkouts = stats?.total_workouts ?? 0;
  const totalTonnage = Number(stats?.total_tonnage_all_time || 0).toLocaleString(locale);
  const passId = user?.id?.toString().padStart(4, '0') || '0000';
  const displayName = user?.first_name || user?.full_name?.split(' ')[0] || 'Athlete';

  return (
    <div className="relative flex flex-col w-full gap-space-xl px-space-xl py-space-xl">
      {/* Ambient background */}
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
          className="absolute -top-40 right-[8%] w-[480px] h-[480px] rounded-full bg-primary-container/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Welcome + Streak */}
      <section className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-space-lg">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
          className="flex flex-col gap-space-xs"
        >
          <motion.div variants={lineUp} className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-xs py-space-2xs bg-surface-container-high text-on-surface-variant font-label-md text-label-md rounded tracking-widest uppercase">
              {tl("Member #")}{passId}
            </span>
          </motion.div>

          <motion.h1
            variants={lineUp}
            className="font-headline-lg text-headline-lg text-on-surface tracking-wider uppercase m-0 leading-none"
          >
            {tl("Welcome Back,")}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
              {displayName}
            </span>
          </motion.h1>

          <motion.p variants={lineUp} className="font-body-md text-body-md text-on-surface-variant max-w-xl">
            {loading
              ? tl("Loading your telemetry...")
              : totalWorkouts > 0
              ? tl("You've logged {0} workout{1} and moved {2} kg total.", { 0: totalWorkouts, 1: totalWorkouts === 1 ? '' : 's', 2: totalTonnage })
              : tl("Start your first workout to begin tracking progress.")}
          </motion.p>
        </motion.div>

        <StreakBadge streak={streak} target={7} />
      </section>

      {/* Membership time left — counted from the day the registration was approved */}
      <MembershipCountdown membership={membership} loading={loading} />

      {/* Stats Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <DashboardStat
          icon="fitness_center"
          label={tl("Total Workouts")}
          value={loading ? '—' : totalWorkouts}
          sub={stats?.recent_30d?.workouts ? `${stats.recent_30d.workouts} this month` : 'No recent activity'}
          accent={false}
        />
        <DashboardStat
          icon="bolt"
          label={tl("30-Day Tonnage")}
          value={loading ? '—' : `${Math.round(Number(stats?.recent_30d?.total_tonnage_kg ?? 0) / 1000)}k`}
          sub="kg lifted"
          accent={true}
        />
        <DashboardStat
          icon="local_fire_department"
          label={tl("Current Streak")}
          value={streak}
          sub="days"
          accent={true}
        />
        <DashboardStat
          icon="emoji_events"
          label={tl("Personal Records")}
          value={loading ? '—' : stats?.total_prs ?? 0}
          sub={`${stats?.total_prs ?? 0} exercises`}
          accent={false}
        />
      </section>

      {/* Bento: Scanner + Workout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <ScannerCard />
        <WorkoutCard workout={todayWorkout} onStartWorkout={handleStartWorkout} starting={starting} onChanged={refreshAll} />
      </div>

      {/* Biometric Stream */}
      <BiometricStream session={biometric} />

      {/* AI + Floor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <AIDirectives directives={directives} />
        <FloorDensity density={density} />
      </div>

      {/* Invite a friend */}
      <ReferralCard />

      {/* Recent Logs */}
      <RecentLogs workouts={(history || []).filter((w) => w.status === 'completed')} loading={loading && !history} />
    </div>
  );
}

function DashboardStat({ icon, label, value, sub, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-lg p-space-lg shadow-md overflow-hidden ${
        accent ? 'bg-primary-container/10 border border-primary-container/30' : 'bg-surface-container'
      }`}
    >
      {accent && (
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-container/20 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="relative flex items-start justify-between mb-space-sm">
        <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${accent ? 'text-primary' : 'text-on-surface-variant'}`}>
          {icon}
        </span>
      </div>
      <div className="relative">
        <span className={`font-headline-lg text-headline-lg leading-none ${accent ? 'text-primary' : 'text-on-surface'}`}>
          {value}
        </span>
        <span className="font-label-md text-[10px] text-on-surface-variant mt-1 block uppercase tracking-wider">
          {sub}
        </span>
      </div>
    </motion.div>
  );
}