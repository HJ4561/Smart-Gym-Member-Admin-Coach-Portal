import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { attendanceService } from '../../services/attendanceService';
import AttendanceStats from '../../components/attendance/AttendanceStats';
import YearHeatmap from '../../components/attendance/YearHeatmap';
import HourlyCurve from '../../components/attendance/HourlyCurve';
import MilestoneTiers from '../../components/attendance/MilestoneTiers';
import CheckInLedger from '../../components/attendance/CheckInLedger';
import ArenaSnapshots from '../../components/attendance/ArenaSnapshots';
import { tl } from '../../i18n';


export default function Attendance() {
  const [checkingOut, setCheckingOut] = useState(false);
  const { data: summary, refetch: refetchSummary } = useApi(
    () => attendanceService.summary(),
    []
  );

  const { data: milestones, refetch: refetchMilestones } = useApi(
    () => attendanceService.milestones(),
    []
  );

  const { data: hourly } = useApi(() => attendanceService.hourly(), []);
  const { data: arenas } = useApi(() => attendanceService.arenas(), []);

  // Check-ins happen at the entrance (face gate / staff scanning the pass).
  // Members can see whether they're in, and check out when they leave.
  const { data: checkIns, refetch: refetchCheckIns } = useApi(() => attendanceService.checkIns(), [], { showError: false });
  const open = (Array.isArray(checkIns) ? checkIns : []).find((c) => !c.check_out_time);
  const [ledgerKey, setLedgerKey] = useState(0);

  const handleCheckOut = async () => {
    if (!open) return;
    try {
      setCheckingOut(true);
      const res = await attendanceService.checkOut(open.id);
      toast.success(tl("Checked out — {0} min session", { 0: res.duration_minutes ?? 0 }));
      refetchCheckIns();
      refetchSummary();
      setLedgerKey((k) => k + 1);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="relative w-full px-space-xl pb-space-2xl pt-space-xl flex flex-col gap-space-xl">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-40 right-[12%] w-[460px] h-[460px] rounded-full bg-primary-container/10 blur-3xl"
          animate={{ x: [0, 35, 0], y: [0, 28, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-space-md"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-xs text-primary">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span className="font-label-md text-label-md uppercase tracking-widest">
              {tl("Attendance")}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide leading-none m-0">
            {tl("Your")}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
              {tl("Gym Visits")}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${open ? 'bg-emerald-400 animate-pulse' : 'bg-surface-container-highest'}`} />
            <span className="font-title-md text-title-md text-on-surface">
              {open
                ? tl("In the gym since {0}", { 0: new Date(open.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
                : tl("Not checked in")}
            </span>
          </div>

          {open ? (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-lg text-label-lg uppercase tracking-wider hover:bg-secondary-container transition-colors disabled:opacity-60"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>{checkingOut ? tl("Checking out…") : tl("Check out")}</span>
            </button>
          ) : (
            <Link
              to="/dashboard/profile#pass"
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-lg text-label-lg uppercase tracking-wider hover:bg-secondary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              <span>{tl("Show entry pass")}</span>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <AttendanceStats summary={summary} />

      {/* Heatmap + Hourly */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        <div className="xl:col-span-8">
          <YearHeatmap />
        </div>
        <div className="xl:col-span-4">
          <HourlyCurve hourly={hourly} />
        </div>
      </div>

      {/* Milestones */}
      <MilestoneTiers
        milestones={milestones}
        onClaim={() => {
          refetchMilestones();
          refetchSummary();
        }}
      />

      {/* Ledger */}
      <CheckInLedger key={ledgerKey} />

      {/* Arenas */}
      <ArenaSnapshots arenas={arenas} />
    </div>
  );
}