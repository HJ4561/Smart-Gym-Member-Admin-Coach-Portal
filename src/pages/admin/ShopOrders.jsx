// src/pages/admin/ShopOrders.jsx
// Fulfil shop orders (paid → preparing → ready / in locker → collected), refund them,
// and settle payments that were taken but couldn't be delivered ("review").
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { opsService as api } from '../../services/opsService';
import { errorMessage } from '../../utils/apiError';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { tl, locale } from '../../i18n';
import { HIGHLIGHT_ROW, useHighlight } from '../../hooks/useHighlight';
import HighlightBar from '../../components/admin/HighlightBar';

const TABS = [
  { id: '', label: tl("All") },
  { id: 'open', label: tl("To fulfil") },
  { id: 'pending', label: tl("Awaiting payment") },
  { id: 'completed', label: tl("Collected") },
  { id: 'refunded', label: tl("Refunded") },
  { id: 'cancelled', label: tl("Cancelled") },
  { id: 'review', label: tl("Payments to review") },
];

const STATUS = {
  pending: ['Awaiting payment', 'bg-amber-500/15 text-amber-300'],
  paid: ['Paid', 'bg-sky-500/15 text-sky-300'],
  preparing: ['Preparing', 'bg-sky-500/15 text-sky-300'],
  ready: ['Ready at desk', 'bg-emerald-500/15 text-emerald-400'],
  dispatched: ['In locker', 'bg-emerald-500/15 text-emerald-400'],
  completed: ['Collected', 'bg-[#1a1a1e] text-on-surface-variant'],
  cancelled: ['Cancelled', 'bg-[#1a1a1e] text-on-surface-variant'],
  refunded: ['Refunded', 'bg-rose-500/15 text-rose-300'],
};
const NEXT_LABEL = {
  preparing: 'Start preparing', ready: 'Ready at desk', dispatched: 'Put in locker',
  completed: 'Mark collected', cancelled: 'Cancel order',
};
const OPEN = ['paid', 'preparing', 'ready', 'dispatched'];

const sar = (v) => `SAR ${Number(v || 0).toFixed(2)}`;

export default function ShopOrders() {
  const [params] = useSearchParams();             // ?q=ORD-… from the header search, ?tab=review from alerts
  const highlight = useHighlight();
  const [tab, setTab] = useState(TABS.some((t) => t.id && t.id === params.get('tab')) ? params.get('tab') : '');
  const [q, setQ] = useState(params.get('q') || '');
  const [data, setData] = useState({ counts: {}, results: [] });
  const [review, setReview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);       // order detail
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  const quiet = useRef(false);                 // background refresh: no loading state, no error toast
  useAutoRefresh(() => { quiet.current = true; load(); }, 20_000);
  useEffect(() => {
    let alive = true;
    const background = quiet.current;
    quiet.current = false;
    (async () => {
      if (!background) setLoading(true);
      try {
        const [orders, rv] = await Promise.all([
          tab === 'review' ? Promise.resolve(null) : api.orders({ status: tab, q }),
          api.paymentsReview(),
        ]);
        if (!alive) return;
        if (orders) setData(orders);
        setReview(rv);
      } catch (err) { if (!background) toast.error(errorMessage(err)); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [tab, q, version]);

  const counts = data.counts || {};
  const tabCount = (id) => (id === 'review' ? review.length
    : id === 'open' ? OPEN.reduce((n, s) => n + (counts[s] || 0), 0)
      : id === '' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[id] || 0);

  const openOrder = async (row) => {
    try { setOpen(await api.order(row.order_number)); } catch (err) { toast.error(errorMessage(err)); }
  };

  const move = async (row, status) => {
    if (status === 'cancelled' && !window.confirm(tl("Cancel {0}? Stock is put back.", { 0: row.order_number }))) return;
    setBusy(true);
    try {
      await api.setOrderStatus(row.order_number, status);
      toast.success(`${row.order_number}: ${NEXT_LABEL[status] || status}`);
      if (open?.order_number === row.order_number) setOpen(await api.order(row.order_number));
      load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const refund = async (row) => {
    const reason = window.prompt(
      `Refund ${sar(row.total)} for ${row.order_number}?\n` +
      (row.paid_with === 'locker_credit' ? 'It goes back to the member’s locker credit.' : 'It is refunded to the card through Moyasar.') +
      '\n\nReason (optional):', '',
    );
    if (reason === null) return;
    setBusy(true);
    try {
      await api.refundOrder(row.order_number, { reason });
      toast.success(tl("Refunded"));
      setOpen(null);
      load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const refundIntent = async (i) => {
    const reason = window.prompt(tl("Refund {0} to {1}?\n{2}\n\nReason (optional):", { 0: sar(i.amount), 1: i.member.name, 2: i.description }), '');
    if (reason === null) return;
    setBusy(true);
    try {
      await api.refundPayment(i.id, { reason });
      toast.success(tl("Refunded"));
      load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <PageHeader
        title={tl("Shop Orders")}
        subtitle={tl("Prepare and hand over paid orders. Members are notified at each step. Refunds go back to the card (Moyasar) or to locker credit, whichever was used.")}
      />

      <div className="flex gap-1 mb-4 flex-wrap" role="tablist">
        {TABS.map((t) => (
          <button key={t.label} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${tab === t.id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
            {t.label} <span className="opacity-60">({tabCount(t.id)})</span>
          </button>
        ))}
      </div>

      {tab !== 'review' && (
        <input className={`${inputCls} max-w-sm mb-4`} placeholder={tl("Search order number or member…")} value={q}
          onChange={(e) => setQ(e.target.value)} aria-label={tl("Search orders")} />
      )}

      {tab === 'review' && (
        <div className="mb-4 empty:hidden"><HighlightBar highlight={highlight} noun={[tl('payment'), tl('payments')]} ready={!loading} /></div>
      )}

      {loading ? <Empty>{tl("Loading…")}</Empty> : tab === 'review' ? (
        !review.length ? <Empty>{tl("Nothing to review — every payment was delivered.")}</Empty> : (
          <div className="flex flex-col gap-2">
            {review.map((i) => (
              <div key={i.id} data-highlight={highlight.has(i.id)}
                className={`bg-[#0e0e0f] border border-amber-500/30 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between ${highlight.has(i.id) ? HIGHLIGHT_ROW : ''}`}>
                <div className="min-w-0">
                  <div className="text-on-surface font-bold">{i.description}</div>
                  <div className="text-[12px] text-on-surface-variant">{i.member.name} · {i.member.email} · {new Date(i.created_at).toLocaleString(locale)}</div>
                  <div className="text-[12px] text-amber-300 mt-1">{i.failure_reason}</div>
                  {i.moyasar_payment_id && <code className="text-[10px] text-on-surface-variant">{i.moyasar_payment_id}</code>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-on-surface font-bold">{sar(i.amount)}</span>
                  <button type="button" className={btn.danger} disabled={busy} onClick={() => refundIntent(i)}>{tl("Refund")}</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !data.results.length ? <Empty>{tl("No orders here.")}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-[#1a1a1e]">
                <th className="p-3">{tl("Order")}</th><th className="p-3">{tl("Member")}</th><th className="p-3">{tl("Pickup")}</th>
                <th className="p-3">{tl("Total")}</th><th className="p-3">{tl("Status")}</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.results.map((o) => {
                const [label, cls] = STATUS[o.status] || [o.status, ''];
                return (
                  <tr key={o.order_number} className="border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer" onClick={() => openOrder(o)}>
                    <td className="p-3">
                      <div className="text-on-surface font-bold">{o.order_number}</div>
                      <div className="text-[11px] text-on-surface-variant">{new Date(o.created_at).toLocaleString(locale)} · {o.item_count} item{o.item_count === 1 ? '' : 's'}</div>
                    </td>
                    <td className="p-3"><div className="text-on-surface">{o.member.name}</div><div className="text-[11px] text-on-surface-variant">{o.member.email}</div></td>
                    <td className="p-3 text-on-surface-variant">{o.delivery_method === 'counter' ? tl("Front desk") : tl("Locker {0}", { 0: o.locker_number })}</td>
                    <td className="p-3 text-on-surface">{sar(o.total)}<div className="text-[11px] text-on-surface-variant">{o.paid_with === 'locker_credit' ? tl("Locker credit") : o.paid_with ? tl("Card / STC Pay") : ''}</div></td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span></td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end flex-wrap">
                        {o.next.filter((s) => s !== 'cancelled').map((s) => (
                          <button key={s} type="button" className={btn.primary} disabled={busy} onClick={() => move(o, s)}>{NEXT_LABEL[s]}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!open}
        title={open?.order_number}
        subtitle={open ? `${open.member.name} · ${open.member.email}` : ''}
        onClose={() => setOpen(null)}
        footer={open && (
          <div className="flex gap-2 flex-wrap">
            {open.next.map((s) => (
              <button key={s} type="button" className={s === 'cancelled' ? btn.ghost : btn.primary} disabled={busy} onClick={() => move(open, s)}>
                {NEXT_LABEL[s]}
              </button>
            ))}
            {open.refundable && <button type="button" className={btn.danger} disabled={busy} onClick={() => refund(open)}>{tl("Refund")}</button>}
          </div>
        )}
      >
        {open && (
          <div className="flex flex-col gap-4 text-[13px]">
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${(STATUS[open.status] || [])[1]}`}>{(STATUS[open.status] || [open.status])[0]}</span>
              <span className="text-on-surface-variant">{open.delivery_method === 'counter' ? tl("Front desk pickup") : tl("Locker {0}", { 0: open.locker_number })}</span>
            </div>
            <table className="w-full">
              <tbody>
                {(open.detail.items || []).map((it) => (
                  <tr key={it.id} className="border-b border-[#1a1a1e]">
                    <td className="py-2 text-on-surface">{it.product_name} <span className="text-on-surface-variant">× {it.quantity}</span></td>
                    <td className="py-2 text-right text-on-surface">{sar(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-1">
              <Line label={tl("Subtotal")} value={sar(open.detail.subtotal)} />
              {Number(open.detail.discount) > 0 && <Line label={tl("Promo {0}", { 0: open.detail.promo_code })} value={`-${sar(open.detail.discount)}`} />}
              <Line label={tl("VAT")} value={sar(open.detail.tax)} />
              <Line label={tl("Total")} value={sar(open.detail.total)} bold />
            </div>
            {open.detail.notes && <p className="text-on-surface-variant whitespace-pre-wrap">{tl("Note:")}{' '}{open.detail.notes}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
