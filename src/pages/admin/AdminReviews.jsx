// src/pages/admin/AdminReviews.jsx
// Every member review of a course or a coach: filter, search and delete. New reviews are approved on the
// Approvals page; this is where a published one is taken down.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminService as api } from '../../services/adminService';
import { useApi } from '../../hooks/useApi';
import { useDebounced, useListState } from '../../hooks/useListState';
import { FilterBar, Pager } from '../../components/common/ListTools';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { errorMessage } from '../../utils/apiError';
import { locale, tl } from '../../i18n';

const TYPES = [{ value: '', label: tl('All') }, { value: 'course', label: tl('Courses') }, { value: 'trainer', label: tl('Coaches') }];
const STATUS = [{ value: 'approved', label: tl('Published') }, { value: 'pending', label: tl('Waiting for approval') },
  { value: 'rejected', label: tl('Not approved') }];
const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: tl('{0} stars', { 0: n }) }));
const TONE = { approved: 'bg-emerald-500/15 text-emerald-400', pending: 'bg-amber-500/15 text-amber-300',
  rejected: 'bg-rose-500/15 text-rose-300' };

export default function AdminReviews() {
  const [f, set, clear] = useListState({ type: '', status: '', rating: '', q: '' });
  const search = useDebounced(f.q);
  const [busy, setBusy] = useState(null);
  const { data, loading, refetch } = useApi(
    () => api.reviews({ type: f.type || undefined, status: f.status || undefined, rating: f.rating || undefined,
      q: search || undefined, page: f.page }),
    [f.type, f.status, f.rating, search, f.page], { poll: 60_000 });
  const rows = data?.results || [];

  const remove = async (r) => {
    if (!window.confirm(tl('Delete this {0}★ review by {1}? It comes off the page and out of the rating straight away.',
      { 0: r.rating, 1: r.member.name }))) return;
    setBusy(r.id);
    try {
      await api.deleteReview(r.type, r.id);
      toast.success(tl('Review deleted'));
      refetch();
    } catch (err) {
      toast.error(errorMessage(err, tl('Could not delete the review')));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <PageHeader title={tl('Reviews')}
        subtitle={tl('What members wrote about courses and coaches. New reviews are approved on the Approvals page; delete one here to take it down.')} />
      <FilterBar
        tabs={{ value: f.type, onChange: (v) => set('type', v),
          options: TYPES.map((t) => ({ ...t, count: t.value ? data?.counts?.[t.value] : undefined })) }}
        search={f.q} onSearch={(v) => set('q', v)} placeholder={tl('Search course, coach, member or words…')}
        filters={[
          { key: 'status', label: tl('Status'), value: f.status, onChange: (v) => set('status', v), options: STATUS },
          { key: 'rating', label: tl('Stars'), value: f.rating, onChange: (v) => set('rating', v), options: RATINGS },
        ]}
        onClear={clear} />

      {loading && !data ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[#0e0e0f] rounded-lg animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <Empty>{f.q || f.type || f.status || f.rating ? tl('No reviews match.') : tl('No reviews yet.')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={`${r.type}-${r.id}`} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap text-[12px]">
                  <span className="text-amber-300" aria-label={tl('{0} out of 5 stars', { 0: r.rating })}>
                    {'★'.repeat(r.rating)}<span className="text-[#2a2a2e]">{'★'.repeat(5 - r.rating)}</span></span>
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{r.type === 'course' ? tl('Course') : tl('Coach')}</span>
                  <span className="text-on-surface font-bold truncate">{r.about}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${TONE[r.status]}`}>
                    {STATUS.find((s) => s.value === r.status)?.label}</span>
                </div>
                {r.comment ? <p className="text-[13px] text-on-surface break-words whitespace-pre-line">{r.comment}</p>
                  : <p className="text-[12px] text-on-surface-variant">{tl('No comment — stars only.')}</p>}
                <div className="text-[11px] text-on-surface-variant">
                  {r.member.name} · {r.member.email} · {new Date(r.created_at).toLocaleDateString(locale)}
                </div>
              </div>
              <button type="button" disabled={busy === r.id} onClick={() => remove(r)}
                className="self-start inline-flex items-center gap-1 px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40">
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">delete</span>{tl('Delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} onPage={(n) => set('page', n)} />
    </div>
  );
}
