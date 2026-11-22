// src/pages/admin/AdminApprovals.jsx
// Everything staff and members sent that waits for an admin: new videos, products, profile changes,
// member reviews… The admin opens one, can adjust the values, then approves or rejects with a note.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { approvalsService as api } from '../../services/approvalsService';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { FilterBar, Pager } from '../../components/common/ListTools';
import { useApi } from '../../hooks/useApi';
import { useDebounced, useListState } from '../../hooks/useListState';
import { isAr, locale, tl } from '../../i18n';

const STATUS = [
  { value: 'pending', label: tl('Waiting') }, { value: 'approved', label: tl('Approved') },
  { value: 'rejected', label: tl('Rejected') }, { value: 'withdrawn', label: tl('Withdrawn') },
];
const KINDS = [{ value: 'create', label: tl('New') }, { value: 'update', label: tl('Change') }, { value: 'delete', label: tl('Remove') }];
const KIND_TONE = { create: 'bg-emerald-500/15 text-emerald-400', update: 'bg-amber-500/15 text-amber-400', delete: 'bg-rose-500/15 text-rose-400' };

function show(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? tl('Yes') : tl('No');
  if (typeof v === 'object') return Array.isArray(v) ? v.join(', ') || '—' : JSON.stringify(v);
  return String(v);
}
const label = (field) => tl(field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
const when = (iso) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function AdminApprovals() {
  const [params, setParams] = useSearchParams();
  const [f, set, clear] = useListState({ status: 'pending', type: '', kind: '', q: '' });
  const search = useDebounced(f.q);
  const [openId, setOpenId] = useState(() => Number(params.get('open')) || null);
  const { data: raw, loading, refetch: load } = useApi(
    () => api.queue({ status: f.status, type: f.type || undefined, kind: f.kind || undefined, q: search || undefined, page: f.page }),
    [f.status, f.type, f.kind, search, f.page], { poll: 30_000 });
  const data = raw || { results: [], types: [], count: 0, pages: 1 };
  const { status } = f;

  const close = () => {
    setOpenId(null);
    if (params.get('open')) { params.delete('open'); setParams(params, { replace: true }); }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <PageHeader title={tl('Approvals')}
        subtitle={tl('Videos, products, profile changes and member reviews stay hidden until you approve them. Live items keep their current version while a change waits here.')} />
      <FilterBar
        tabs={{ value: status, onChange: (v) => set('status', v), options: STATUS.map((s) => ({ ...s, count: s.value === status ? data.count : undefined })) }}
        search={f.q} onSearch={(v) => set('q', v)} placeholder={tl('Search title or person…')}
        filters={[
          { key: 'type', label: tl('Type'), value: f.type, onChange: (v) => set('type', v),
            options: (data.types || []).map((t) => ({ value: t.value, label: isAr ? t.label_ar : tl(t.label) })) },
          { key: 'kind', label: tl('Request'), value: f.kind, onChange: (v) => set('kind', v), options: KINDS },
        ]}
        onClear={clear} />
      {data.courses_waiting > 0 && (
        <Link to="/admin/trainers?tab=courses&status=pending"
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-300 hover:bg-amber-500/15">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">school</span>
          {tl('{0} new course(s) from coaches are waiting for review on the Coaches page →', { 0: data.courses_waiting })}
        </Link>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#0e0e0f] rounded-lg animate-pulse" />)}</div>
      ) : data.results.length === 0 ? (
        <Empty>{status === 'pending' ? tl('Nothing is waiting for approval.') : tl('No requests match.')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {data.results.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpenId(r.id)}
              className="text-left bg-[#0e0e0f] border border-[#1a1a1e] hover:border-primary-container/60 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${KIND_TONE[r.kind]}`}>{tl(r.kind_label)}</span>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{isAr ? r.type_label_ar : tl(r.type_label)}</span>
                <span className="text-[11px] text-on-surface-variant ml-auto">{when(r.created_at)}</span>
              </div>
              <div className="text-on-surface font-bold">{r.summary}</div>
              <div className="text-[12px] text-on-surface-variant">
                {tl('From {0}', { 0: r.submitted_by ? `${r.submitted_by.name} (${tl(r.submitted_by.role)})` : '—' })}
                {r.reviewed_by && ` · ${tl('{0} by {1}', { 0: tl(r.status), 1: r.reviewed_by.name })}`}
              </div>
              {r.kind === 'update' && (
                <div className="text-[12px] text-on-surface-variant flex flex-col gap-0.5">
                  {r.changes.slice(0, 3).map((c) => (
                    <div key={c.field} className="truncate"><span className="text-on-surface">{label(c.field)}:</span> {show(c.before)} → <span className="text-primary">{show(c.after)}</span></div>
                  ))}
                  {r.changes.length > 3 && <div>{tl('+{0} more', { 0: r.changes.length - 3 })}</div>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      <Pager page={data.page} pages={data.pages} count={data.count} onPage={(n) => set('page', n)} />
      {openId && <Review id={openId} onClose={close} onDone={() => { close(); load(); }} />}
    </div>
  );
}

function Review({ id, onClose, onDone }) {
  const [r, setR] = useState(null);
  const [edits, setEdits] = useState({});
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.detail(id).then((d) => { if (alive) setR(d); }).catch((err) => { toast.error(errorMessage(err)); onClose(); });
    return () => { alive = false; };
  }, [id, onClose]);

  if (!r) return <Drawer open title={tl('Loading…')} onClose={onClose}><div className="h-40 animate-pulse bg-[#0e0e0f] rounded" /></Drawer>;

  const pending = r.status === 'pending';
  const proposed = r.kind === 'update' ? r.payload : r.current;
  const value = (f) => (f in edits ? edits[f] : proposed?.[f]);
  const editable = new Set(r.editable || []);
  const fields = Array.from(new Set([...Object.keys(r.kind === 'update' ? r.payload : {}), ...Object.keys(r.current || {})]));

  const act = async (approve) => {
    setBusy(true);
    setErrors({});
    try {
      if (approve) {
        const changed = Object.keys(edits).length ? { ...(r.kind === 'update' ? r.payload : {}), ...edits } : undefined;
        await api.approve(r.id, { payload: changed, note });
        toast.success(tl('Approved — it’s live now'));
      } else {
        await api.reject(r.id, note);
        toast.success(tl('Rejected — they’ve been told why'));
      }
      onDone();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title={r.summary}
      subtitle={`${isAr ? r.type_label_ar : tl(r.type_label)} · ${tl(r.kind_label)} · ${tl('From {0}', { 0: r.submitted_by?.name || '—' })} · ${when(r.created_at)}`}
      footer={pending ? <>
        <button type="button" className={btn.danger} disabled={busy} onClick={() => act(false)}>{tl('Reject')}</button>
        <div className="flex-1" />
        <button type="button" className={btn.ghost} onClick={onClose}>{tl('Close')}</button>
        <button type="button" className={btn.primary} disabled={busy || !r.exists} onClick={() => act(true)}>
          {busy ? tl('Saving…') : r.kind === 'delete' ? tl('Approve removal') : tl('Approve')}
        </button>
      </> : <button type="button" className={btn.ghost} onClick={onClose}>{tl('Close')}</button>}>
      {!r.exists && <p className="text-amber-400 text-[13px]">{tl('The item no longer exists.')}</p>}
      {!pending && (
        <p className="text-[13px] text-on-surface-variant">
          {tl('{0} by {1} on {2}.', { 0: tl(r.status), 1: r.reviewed_by?.name || '—', 2: when(r.reviewed_at) })}
          {r.review_note && <><br />{tl('Note')}: {r.review_note}</>}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className={`${labelCls} py-2 pr-3`}>{tl('Field')}</th>
              {r.kind === 'update' && <th className={`${labelCls} py-2 pr-3`}>{tl('Live now')}</th>}
              <th className={`${labelCls} py-2`}>{r.kind === 'update' ? tl('Proposed') : r.kind === 'delete' ? tl('Value') : tl('Sent')}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const changed = r.kind === 'update' && f in r.payload;
              const v = value(f);
              return (
                <tr key={f} className={`border-t border-[#1a1a1e] align-top ${changed ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-2 pr-3 text-on-surface-variant whitespace-nowrap">{label(f)}</td>
                  {r.kind === 'update' && <td className="py-2 pr-3 text-on-surface-variant break-words max-w-[16rem]">{show(r.current?.[f])}</td>}
                  <td className="py-2 break-words">
                    {pending && editable.has(f) && (r.kind === 'create' || changed) ? (
                      <Editor value={v} onChange={(nv) => setEdits((e) => ({ ...e, [f]: nv }))} />
                    ) : <span className={changed ? 'text-primary' : 'text-on-surface'}>{show(v)}</span>}
                    {errors[f] && <div className="text-[11px] text-rose-400 mt-1">{tl(errors[f])}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pending && (
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{tl('Note to the person (required to reject)')}</span>
          <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          {errors.note && <span className="text-[11px] text-rose-400">{tl(errors.note)}</span>}
        </label>
      )}
    </Drawer>
  );
}

/** An input that keeps the value's type: number, yes/no, list (one per line) or text. */
function Editor({ value, onChange }) {
  if (typeof value === 'boolean') {
    return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (typeof value === 'number') {
    return <input className={inputCls} type="number" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
  }
  if (Array.isArray(value)) {
    return <textarea className={inputCls} rows={3} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))} />;
  }
  const s = value == null ? '' : String(value);
  return s.length > 60
    ? <textarea className={inputCls} rows={4} value={s} onChange={(e) => onChange(e.target.value)} />
    : <input className={inputCls} value={s} onChange={(e) => onChange(e.target.value)} />;
}
