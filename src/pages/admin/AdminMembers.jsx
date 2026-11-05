// src/pages/admin/AdminMembers.jsx
// Members: who has an active, expiring, expired or frozen membership, the member
// file (payments, visits, facilities), and the actions the front desk needs.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService as api } from '../../services/adminService';
import { zatcaService } from '../../services/zatcaService';
import { errorMessage } from '../../utils/apiError';
import { formatDate, formatRemaining } from '../../utils/membershipTime';
import { formatSAR } from '../../utils/money';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { tl, locale } from '../../i18n';
import { HIGHLIGHT_ROW, useHighlight } from '../../hooks/useHighlight';
import HighlightBar from '../../components/admin/HighlightBar';
import { LOCKER_CREDIT_ENABLED } from '../../config/features';

const FILTERS = [
  ['', tl("All"), 'total'], ['active', tl("Active"), 'active'], ['expiring', tl("Expiring (14 days)"), 'expiring'],
  ['expired', tl("Expired"), 'expired'], ['frozen', tl("Frozen"), 'frozen'], ['none', tl("No membership"), 'none'],
  ['inactive', tl("Deactivated"), 'inactive'],
];
const BADGE = {
  active: 'bg-emerald-500/15 text-emerald-400', expiring: 'bg-amber-500/15 text-amber-300',
  expired: 'bg-rose-500/15 text-rose-300', frozen: 'bg-sky-500/15 text-sky-300', none: 'bg-[#1a1a1e] text-on-surface-variant',
};

export default function AdminMembers() {
  const [params] = useSearchParams();   // ?status= from alerts and insights
  const highlight = useHighlight();     // ?highlight= ids: the list shows just those members
  const [status, setStatus] = useState(() => (FILTERS.some(([id]) => id && id === params.get('status')) ? params.get('status') : ''));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, results: [], next: null, previous: null });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [file, setFile] = useState(null);            // member detail
  const [dialog, setDialog] = useState(null);        // { kind: extend|freeze|message, ids? }
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const [list, st] = await Promise.all([
          api.members({ status, search: search.trim(), page, ids: highlight.raw || undefined }), api.memberStats()]);
        if (!alive) return;
        setData(list);
        setStats(st);
      } catch (err) { toast.error(errorMessage(err)); } finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(id); };
  }, [status, search, page, version, highlight.raw]);

  const openFile = async (id) => {
    try { setFile(await api.member(id)); } catch (err) { toast.error(errorMessage(err)); }
  };

  const run = async (id, action, fields = {}, ok = 'Done') => {
    setBusy(true);
    try {
      await api.memberAction(id, action, fields);
      toast.success(ok);
      setDialog(null);
      if (file?.id === id) setFile(await api.member(id));
      reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const bulk = async (action, fields = {}) => {
    setBusy(true);
    try {
      if (action === 'export') {
        const blob = await api.bulkMemberAction('export', selected);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'smart-gym-members.csv'; a.click();
        URL.revokeObjectURL(url);
      } else {
        const res = await api.bulkMemberAction(action, selected, fields);
        toast.success(res.detail);
        if (res.errors?.length) toast.error(res.errors.slice(0, 3).join('\n'));
        setDialog(null);
        reload();
      }
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = data.results.length > 0 && data.results.every((m) => selected.includes(m.id));

  return (
    <div className="p-8 bg-background min-h-screen">
      <PageHeader title={tl("Members")} subtitle={tl("Search by name, email, phone or Iqama. Open a member to extend, freeze, message or reset their password.")} />

      <div className="flex gap-1 mb-4 flex-wrap" role="tablist">
        {FILTERS.map(([id, label, key]) => (
          <button key={label} type="button" role="tab" aria-selected={status === id} onClick={() => { setStatus(id); setPage(1); }}
            className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${status === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
            {label} <span className="opacity-60">({stats[key] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input className={`${inputCls} max-w-sm`} placeholder={tl("Search name, email, phone, Iqama…")} value={search} aria-label={tl("Search members")}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {selected.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-[12px] text-on-surface-variant">{selected.length} selected</span>
            <button type="button" className={btn.ghost} disabled={busy} onClick={() => setDialog({ kind: 'message', ids: selected })}>{tl("Message")}</button>
            <button type="button" className={btn.ghost} disabled={busy} onClick={() => setDialog({ kind: 'freeze', ids: selected })}>{tl("Freeze")}</button>
            <button type="button" className={btn.ghost} disabled={busy} onClick={() => bulk('export')}>{tl("Export CSV")}</button>
            <button type="button" className={btn.ghost} onClick={() => setSelected([])}>{tl("Clear")}</button>
          </div>
        )}
      </div>

      <div className="mb-4 empty:hidden"><HighlightBar highlight={highlight} noun={[tl('member'), tl('members')]} ready={!loading} /></div>

      {loading && !data.results.length ? <Empty>{tl("Loading…")}</Empty> : !data.results.length ? <Empty>{tl("No members here.")}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-[#1a1a1e]">
                <th className="p-3 w-8">
                  <input type="checkbox" aria-label={tl("Select page")} checked={allOnPage}
                    onChange={() => setSelected(allOnPage ? selected.filter((id) => !data.results.some((m) => m.id === id))
                      : [...new Set([...selected, ...data.results.map((m) => m.id)])])} />
                </th>
                <th className="p-3">{tl("Member")}</th><th className="p-3">{tl("Iqama")}</th><th className="p-3">{tl("Plan")}</th>
                <th className="p-3">{tl("Expires")}</th><th className="p-3">{tl("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((m) => (
                <tr key={m.id} data-highlight={highlight.has(m.id)}
                  className={`border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer ${m.is_active ? '' : 'opacity-60'} ${highlight.has(m.id) ? HIGHLIGHT_ROW : ''}`}
                  onClick={() => openFile(m.id)}>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={tl("Select {0}", { 0: m.full_name })} checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                  </td>
                  <td className="p-3"><div className="text-on-surface font-bold">{m.full_name}</div><div className="text-[11px] text-on-surface-variant">{m.email}{m.phone && ` · ${m.phone}`}</div></td>
                  <td className="p-3 font-mono text-on-surface-variant">{m.iqama_number || '—'}</td>
                  <td className="p-3 text-on-surface">{m.plan || '—'}</td>
                  <td className="p-3 text-on-surface-variant">{m.expiry_date ? `${formatDate(m.expiry_date)} · ${formatRemaining(m.time_remaining)}` : '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${BADGE[m.membership_status]}`}>{m.membership_status === 'none' ? tl("No plan") : m.membership_status}</span>
                    {!m.is_active && <span className="ml-1 text-[10px] text-rose-300 uppercase font-bold">{tl("Deactivated")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 text-[12px] text-on-surface-variant">
        <span>{data.count} member{data.count === 1 ? '' : 's'}</span>
        <div className="flex gap-2">
          <button type="button" className={btn.ghost} disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>{tl("Previous")}</button>
          <span className="self-center">{tl("Page")}{' '}{page}</span>
          <button type="button" className={btn.ghost} disabled={!data.next} onClick={() => setPage((p) => p + 1)}>{tl("Next")}</button>
        </div>
      </div>

      {/* Member file */}
      <Drawer open={!!file} title={file?.full_name} subtitle={file ? `${file.email}${file.phone ? ` · ${file.phone}` : ''}` : ''}
        onClose={() => setFile(null)}
        footer={file && (
          <div className="flex gap-2 flex-wrap">
            {file.membership && <button type="button" className={btn.primary} onClick={() => setDialog({ kind: 'extend', id: file.id })}>{tl("Extend")}</button>}
            {file.membership && (file.membership_status === 'frozen'
              ? <button type="button" className={btn.ghost} disabled={busy} onClick={() => run(file.id, 'unfreeze', {}, 'Unfrozen')}>{tl("Unfreeze")}</button>
              : <button type="button" className={btn.ghost} onClick={() => setDialog({ kind: 'freeze', id: file.id })}>{tl("Freeze")}</button>)}
            <button type="button" className={btn.ghost} onClick={() => setDialog({ kind: 'message', id: file.id })}>{tl("Message")}</button>
            <button type="button" className={btn.ghost} disabled={busy}
              onClick={() => window.confirm(tl("Email {0} a temporary password? Their current password stops working.", { 0: file.email })) && run(file.id, 'reset_password', {}, 'Temporary password emailed')}>
              {tl("Reset password")}
            </button>
            {file.two_factor && (
              <button type="button" className={btn.ghost} disabled={busy}
                onClick={() => window.confirm(tl("Turn off 2-step verification for {0}? Use this when they lost their phone or email access.", { 0: file.full_name })) && run(file.id, 'reset_2fa', {}, tl('2-step verification turned off'))}>
                {tl("Reset 2-step verification")}
              </button>
            )}
            {file.is_active
              ? <button type="button" className={btn.danger} disabled={busy} onClick={() => window.confirm(tl("Deactivate {0}? They can't log in until reactivated.", { 0: file.full_name })) && run(file.id, 'deactivate', {}, 'Deactivated')}>{tl("Deactivate")}</button>
              : <button type="button" className={btn.primary} disabled={busy} onClick={() => run(file.id, 'reactivate', {}, 'Reactivated')}>{tl("Reactivate")}</button>}
          </div>
        )}
      >
        {file && <MemberFile file={file} />}
      </Drawer>

      <ActionDialog dialog={dialog} busy={busy} onClose={() => setDialog(null)}
        onSubmit={(fields) => (dialog.ids
          ? bulk(dialog.kind, fields)
          : run(dialog.id, dialog.kind, fields, { extend: 'Membership extended', freeze: 'Membership frozen', message: tl("Message sent") }[dialog.kind]))} />
    </div>
  );
}

function MemberFile({ file }) {
  const m = file.membership;
  return (
    <div className="flex flex-col gap-5 text-[13px]">
      <div className="grid grid-cols-2 gap-3">
        <Info label={tl("Plan")} value={m?.plan?.display_name || 'No membership'} />
        <Info label={tl("Status")} value={file.membership_status === 'frozen' ? `Frozen until ${formatDate(file.frozen_until)}` : file.membership_status} />
        <Info label={tl("Expires")} value={m ? `${formatDate(m.expiry_date)} (${formatRemaining(m.time_remaining)})` : '—'} />
        <Info label={tl("Iqama · Pass")} value={m ? `${m.iqama_number || '—'} · ${m.pass_id}` : '—'} />
        {LOCKER_CREDIT_ENABLED && <Info label={tl("Locker credit")} value={formatSAR(file.locker_credit)} />}
        <Info label={tl("Visits")} value={m?.total_check_ins ?? 0} />
      </div>
      {file.must_change_password && <p className="text-amber-300 text-[12px]">{tl("Must change password at next login.")}</p>}
      <Section title={tl("Facilities")}>
        {file.facilities.length ? file.facilities.map((f) => <div key={f.name}>{f.name}{' '}{tl("· until")}{' '}{formatDate(f.expires_on)}</div>) : <span className="text-on-surface-variant">{tl("None")}</span>}
      </Section>
      <Section title={tl("Recent payments")}>
        {file.recent_payments.length ? file.recent_payments.map((p, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="truncate">{new Date(p.date).toLocaleDateString(locale)} · {p.description}</span>
            <span className="shrink-0">{formatSAR(p.amount)}</span>
          </div>
        )) : <span className="text-on-surface-variant">{tl("None")}</span>}
      </Section>
      <Section title={tl("Recent visits")}>
        {file.recent_visits.length ? file.recent_visits.map((v, i) => (
          <div key={i}>{new Date(v.check_in).toLocaleString(locale)} {v.check_out ? `→ ${new Date(v.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : tl("· in the gym")} · {v.zone}</div>
        )) : <span className="text-on-surface-variant">{tl("None")}</span>}
      </Section>
      {file.iqama_number && <Link to={`/admin/member-lookup?iqama=${file.iqama_number}`} className="text-primary text-[12px] hover:underline">{tl("Open in Member Lookup (check in) →")}</Link>}
    </div>
  );
}

function ActionDialog({ dialog, busy, onClose, onSubmit }) {
  const [f, setF] = useState({});
  const [companies, setCompanies] = useState([]);     // the member's saved companies → a B2B tax invoice
  useEffect(() => {
    const id = setTimeout(() => setF(dialog?.kind === 'extend' ? { months: 1, payment: 'cash', amount: '' } : dialog?.kind === 'freeze' ? { days: 14 } : { title: '', message: '' }), 0);
    return () => clearTimeout(id);
  }, [dialog]);
  useEffect(() => {
    let alive = true;
    if (dialog?.kind === 'extend' && dialog.id) {
      zatcaService.companies({ member: dialog.id }).then((rows) => { if (alive) setCompanies(rows); }).catch(() => {});
    }
    return () => { alive = false; setCompanies([]); };
  }, [dialog]);
  if (!dialog) return null;
  const title = { extend: 'Extend membership', freeze: 'Freeze membership', message: tl("Send a message") }[dialog.kind];
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="w-full max-w-md bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl p-5 flex flex-col gap-3"
        onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
        <h3 className="text-on-surface font-bold uppercase tracking-wider">{title}{dialog.ids ? tl(" · {0} members", { 0: dialog.ids.length }) : ''}</h3>
        {dialog.kind === 'extend' && (
          <>
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Months")}</span>
              <select className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })}>
                {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Payment")}</span>
              <select className={inputCls} value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })}>
                <option value="cash">{tl("Cash at desk")}</option><option value="card_terminal">{tl("Card terminal at desk")}</option>
                <option value="complimentary">{tl("Complimentary (no payment)")}</option>
              </select></label>
            {f.payment !== 'complimentary' && (
              <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Amount received (SAR)")}</span>
                <input className={inputCls} inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            )}
            {f.payment !== 'complimentary' && companies.length > 0 && (
              <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Tax invoice for")}</span>
                <select className={inputCls} value={f.business_customer_id || ''}
                  onChange={(e) => setF({ ...f, business_customer_id: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">{tl("The member (simplified invoice)")}</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.vat_number}</option>)}
                </select></label>
            )}
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Note (optional)")}</span>
              <input className={inputCls} maxLength={120} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
            <p className="text-[11px] text-on-surface-variant">{tl("Added after the current expiry (or from today if expired). Desk payments appear in the member’s payment history and in revenue.")}</p>
          </>
        )}
        {dialog.kind === 'freeze' && (
          <>
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Days (1–90)")}</span>
              <input className={inputCls} type="number" min="1" max="90" value={f.days ?? ''} onChange={(e) => setF({ ...f, days: Number(e.target.value) })} /></label>
            <p className="text-[11px] text-on-surface-variant">{tl("No gym access during the freeze; the expiry date moves forward by the same number of days. Unfreezing early gives back the unused days.")}</p>
          </>
        )}
        {dialog.kind === 'message' && (
          <>
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Title")}</span>
              <input className={inputCls} maxLength={120} required value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className={labelCls}>{tl("Message")}</span>
              <textarea className={inputCls} rows={4} maxLength={2000} required value={f.message || ''} onChange={(e) => setF({ ...f, message: e.target.value })} /></label>
            <p className="text-[11px] text-on-surface-variant">{tl("Appears in the member portal’s notifications.")}</p>
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" className={btn.ghost} onClick={onClose}>{tl("Cancel")}</button>
          <button type="submit" className={btn.primary} disabled={busy}>{busy ? tl("Saving…") : tl("Confirm")}</button>
        </div>
      </form>
    </div>
  );
}

function Info({ label, value }) {
  return <div><div className={labelCls}>{label}</div><div className="text-on-surface capitalize">{value}</div></div>;
}

function Section({ title, children }) {
  return <div className="flex flex-col gap-1"><div className={labelCls}>{title}</div><div className="flex flex-col gap-1 text-on-surface">{children}</div></div>;
}
