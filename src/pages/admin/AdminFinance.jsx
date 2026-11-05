// src/pages/admin/AdminFinance.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { formatSAR } from '../../utils/money';
import RevenueChart from '../../components/admin/RevenueChart';
import RevenueStreams from '../../components/admin/RevenueStreams';
import TopMembersCard from '../../components/admin/TopMembersCard';
import InvoiceDrawer from '../../components/admin/InvoiceDrawer';
import { tl, locale } from '../../i18n';

export default function AdminFinance() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState('30d');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const { data: overview, loading: loadingOv } = useApi(
    () => adminService.financeOverview(range),
    [range]
  );
  const { data: txData, loading: loadingTx } = useApi(
    () => adminService.transactions({ page, q: q.trim(), type }),
    [page, q, type]
  );

  const { data: monthly, loading: loadingMonthly } = useApi(
    () => adminService.revenueMonthly(12),
    []
  );

  const { data: streams, loading: loadingStreams } = useApi(
    () => adminService.revenueStreams(range),
    [range]
  );

  const { data: topMembers, loading: loadingTop } = useApi(
    () => adminService.topMembers(5),
    []
  );

  const transactions = txData?.results || [];
  const total = txData?.total || 0;

  const handleViewInvoice = async (txn) => {
    try {
      const detail = await adminService.transactionDetail(txn.id);
      setSelectedTxn(detail);
    } catch {
      toast.error(tl("Failed to load invoice"));
    }
  };

  const loading = loadingOv;

  return (
    <div className="w-full p-6 flex flex-col gap-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-primary mb-2">
          <span className="material-symbols-outlined text-[16px]">payments</span>
          <span className="font-label-md text-[10px] uppercase tracking-widest font-bold">
            {tl("Finance")}
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wider">
          {tl("Revenue & payments")}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
          {tl("Money received by card, STC Pay, top-ups and desk payments. Spending locker credit isn’t counted again — it was counted when topped up.")}
        </p>
      </motion.div>

      <div className="flex gap-1" role="tablist" aria-label={tl("Period")}>
        {[['1d', tl("Today")], ['7d', tl("7 days")], ['30d', tl("30 days")], ['90d', tl("90 days")], ['ytd', tl("Year to date")]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={range === id} onClick={() => setRange(id)}
            className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${range === id ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceStat
          label={tl("Received")}
          value={loading ? '—' : formatSAR(overview?.received)}
          delta={`${overview?.range_label || ''} · ${overview?.payment_count ?? 0} payments`}
          icon="payments"
          accent
        />
        <FinanceStat
          label={tl("This month")}
          value={loading ? '—' : formatSAR(overview?.this_month)}
          delta={`Annual run rate ${formatSAR(overview?.run_rate)}`}
          icon="trending_up"
        />
        <FinanceStat
          label={tl("Payments to review")}
          value={loading ? '—' : formatSAR(overview?.review_amount)}
          delta={`${overview?.review_count ?? 0} — refund or follow up in Shop Orders`}
          icon="schedule"
          accent
        />
        <FinanceStat
          label={tl("Refunds")}
          value={loading ? '—' : formatSAR(overview?.refunds)}
          delta={overview?.range_label || ''}
          icon="undo"
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={monthly} loading={loadingMonthly} />

      {/* Streams + Top Members */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RevenueStreams data={streams} loading={loadingStreams} />
        </div>
        <div className="lg:col-span-4">
          <TopMembersCard data={topMembers} loading={loadingTop} />
        </div>
      </section>

      {/* Transactions ledger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-low rounded-xl overflow-hidden shadow-md"
      >
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
            {tl("All transactions")}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={tl("Search member, item, ID…")} aria-label={tl("Search transactions")}
              className="bg-surface-container-lowest text-on-surface text-[12px] px-3 py-2 rounded border border-surface-container-high focus:outline-none focus:border-primary" />
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label={tl("Type")}
              className="bg-surface-container-lowest text-on-surface text-[12px] px-3 py-2 rounded border border-surface-container-high">
              <option value="">{tl("All types")}</option><option value="subscription">{tl("Memberships & add-ons")}</option>
              <option value="retail">{tl("Shop")}</option><option value="coaching">{tl("Trainers & courses")}</option>
              <option value="topup">{tl("Top-ups")}</option><option value="refund">{tl("Refunds")}</option>
            </select>
          </div>
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase">
            {total} transactions
          </span>
        </div>

        {loadingTx ? (
          <div className="p-4 flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 bg-surface-container rounded animate-pulse"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              receipt_long
            </span>
            <p className="font-title-md text-title-md text-on-surface mt-3">
              {tl("No transactions yet")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest text-on-surface-variant font-label-md text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">{tl("Transaction")}</th>
                  <th className="py-3 px-4 text-left">{tl("Member")}</th>
                  <th className="py-3 px-4 text-left">{tl("Description")}</th>
                  <th className="py-3 px-4 text-right">{tl("Amount")}</th>
                  <th className="py-3 px-4 text-left">{tl("Status")}</th>
                  <th className="py-3 px-4 text-right">{tl("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50">
                {transactions.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-surface-container-high/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-primary font-bold">
                          {t.transaction_id}
                        </span>
                        <span className="font-label-md text-[9px] text-on-surface-variant">
                          {new Date(t.created_at).toLocaleString(locale)} · {t.method || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-title-md text-[12px] text-on-surface">
                          {t.member_name}
                        </span>
                        <span className="font-label-md text-[10px] text-on-surface-variant">
                          {t.member_email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-body-md text-[12px] text-on-surface">
                        {t.description}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-title-md text-title-md font-bold ${
                          Number(t.amount) < 0 ? 'text-error' : 'text-on-surface'
                        }`}
                      >
                        {formatSAR(t.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase ${
                          t.status === 'settled'
                            ? 'bg-emerald-400/15 text-emerald-400'
                            : t.status === 'pending'
                            ? 'bg-primary-container/20 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {tl(t.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewInvoice(t)}
                        className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
                        type="button"
                        title={tl("View invoice")}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loadingTx && transactions.length > 0 && (
          <div className="p-4 bg-surface-container-lowest flex items-center justify-between">
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase">
              {tl("Page")}{' '}{page} · {total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-[11px] font-bold uppercase disabled:opacity-30"
                type="button"
              >
                {tl("Prev")}
              </button>
              <span className="px-3 py-1 rounded bg-primary-container text-on-primary-container text-[11px] font-bold">
                {page}
              </span>
              <button
                disabled={page >= (txData?.pages || 1)}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface text-[11px] font-bold uppercase disabled:opacity-30"
                type="button"
              >
                {tl("Next")}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Invoice Drawer */}
      <AnimatePresence>
        {selectedTxn && (
          <InvoiceDrawer
            transaction={selectedTxn}
            onClose={() => setSelectedTxn(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FinanceStat({ label, value, delta, icon, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-lg p-5 shadow-md overflow-hidden ${
        accent
          ? 'bg-primary-container/10 border border-primary-container/30'
          : 'bg-surface-container'
      }`}
    >
      {accent && (
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-container/15 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="relative flex items-start justify-between mb-3">
        <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <span
          className={`material-symbols-outlined text-[20px] ${
            accent ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="relative">
        <span
          className={`font-headline-lg text-headline-lg leading-none ${
            accent ? 'text-primary' : 'text-on-surface'
          }`}
        >
          {value}
        </span>
        <span className="font-label-md text-[10px] text-on-surface-variant mt-2 block">
          {delta}
        </span>
      </div>
    </motion.div>
  );
}