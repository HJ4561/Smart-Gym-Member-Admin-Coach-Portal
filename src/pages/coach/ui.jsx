// src/pages/coach/ui.jsx — small building blocks shared by the coach portal pages.

// How often coach pages re-check the server, so changes made in the admin console (publishing a
// course, verifying, roster changes, new bookings) show up without reloading the page.
export const LIVE_MS = 15_000;
export const card = 'bg-[#0e0e0f] border border-[#1a1a1e] rounded-xl';

export function Page({ children }) {
  return <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">{children}</div>;
}

export function Tile({ label, value, icon, tone = '' }) {
  return (
    <div className={`${card} px-4 py-3 flex items-center gap-3 min-w-0`}>
      {icon && <span className={`material-symbols-outlined text-[22px] ${tone || 'text-primary'}`} aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        <div className="text-[18px] sm:text-[20px] font-bold text-on-surface leading-tight break-words">{value ?? '—'}</div>
        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</div>
      </div>
    </div>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`${card} p-4 sm:p-5 flex flex-col gap-3 min-w-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-on-surface font-bold uppercase tracking-wider text-[13px]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ rows = 3, h = 'h-16' }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`${h} bg-[#0e0e0f] rounded-lg animate-pulse`} />)}
    </div>
  );
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="flex gap-1 bg-[#0e0e0f] border border-[#1a1a1e] p-1 rounded-lg w-fit max-w-full overflow-x-auto" role="tablist">
      {options.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`px-3 sm:px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
            value === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ tone, children }) {
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${tone}`}>{children}</span>;
}
