import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dashboardService } from '../services/dashboardService';
import { tl } from '../i18n';
import { DrawerBackdrop } from '../layouts/MobileNav';
import { drawerClasses, useMobileNav } from '../layouts/mobileNavContext';

const navItems = [
  { path: '/dashboard', label: tl("Dashboard"), icon: 'grid_view', end: true },
  { path: '/dashboard/notifications', label: tl("Notifications"), icon: 'notifications' },
  { path: '/dashboard/machine-guide', label: tl("Machine Guide"), icon: 'precision_manufacturing' },
  { path: '/dashboard/classes', label: tl("Classes"), icon: 'event' },
  { path: '/dashboard/courses', label: tl("Courses"), icon: 'sports_gymnastics' },
  { path: '/dashboard/player', label: tl("Player"), icon: 'play_circle' },
  { path: '/dashboard/trainers', label: tl("Trainers"), icon: 'group' },
  { path: '/dashboard/my-sessions', label: tl("My Sessions"), icon: 'event_available' },
  { path: '/dashboard/nutrition-plan', label: tl("My Nutrition"), icon: 'nutrition' },
  { path: '/dashboard/nutritionists', label: tl("Nutritionists"), icon: 'restaurant' },
  { path: '/dashboard/shop', label: tl("Shop"), icon: 'shopping_bag' },
  { path: '/dashboard/attendance', label: tl("Attendance"), icon: 'event_available' },
  { path: '/dashboard/profile', label: tl("Profile"), icon: 'account_circle' },
  { path: '/dashboard/payments', label: tl("Payments"), icon: 'credit_card' },
];

const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: 'spring', stiffness: 380, damping: 32 };

export default function Sidebar() {
  // Live load from open check-ins, refreshed every minute.
  const [occ, setOcc] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => dashboardService.occupancy().then((o) => { if (alive) setOcc(o); }).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const { open, setOpen } = useMobileNav();

  return (
    <>
    <DrawerBackdrop />
    <aside className={`fixed left-0 top-0 h-screen w-64 max-w-[85vw] bg-surface-container-lowest z-50 flex flex-col py-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] ${drawerClasses(open)}`}>
      {/* Brand hairline */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent origin-left"
      />

      {/* ===== Logo ===== */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="px-5 flex items-center gap-3 flex-shrink-0 pb-4 border-b border-surface-container-high"
      >
        <div className="relative w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center shadow-[0_0_14px_rgba(229,25,55,0.4)]">
          <motion.span
            className="material-symbols-outlined text-on-primary-container text-[20px]"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            fitness_center
          </motion.span>
          <motion.span
            className="absolute inset-0 rounded-lg border border-primary-container/70"
            animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-headline-md text-[18px] tracking-wider text-on-surface uppercase leading-none">
            {tl("Smart Gym")}
          </span>
          <span className="font-label-md text-[10px] text-primary tracking-widest uppercase">
            {tl("Member Portal")}
          </span>
        </div>
      </motion.div>

      {/* ===== Navigation ===== */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-3 min-h-0 overflow-y-auto">
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + index * 0.035, ease: EASE }}
          >
            <NavLink
              to={item.path}
              end={item.end}
              onClick={() => setOpen(false)}
              className="group relative flex items-center gap-3 px-3 py-2 rounded-lg uppercase tracking-wider text-[12px] font-bold"
            >
              {({ isActive }) => (
                <>
                  {/* Sliding active pill (shared layout animation) */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-lg bg-primary-container shadow-[0_0_16px_rgba(229,25,55,0.35)]"
                    />
                  )}
                  {/* Hover wash for inactive */}
                  <span className="absolute inset-0 rounded-lg bg-surface-container-high opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <span
                    className={`material-symbols-outlined text-[18px] leading-none relative z-10 transition-all duration-200 ${
                      isActive
                        ? 'text-on-primary-container'
                        : 'text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`leading-none relative z-10 transition-colors duration-200 ${
                      isActive
                        ? 'text-on-primary-container'
                        : 'text-on-surface-variant group-hover:text-on-surface'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* ===== Facility Status ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45, ease: EASE }}
        whileHover={{ y: -2 }}
        className="px-3 flex-shrink-0 pt-3 border-t border-surface-container-high"
      >
        <div className="bg-surface-container-low rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-md text-[9px] text-on-surface-variant uppercase tracking-wider">
              {tl("Gym right now")}
            </span>
            <span className="font-title-md text-[12px] text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              {occ ? occ.label : '—'}
            </span>
          </div>
          <span className="font-headline-md text-[20px] text-on-surface leading-none">
            {occ ? (occ.capacity ? `${occ.percent}%` : occ.current) : '—'}
          </span>
        </div>
        {/* Capacity meter */}
        <div className="mt-1.5 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary shadow-[0_0_8px_rgba(229,25,55,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${occ?.percent ?? 0}%` }}
            transition={{ duration: 1.2, delay: 0.8, ease: EASE }}
          />
        </div>
      </motion.div>
    </aside>
    </>
  );
}