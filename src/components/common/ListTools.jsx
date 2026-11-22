// src/components/common/ListTools.jsx
// The search + filter bar and pager every list page uses (admin, coach, desk, shop and nutritionist
// portals), so lists look and behave the same everywhere.
import { inputCls } from '../site/siteStyles';
import { tl } from '../../i18n';

/**
 * <FilterBar search={q} onSearch={setQ} placeholder="Search…"
 *   filters={[{ key: 'role', label: 'Role', value: role, onChange: setRole, options: [{value, label}] }]}
 *   dates={{ from, to, onFrom, onTo }}  tabs={{ value, onChange, options: [{value, label, count}] }}
 *   onClear={() => …} />
 */
export function FilterBar({ search, onSearch, placeholder, filters = [], dates, tabs, onClear, children }) {
  const active = Boolean(search) || filters.some((f) => f.value) || Boolean(dates?.from || dates?.to);
  return (
    <div className="flex flex-col gap-3">
      {tabs && (
        <div className="flex gap-1 flex-wrap" role="tablist">
          {tabs.options.map((o) => (
            <button key={o.value || 'all'} type="button" role="tab" aria-selected={tabs.value === o.value}
              onClick={() => tabs.onChange(o.value)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                tabs.value === o.value ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
              {o.label}
              {o.count != null && <span className="opacity-70">{o.count}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 flex-wrap">
        {onSearch && (
          <div className="relative lg:w-72">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">search</span>
            <input className={`${inputCls} pl-8`} value={search} onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder || tl('Search…')} aria-label={placeholder || tl('Search')} />
          </div>
        )}
        {filters.map((f) => (
          <select key={f.key} className={`${inputCls} lg:w-48`} value={f.value} onChange={(e) => f.onChange(e.target.value)}
            aria-label={f.label}>
            <option value="">{f.all || tl('All: {0}', { 0: f.label })}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {dates && (
          <div className="flex items-center gap-2">
            <input type="date" className={`${inputCls} lg:w-40`} value={dates.from || ''} onChange={(e) => dates.onFrom(e.target.value)}
              aria-label={tl('From')} />
            <span className="text-on-surface-variant text-[12px]">→</span>
            <input type="date" className={`${inputCls} lg:w-40`} value={dates.to || ''} onChange={(e) => dates.onTo(e.target.value)}
              aria-label={tl('To')} />
          </div>
        )}
        {children}
        {onClear && active && (
          <button type="button" onClick={onClear} className="text-[11px] text-on-surface-variant hover:text-on-surface underline">
            {tl('Clear filters')}
          </button>
        )}
      </div>
    </div>
  );
}

/** « 1 / 4 » with the total; hidden when everything fits on one page. */
export function Pager({ page, pages, count, onPage }) {
  if (!pages || pages <= 1) return count != null ? <div className="text-[11px] text-on-surface-variant">{tl('{0} total', { 0: count })}</div> : null;
  const b = 'px-3 py-1.5 rounded bg-[#131316] text-on-surface-variant hover:text-on-surface disabled:opacity-30 text-[12px]';
  return (
    <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
      <button type="button" className={b} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={tl('Previous page')}>‹</button>
      <span>{tl('Page {0} of {1}', { 0: page, 1: pages })}</span>
      <button type="button" className={b} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={tl('Next page')}>›</button>
      {count != null && <span className="ml-2">{tl('{0} total', { 0: count })}</span>}
    </div>
  );
}
