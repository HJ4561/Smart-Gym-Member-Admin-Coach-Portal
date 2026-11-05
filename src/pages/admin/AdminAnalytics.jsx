// src/pages/admin/AdminAnalytics.jsx
// Insights: membership health, visits, member movement per month, and rule-based
// recommendations that link to the page where you act on them. All from live data.
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/site/SiteUi';
import MonthlyColumns from '../../components/admin/MonthlyColumns';
import { tl } from '../../i18n';

const TONE = {
  high: 'border-primary-container',
  medium: 'border-amber-400',
  low: 'border-[#2a2a2e]',
};
const CHIP = {
  high: 'bg-primary-container/20 text-primary',
  medium: 'bg-amber-400/15 text-amber-300',
  low: 'bg-[#1a1a1e] text-on-surface-variant',
};

const TILE_TONES = {
  primary: 'bg-primary-container/15 text-primary',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
  sky: 'bg-sky-500/15 text-sky-400',
  rose: 'bg-rose-500/15 text-rose-400',
  neutral: 'bg-[#1a1a1e] text-on-surface-variant',
};

// Width-stable placeholder — prevents layout shift when numbers land.
function ValueSkeleton({ width = 'w-14' }) {
  return (
    <span
      className={`inline-block h-[22px] rounded bg-[#1a1a1e] animate-pulse align-middle ${width}`}
      aria-hidden="true"
    />
  );
}

function StatTile({ icon, tone, label, value, hint, loading }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
      className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg px-4 py-3 flex flex-col gap-1.5 min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[22px] font-bold text-on-surface tabular-nums leading-tight truncate">
          {loading ? <ValueSkeleton /> : value ?? '—'}
        </div>
        <div
          className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${TILE_TONES[tone] || TILE_TONES.neutral}`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant truncate">
        {label}
      </div>
      {hint && (
        <div className="text-[11px] text-on-surface-variant/70 truncate" title={hint}>
          {hint}
        </div>
      )}
    </motion.div>
  );
}

function InsightCard({ insight, reduce }) {
  const priorityLabel = tl(insight.priority || 'low');
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
      className={`group bg-[#0e0e0f] border border-[#1a1a1e] border-l-4 ${
        TONE[insight.priority] || TONE.low
      } rounded-lg p-4 flex gap-3 hover:bg-[#111114] transition-colors`}
    >
      <span
        className="material-symbols-outlined text-primary text-[22px] shrink-0"
        aria-hidden="true"
      >
        {insight.icon || 'insights'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-on-surface font-bold truncate">{insight.title}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
              CHIP[insight.priority] || CHIP.low
            }`}
          >
            {priorityLabel}
          </span>
        </div>
        <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
          {insight.description}
        </p>
        <Link
          to={insight.path}
          className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary font-bold uppercase tracking-wider hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded"
        >
          {insight.action}
          <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function AdminAnalytics() {
  const reduce = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);

  const { data: k, loading: kLoading, refetch: refetchK } = useApi(
    () => adminService.analyticsKPIs(),
    []
  );
  const { data: growth, loading: growthLoading, refetch: refetchGrowth } = useApi(
    () => adminService.analyticsGrowth(),
    []
  );
  const { data: insights, loading: insightsLoading, refetch: refetchInsights } = useApi(
    () => adminService.aiInsights(),
    []
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchK(), refetchGrowth(), refetchInsights()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchK, refetchGrowth, refetchInsights]);

  const months = Array.isArray(growth) ? growth : [];
  const list = Array.isArray(insights) ? insights : [];

  const tiles = [
    {
      key: 'active',
      icon: 'group',
      tone: 'emerald',
      label: tl('Active members'),
      value: k?.active_members,
      hint: k?.total_members != null
        ? tl('of {0} accounts', { 0: k.total_members })
        : '',
    },
    {
      key: 'new',
      icon: 'person_add',
      tone: 'primary',
      label: tl('New members'),
      value: k?.new_members_30d,
      hint: tl('last 30 days'),
    },
    {
      key: 'lapsed',
      icon: 'person_off',
      tone: 'rose',
      label: tl('Lapsed'),
      value: k?.lapsed_90d,
      hint: tl('ended in 90 days, not renewed'),
    },
    {
      key: 'visit_rate',
      icon: 'directions_run',
      tone: 'sky',
      label: tl('Visited the gym'),
      value: k?.visit_rate == null ? '—' : `${k.visit_rate}%`,
      hint:
        k?.active_visitors_30d != null
          ? tl('{0} active members, last 30 days', { 0: k.active_visitors_30d })
          : '',
    },
    {
      key: 'visits',
      icon: 'door_front',
      tone: 'primary',
      label: tl('Visits'),
      value: k?.visits_30d,
      hint: tl('last 30 days'),
    },
    {
      key: 'avg_visit',
      icon: 'timer',
      tone: 'amber',
      label: tl('Average visit'),
      value:
        k?.avg_visit_minutes == null ? '—' : tl('{0} min', { 0: k.avg_visit_minutes }),
      hint: tl('checked-out visits'),
    },
  ];

  return (
    <main className="px-space-xl pt-space-xl pb-space-lg flex flex-col gap-space-lg">
      <PageHeader
        title={tl('Insights')}
        subtitle={tl(
          'How the membership is doing and what needs attention — worked out from live data.'
        )}
      >
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-busy={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e0e0f] border border-[#1a1a1e] text-on-surface-variant text-[11px] uppercase tracking-wider font-bold hover:text-on-surface disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <span
            className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            {refreshing ? 'progress_activity' : 'refresh'}
          </span>
          {refreshing ? tl('Refreshing…') : tl('Refresh')}
        </button>
      </PageHeader>

      <section
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
        aria-label={tl('Membership health')}
        aria-busy={kLoading}
      >
        {tiles.map((t) => (
          <StatTile
            key={t.key}
            icon={t.icon}
            tone={t.tone}
            label={t.label}
            value={t.value}
            hint={t.hint}
            loading={kLoading && !k}
          />
        ))}
      </section>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="analytics-attention-title"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="analytics-attention-title"
            className="font-headline-md text-[18px] uppercase text-on-surface"
          >
            {tl('Needs attention')}
          </h2>
          <span
            className="text-[11px] text-on-surface-variant tabular-nums"
            aria-live="polite"
          >
            {tl('{0} {1}', {
              0: list.length,
              1: list.length === 1 ? tl('item') : tl('items'),
            })}
          </span>
        </div>

        {insightsLoading && !insights ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            aria-busy="true"
          >
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-[#0e0e0f] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div
            className="py-10 text-center bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg text-on-surface-variant text-[13px] flex flex-col items-center gap-2"
            role="status"
          >
            <span
              className="material-symbols-outlined text-3xl text-on-surface-variant/40"
              aria-hidden="true"
            >
              check_circle
            </span>
            {tl('All clear — nothing needs attention right now.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((insight, i) => (
              <InsightCard
                key={insight.key ?? `${insight.title}-${i}`}
                insight={insight}
                reduce={reduce}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg"
        aria-label={tl('Member movement')}
        aria-busy={growthLoading}
      >
        <MonthlyColumns
          loading={growthLoading && !growth}
          title={tl('New members per month')}
          unit={tl('New members')}
          rows={months.map((m) => ({
            month: m.month,
            short: m.short,
            value: m.new_members,
          }))}
          empty={tl('No sign-ups in the last 12 months.')}
        />
        <MonthlyColumns
          loading={growthLoading && !growth}
          title={tl('Memberships lapsed per month')}
          unit={tl('Lapsed')}
          rows={months.map((m) => ({
            month: m.month,
            short: m.short,
            value: m.ended,
          }))}
          empty={tl('No memberships lapsed in the last 12 months.')}
        />
      </section>
    </main>
  );
}