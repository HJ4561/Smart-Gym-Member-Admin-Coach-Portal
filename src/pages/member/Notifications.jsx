import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../../services/notificationsService';
import { useApi } from '../../hooks/useApi';
import { tl, locale } from '../../i18n';

/* ============================================================
   ICON COLOR MAP
   ============================================================ */
const iconColors = {
  workout: 'text-primary-container bg-primary-container/15',
  course: 'text-primary bg-primary-container/15',
  recovery: 'text-blue-400 bg-blue-400/15',
  payment: 'text-emerald-400 bg-emerald-400/15',
  achievement: 'text-yellow-400 bg-yellow-400/15',
  nutrition: 'text-orange-400 bg-orange-400/15',
  trainer: 'text-purple-400 bg-purple-400/15',
  shop: 'text-pink-400 bg-pink-400/15',
  attendance: 'text-primary-container bg-primary-container/15',
  system: 'text-on-surface-variant bg-surface-container-high',
};

const categoryTabs = [
  { key: 'all', label: tl("All"), icon: 'inbox' },
  { key: 'unread', label: tl("Unread"), icon: 'mark_email_unread' },
  { key: 'workout', label: tl("Workouts"), icon: 'fitness_center' },
  { key: 'course', label: tl("Courses"), icon: 'school' },
  { key: 'recovery', label: tl("Recovery"), icon: 'ac_unit' },
  { key: 'payment', label: tl("Payments"), icon: 'credit_card' },
  { key: 'achievement', label: tl("Achievements"), icon: 'emoji_events' },
  { key: 'nutrition', label: tl("Nutrition"), icon: 'restaurant' },
  { key: 'system', label: tl("System"), icon: 'system_update' },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function Notifications() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  // New notifications arrive on their own; reads in the bell (or another tab) show here at once.
  const live = { poll: 10_000, refreshOn: [NOTIFICATIONS_CHANGED] };
  const { data: notifications, loading, refetch } = useApi(
    () => notificationsService.list(),
    [],
    live
  );

  const { data: unreadData, refetch: refetchUnread } = useApi(
    () => notificationsService.unreadCount(),
    [],
    live
  );

  const list = notifications || [];
  const unreadCount = unreadData?.unread_count || 0;

  /* -------- Filtered list -------- */
  const filtered = useMemo(() => {
    if (activeCategory === 'unread') {
      return list.filter((n) => !n.is_read);
    }
    if (activeCategory === 'all') return list;
    return list.filter((n) => n.category === activeCategory);
  }, [list, activeCategory]);

  /* -------- Actions -------- */
  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      toast.success(tl("All marked as read"));
      refetch();
      refetchUnread();
    } catch (e) {
      toast.error(tl("Failed to mark all as read"));
    }
  };

  const handleToggleRead = async (n) => {
    if (n.is_read) return; // skip unreading for simplicity
    try {
      await notificationsService.markRead(n.id);
      refetch();
      refetchUnread();
    } catch (e) {
      toast.error(tl("Failed to update"));
    }
  };

  const handleRemove = async (id) => {
    try {
      await notificationsService.remove(id);
      toast.success(tl("Notification removed"));
      refetch();
      refetchUnread();
    } catch (e) {
      toast.error(tl("Failed to remove"));
    }
  };

  const handleAction = (n) => {
  if (!n.action_path) return;
  // Prefix member routes with /dashboard if they don't already have it
  const path = n.action_path.startsWith('/dashboard') || n.action_path.startsWith('/admin')
    ? n.action_path
    : `/dashboard${n.action_path}`;
  navigate(path);
};

  const hasAny = list.length > 0;
  const hasFiltered = filtered.length > 0;

  if (loading) {
    return (
      <div className="w-full px-space-xl py-space-xl flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-container/30 border-t-primary-container animate-spin" />
          <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-widest">
            {tl("Loading notifications...")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-space-xl">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-space-md"
      >
        <div>
          <div className="flex items-center gap-space-xs text-primary">
            <span className="material-symbols-outlined text-[16px]">
              notifications_active
            </span>
            <span className="font-label-md text-label-md uppercase tracking-widest">
              {tl("Telemetry Alerts")}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide">
            {tl("Notification Center")}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mt-space-2xs">
            {tl("Live alerts from your training, biometric telemetry, payments, and achievements.")}
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-space-2xs px-space-md py-space-xs rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-lg text-label-lg uppercase tracking-wider transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                mark_email_read
              </span>
              {tl("Mark All Read")}
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-space-md"
      >
        <StatTile
          icon="mark_email_unread"
          label={tl("Unread")}
          value={unreadCount}
          accent={unreadCount > 0}
        />
        <StatTile icon="inbox" label={tl("Total")} value={list.length} />
        <StatTile
          icon="priority_high"
          label={tl("High Priority")}
          value={list.filter((n) => n.priority === 'high').length}
        />
        <StatTile
          icon="today"
          label={tl("Today")}
          value={
            list.filter((n) => {
              const d = new Date(n.created_at);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            }).length
          }
        />
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-space-xs overflow-x-auto pb-1"
      >
        {categoryTabs.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count =
            cat.key === 'all'
              ? list.length
              : cat.key === 'unread'
              ? unreadCount
              : list.filter((n) => n.category === cat.key).length;

          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-space-2xs px-space-md py-space-xs rounded font-label-lg text-label-lg uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,25,55,0.4)]'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {cat.icon}
              </span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive
                      ? 'bg-on-primary-container/20 text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-space-md"
      >
        {!hasAny ? (
          <EmptyState
            icon="notifications_off"
            title={tl("All Clear")}
            subtitle={tl("You have no notifications. Everything is running smoothly.")}
          />
        ) : !hasFiltered ? (
          <EmptyState
            icon="filter_alt_off"
            title={tl("No Matches")}
            subtitle={tl("No notifications in \"{0}\".", { 0: categoryTabs.find((c) => c.key === activeCategory)?.label })}
          />
        ) : (
          <div className="flex flex-col gap-space-xs">
            <AnimatePresence mode="popLayout">
              {filtered.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onToggleRead={handleToggleRead}
                  onRemove={handleRemove}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */
function StatTile({ icon, label, value, accent }) {
  return (
    <div
      className={`rounded-lg p-space-md flex items-center gap-space-md shadow-md relative overflow-hidden ${
        accent
          ? 'bg-primary-container/10 border border-primary-container/30'
          : 'bg-surface-container'
      }`}
    >
      {accent && (
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-container/20 rounded-full blur-2xl pointer-events-none" />
      )}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative ${
          accent
            ? 'bg-primary-container/20 text-primary'
            : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex flex-col relative">
        <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`font-headline-md text-headline-md leading-none mt-1 ${
            accent ? 'text-primary' : 'text-on-surface'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function NotificationCard({ notification: n, onToggleRead, onRemove, onAction }) {
  const iconStyle = iconColors[n.category] || iconColors.system;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25 }}
      className={`group relative flex items-start gap-space-md p-space-md rounded-lg transition-all shadow-sm hover:shadow-md ${
        !n.is_read
          ? 'bg-surface-container-low border-l-2 border-primary-container'
          : 'bg-surface-container-lowest'
      }`}
    >
      {!n.is_read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_rgba(229,25,55,0.8)]" />
      )}

      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}
      >
        <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-space-2xs">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="font-title-md text-title-md text-on-surface leading-snug">
            {n.title}
          </span>
          <span className="px-space-xs py-0.5 rounded bg-surface-container-high font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            {n.category}
          </span>
          {n.priority === 'high' && (
            <span className="px-space-xs py-0.5 rounded bg-primary-container/20 text-primary font-label-md text-label-md uppercase font-bold tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              {tl("Priority")}
            </span>
          )}
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          {n.message}
        </p>

        <div className="flex items-center gap-space-md mt-space-2xs flex-wrap">
          <span className="font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {new Date(n.created_at).toLocaleString(locale)}
          </span>

          {n.action_label && (
            <button
              onClick={() => onAction(n)}
              className="font-label-md text-label-md text-primary uppercase font-bold tracking-wider hover:underline flex items-center gap-1"
              type="button"
            >
              {n.action_label}
              <span className="material-symbols-outlined text-[14px]">
                arrow_forward
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-space-2xs opacity-0 group-hover:opacity-100 transition-opacity ml-space-sm">
        {!n.is_read && (
          <button
            onClick={() => onToggleRead(n)}
            title={tl("Mark as read")}
            className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">drafts</span>
          </button>
        )}
        <button
          onClick={() => onRemove(n.id)}
          title={tl("Remove")}
          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-space-3xl bg-surface-container-low rounded-xl">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-space-md">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">
          {icon}
        </span>
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide mb-1">
        {title}
      </h3>
      <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-md">
        {subtitle}
      </p>
    </div>
  );
}