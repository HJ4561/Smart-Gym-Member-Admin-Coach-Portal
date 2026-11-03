// src/pages/admin/AdminRegistrations.jsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatDate, formatRemaining } from '../../utils/membershipTime';
import { formatSAR } from '../../utils/money';
import { errorMessage } from '../../utils/apiError';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { tl } from '../../i18n';
import { HIGHLIGHT_ROW, useHighlight } from '../../hooks/useHighlight';
import HighlightBar from '../../components/admin/HighlightBar';

const STATUS_FILTERS = [
  { id: 'pending', label: tl("Pending") },
  { id: 'payment_confirmed', label: tl("Paid") },
  { id: 'approved', label: tl("Approved") },
  { id: 'rejected', label: tl("Rejected") },
  { id: 'all', label: tl("All") },
];

const StatusBadge = ({ status }) => {
  const map = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    payment_confirmed: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    expired: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30',
  };
  const label = status.replace('_', ' ').toUpperCase();
  return (
    <span
      className={`inline-block px-2 py-1 rounded border text-[10px] font-bold tracking-wider ${
        map[status] || map.expired
      }`}
    >
      {label}
    </span>
  );
};

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null);   // the registration being rejected
  const highlight = useHighlight();
  const load = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminService.registrations({ status: statusFilter, search }),
        adminService.registrationStats(),
      ]);
      setRegistrations(listRes.results || []);
      setStats(statsRes);
    } catch (err) {
      if (!background) toast.error(errorMessage(err, tl("Failed to load registrations")));
    } finally {
      setLoading(false);
    }
  };
  // New website signups appear without a reload.
  useAutoRefresh(() => load(true), 20_000);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      const res = await adminService.approveRegistration(id);
      toast.success(
        tl("Approved. Pass: {0}", { 0: res.membership?.pass_id || 'created' })
      );
      await load();
    } catch (err) {
      toast.error(errorMessage(err, tl("Approval failed")));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async ({ reason, refund }) => {
    const id = rejecting.id;
    setBusyId(id);
    try {
      const res = await adminService.rejectRegistration(id, reason, refund);
      toast.success(res.refunded ? tl("Rejected and {0} refunded", { 0: formatSAR(rejecting.payment_amount) }) : 'Registration rejected');
      setRejecting(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, tl("Rejection failed")));
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkApproveToday = async () => {
    if (!window.confirm(tl("Approve all PAID registrations submitted today? Each payment is re-verified with Moyasar; unpaid ones are skipped."))) return;
    setBulkBusy(true);
    try {
      const res = await adminService.bulkApproveRegistrations({ onlyToday: true });
      toast.success(
        tl("Approved {0}. Failed: {1}", { 0: res.approved_count, 1: res.failed_count })
      );
      if (res.failed?.length) toast.error(res.failed.map((f) => `#${f.id}: ${f.error}`).join('\n'), { duration: 8000 });
      await load();
    } catch (err) {
      toast.error(errorMessage(err, tl("Bulk approve failed")));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkApproveAll = async () => {
    if (
      !window.confirm(
        tl("Approve ALL paid registrations (not just today)? Each payment is re-verified with Moyasar. This will create user accounts.")
      )
    )
      return;
    setBulkBusy(true);
    try {
      const res = await adminService.bulkApproveRegistrations({});
      toast.success(
        tl("Approved {0}. Failed: {1}", { 0: res.approved_count, 1: res.failed_count })
      );
      if (res.failed?.length) toast.error(res.failed.map((f) => `#${f.id}: ${f.error}`).join('\n'), { duration: 8000 });
      await load();
    } catch (err) {
      toast.error(errorMessage(err, tl("Bulk approve failed")));
    } finally {
      setBulkBusy(false);
    }
  };

  // Only paid registrations can be approved (backend re-verifies with Moyasar).
  const paidCount = useMemo(() => stats?.paid || 0, [stats]);

  const copyPaymentId = async (paymentId) => {
    try {
      await navigator.clipboard.writeText(paymentId);
      toast.success(tl("Payment ID copied — search it in the Moyasar dashboard"));
    } catch {
      toast.error(tl("Could not copy"));
    }
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-headline-lg text-[28px] text-on-surface uppercase tracking-wider mb-1">
          {tl("Registrations")}
        </h1>
        <p className="font-body-sm text-on-surface-variant text-[13px]">
          {tl("Approve public-site signups. On approval, a User + Membership is created automatically.")}
        </p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: tl("Pending"), value: stats.pending, accent: 'text-amber-400' },
            { label: tl("Paid"), value: stats.paid, accent: 'text-sky-400' },
            { label: tl("Approved"), value: stats.approved, accent: 'text-emerald-400' },
            { label: tl("Rejected"), value: stats.rejected, accent: 'text-rose-400' },
            { label: tl("Today Total"), value: stats.today_total, accent: 'text-on-surface' },
            { label: tl("Today Pending"), value: stats.today_pending, accent: 'text-amber-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg px-4 py-3"
            >
              <div className={`text-[22px] font-bold ${s.accent}`}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                statusFilter === f.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tl("Search Iqama / name / email / phone")}
          className="bg-[#131316] border border-[#1a1a1e] rounded px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary-container outline-none w-full md:w-72"
        />

        <button
          onClick={handleBulkApproveToday}
          disabled={bulkBusy || paidCount === 0}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-wider"
        >
          {tl("Approve Today")}
        </button>

        <button
          onClick={handleBulkApproveAll}
          disabled={bulkBusy || paidCount === 0}
          className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-wider"
        >
          {tl("Approve All")}
        </button>
      </div>

      <div className="mb-4 empty:hidden"><HighlightBar highlight={highlight} noun={[tl('signup'), tl('signups')]} ready={!loading} /></div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-on-surface-variant text-[13px]">
          {tl("Loading…")}
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg text-on-surface-variant text-[13px]">
          {tl("No registrations match this filter.")}
        </div>
      ) : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3">{tl("Photo")}</th>
                  <th className="px-4 py-3">{tl("Iqama")}</th>
                  <th className="px-4 py-3">{tl("Name")}</th>
                  <th className="px-4 py-3">{tl("Email")}</th>
                  <th className="px-4 py-3">{tl("Phone")}</th>
                  <th className="px-4 py-3">{tl("Plan")}</th>
                  <th className="px-4 py-3">{tl("Amount")}</th>
                  <th className="px-4 py-3">{tl("Payment")}</th>
                  <th className="px-4 py-3">{tl("Moyasar Payment ID")}</th>
                  <th className="px-4 py-3">{tl("Status")}</th>
                  <th className="px-4 py-3 text-right">{tl("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const actionable =
                    r.status === 'pending' || r.status === 'payment_confirmed';
                  const canApprove =
                    r.payment_status === 'paid' && !!r.moyasar_payment_id;
                  return (
                    <tr
                      key={r.id}
                      data-highlight={highlight.has(r.id)}
                      className={`border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] ${highlight.has(r.id) ? HIGHLIGHT_ROW : ''}`}
                    >
                      <td className="px-4 py-3">
                        {r.photo_url ? (
                          <img
                            src={r.photo_url}
                            alt={r.full_name}
                            className="w-10 h-10 rounded object-cover border border-[#1a1a1e]"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[#1a1a1e] flex items-center justify-center text-[10px] text-on-surface-variant">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-on-surface">
                        {r.iqama_number}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-on-surface">
                        {r.full_name}
                        {(r.address || r.address_lat) && (
                          <a className="block text-[11px] text-primary underline truncate max-w-[200px]" target="_blank" rel="noreferrer"
                            title={r.address}
                            href={r.address_lat ? `https://www.google.com/maps?q=${r.address_lat},${r.address_lng}` : `https://www.google.com/maps/search/${encodeURIComponent(r.address)}`}>
                            {r.address || tl("Map")}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-on-surface-variant">
                        {r.email}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-on-surface-variant">
                        {r.phone}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-on-surface">
                        {r.plan_name} · {r.duration_months} mo
                        {r.facilities?.length > 0 && (
                          <div className="mt-1 text-[11px] text-on-surface-variant whitespace-normal max-w-[200px]">
                            + {r.facilities.map((f) => `${f.name} (${f.months} mo)`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-on-surface whitespace-nowrap">
                        {formatSAR(r.payment_amount)}
                      </td>
                      <td className="px-4 py-3 text-[11px] uppercase tracking-wider">
                        <span
                          className={
                            r.payment_status === 'paid'
                              ? 'text-emerald-400'
                              : r.payment_status === 'refunded'
                              ? 'text-sky-400'
                              : r.payment_status === 'failed'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }
                        >
                          {r.payment_status}
                        </span>
                        {r.receipt_url && (
                          <a href={r.receipt_url} target="_blank" rel="noreferrer" className="block mt-1 normal-case tracking-normal text-[11px] text-primary underline">{tl("Receipt")}</a>
                        )}
                        {r.payment_failure_reason && (
                          <div className="mt-1 normal-case tracking-normal text-[11px] text-rose-400 max-w-[220px] whitespace-normal">
                            {r.payment_failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-on-surface">
                        {r.moyasar_payment_id ? (
                          <button
                            onClick={() => copyPaymentId(r.moyasar_payment_id)}
                            title={tl("Copy — verify this payment in the Moyasar dashboard before approving")}
                            className="hover:text-primary-container underline decoration-dotted break-all text-left"
                          >
                            {r.moyasar_payment_id}
                          </button>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                        {r.membership && (
                          <div
                            className={`mt-1 text-[11px] whitespace-nowrap ${
                              r.membership.time_remaining?.expired ? 'text-rose-400' : 'text-on-surface-variant'
                            }`}
                            title={tl("Started {0} (approval) · expires {1}", { 0: formatDate(r.membership.start_date), 1: formatDate(r.membership.expiry_date) })}
                          >
                            {r.membership.time_remaining?.expired
                              ? tl("Expired {0}", { 0: formatDate(r.membership.expiry_date) })
                              : tl("{0} left", { 0: formatRemaining(r.membership.time_remaining) })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {actionable ? (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={busyId === r.id || !canApprove}
                              title={
                                canApprove
                                  ? tl("Verify the payment in the Moyasar dashboard, then approve")
                                  : tl("Approval needs a paid Moyasar payment")
                              }
                              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold uppercase tracking-wider mr-2"
                            >
                              {tl("Approve")}
                            </button>
                            <button
                              onClick={() => setRejecting(r)}
                              disabled={busyId === r.id}
                              className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-[10px] font-bold uppercase tracking-wider"
                            >
                              {tl("Reject")}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant" title={r.rejection_reason || undefined}>
                            {r.created_user_email || (r.status === 'rejected' ? r.rejection_reason : '—')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejecting && (
        <RejectDialog reg={rejecting} busy={busyId === rejecting.id} onClose={() => setRejecting(null)} onSubmit={handleReject} />
      )}
    </div>
  );
}

function RejectDialog({ reg, busy, onClose, onSubmit }) {
  const paid = reg.payment_status === 'paid';
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(paid);
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true"
      aria-label={tl("Reject registration")} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="w-full max-w-md bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl p-5 flex flex-col gap-3"
        onSubmit={(e) => { e.preventDefault(); onSubmit({ reason: reason.trim(), refund: paid && refund }); }}>
        <h3 className="text-on-surface font-bold uppercase tracking-wider">{tl("Reject")}{' '}{reg.full_name}</h3>
        <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Reason (emailed to the applicant)")}</span>
          <textarea className={inputCls} rows={3} maxLength={500} value={reason} autoFocus
            onChange={(e) => setReason(e.target.value)} placeholder={tl("e.g. The Iqama photo is unreadable")} /></label>
        {paid ? (
          <label className="flex items-start gap-2 text-[13px] text-on-surface">
            <input type="checkbox" className="mt-1" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
            <span>{tl("Refund")}{' '}{formatSAR(reg.payment_amount)}{' '}{tl("to their card through Moyasar")}
              <span className="block text-[11px] text-on-surface-variant">{tl("Untick only if the money was already returned another way.")}</span></span>
          </label>
        ) : (
          <p className="text-[11px] text-on-surface-variant">{tl("No payment was taken for this signup, so there is nothing to refund.")}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btn.ghost} onClick={onClose}>{tl("Cancel")}</button>
          <button type="submit" className={btn.danger} disabled={busy}>{busy ? tl("Rejecting…") : refund && paid ? tl("Reject & refund") : tl("Reject")}</button>
        </div>
      </form>
    </div>
  );
}