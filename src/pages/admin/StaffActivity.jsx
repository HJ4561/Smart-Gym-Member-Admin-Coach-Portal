// src/pages/admin/StaffActivity.jsx
// Every change a staff member made (receptionists, coaches, nutritionists, the shop manager, admins):
// who, what, where and when — the admin's check on the team.
import { approvalsService as api } from '../../services/approvalsService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { FilterBar, Pager } from '../../components/common/ListTools';
import { useApi } from '../../hooks/useApi';
import { useDebounced, useListState } from '../../hooks/useListState';
import { locale, tl } from '../../i18n';

const ROLES = [
  ['admin', tl('Admin')], ['manager', tl('Manager')], ['receptionist', tl('Receptionist')], ['shop_manager', tl('Shop manager')],
  ['trainer', tl('Coach')], ['nutritionist', tl('Nutritionist')],
].map(([value, label]) => ({ value, label }));
const METHOD_TONE = { POST: 'text-emerald-400', PATCH: 'text-amber-400', PUT: 'text-amber-400', DELETE: 'text-rose-400' };

export default function StaffActivity() {
  const [f, set, clear] = useListState({ q: '', actor: '', role: '', area: '', from: '', to: '' });
  const search = useDebounced(f.q);
  const { data: raw, loading } = useApi(
    () => api.activity({ q: search || undefined, actor: f.actor || undefined, role: f.role || undefined,
      area: f.area || undefined, from: f.from || undefined, to: f.to || undefined, page: f.page }),
    [search, f.actor, f.role, f.area, f.from, f.to, f.page], { poll: 30_000 });
  const data = raw || { results: [], people: [], areas: [], count: 0, pages: 1 };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <PageHeader title={tl('Staff activity')}
        subtitle={tl('Every change your team makes, newest first: approvals at the desk, check-ins, order updates, uploads and edits.')} />
      <FilterBar search={f.q} onSearch={(v) => set('q', v)} placeholder={tl('Search action, page or person…')}
        filters={[
          { key: 'actor', label: tl('Person'), value: f.actor, onChange: (v) => set('actor', v),
            options: data.people.map((p) => ({ value: String(p.id), label: `${p.name} · ${p.actions}` })) },
          { key: 'role', label: tl('Role'), value: f.role, onChange: (v) => set('role', v), options: ROLES },
          { key: 'area', label: tl('Area'), value: f.area, onChange: (v) => set('area', v), options: data.areas.map((a) => ({ value: a, label: tl(a) })) },
        ]}
        dates={{ from: f.from, to: f.to, onFrom: (v) => set('from', v), onTo: (v) => set('to', v) }}
        onClear={clear} />

      {loading ? (
        <div className="h-64 bg-[#0e0e0f] rounded-lg animate-pulse" />
      ) : data.results.length === 0 ? (
        <Empty>{tl('No activity matches.')}</Empty>
      ) : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="p-3">{tl('When')}</th><th className="p-3">{tl('Who')}</th>
                <th className="p-3">{tl('What')}</th><th className="p-3">{tl('Area')}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((a) => (
                <tr key={a.id} className="border-t border-[#1a1a1e] align-top">
                  <td className="p-3 text-on-surface-variant whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="p-3"><div className="text-on-surface">{a.actor?.name || '—'}</div>
                    <div className="text-[11px] text-on-surface-variant">{tl(a.role)}</div></td>
                  <td className="p-3"><div className="text-on-surface">{tl(a.action)}</div>
                    <div className="text-[11px] text-on-surface-variant font-mono break-all">
                      <span className={METHOD_TONE[a.method] || ''}>{a.method}</span> {a.path.replace(/^\/api/, '')}</div></td>
                  <td className="p-3 text-on-surface-variant">{tl(a.area)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={data.page} pages={data.pages} count={data.count} onPage={(n) => set('page', n)} />
    </div>
  );
}
