// src/pages/admin/AdminDashboard.jsx
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import ControlBar from '../../components/admin/ControlBar';
import Scorecards from '../../components/admin/Scorecards';
import FlowAndRevenue from '../../components/admin/FlowAndRevenue';
import ArenaHeatmap from '../../components/admin/ArenaHeatmap';
import AuditFeed from '../../components/admin/AuditFeed';
import FacilityNodeCard from '../../components/admin/FacilityNodeCard';
import { PageHeader } from '../../components/site/SiteUi';
import { tl } from '../../i18n';

export default function AdminDashboard() {
  const [range, setRange] = useState('30d');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  const { data: overview, loading, refetch: refetchOverview } = useApi(
    () => adminService.overview(range), [range], { poll: 60_000 }
  );
  const { data: flowData, loading: flowLoading, refetch: refetchFlow } = useApi(
    () => adminService.flowAndRevenue(range), [range]
  );
  const { data: heatmap, loading: heatmapLoading, refetch: refetchHeatmap } = useApi(
    () => adminService.arenaHeatmap(), []
  );
  const { data: audit, loading: auditLoading, refetch: refetchAudit } = useApi(
    () => adminService.auditFeed(20), []
  );
  const { data: nodes, loading: nodesLoading, refetch: refetchNodes } = useApi(
    () => adminService.facilityNodes(), []
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetchOverview(), refetchFlow(), refetchHeatmap(), refetchAudit(), refetchNodes(),
      ]);
      setUpdatedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [refetchOverview, refetchFlow, refetchHeatmap, refetchAudit, refetchNodes]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await adminService.exportTransactions(range);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-gym-transactions-${range}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(tl('Export ready'));
    } catch {
      toast.error(tl('Export failed'));
    } finally {
      setExporting(false);
    }
  }, [range]);

  return (
    <main className="w-full p-space-xl flex flex-col gap-space-lg">
      <PageHeader
        title={tl('Dashboard')}
        subtitle={tl('Live operations, revenue, and member activity.')}
      >
        <Link to="/admin/analytics" className="text-[11px] uppercase tracking-wider font-bold text-primary hover:underline">
          {tl('View insights →')}
        </Link>
      </PageHeader>

      <ControlBar
        range={range}
        onRange={setRange}
        updatedAt={updatedAt}
        onRefresh={refresh}
        refreshing={refreshing}
        onExport={exportCsv}
        exporting={exporting}
      />

      <Scorecards overview={overview} loading={loading} />

      <FlowAndRevenue data={flowData} loading={flowLoading} />

      <ArenaHeatmap data={heatmap} loading={heatmapLoading} />

      <section
        className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg"
        aria-label={tl('Activity & facilities')}
      >
        <div className="lg:col-span-8 min-w-0">
          <AuditFeed events={audit} loading={auditLoading} />
        </div>
        <div className="lg:col-span-4 min-w-0">
          <FacilityNodeCard nodes={nodes} loading={nodesLoading} />
        </div>
      </section>
    </main>
  );
}