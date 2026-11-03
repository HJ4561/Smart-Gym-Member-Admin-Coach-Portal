// src/components/admin/HighlightBar.jsx
// The bar above a list opened from "Needs attention": says how many rows are marked, scrolls the
// first one into view once it is on screen, and clears the marking. `noun` = [one, many].
import { useEffect, useRef } from 'react';
import { tl } from '../../i18n';

export default function HighlightBar({ highlight, noun, ready = true }) {
  const scrolled = useRef('');
  useEffect(() => {
    if (!ready || !highlight.count || scrolled.current === highlight.raw) return;
    const row = document.querySelector('[data-highlight="true"]');
    if (row) {
      scrolled.current = highlight.raw;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
  if (!highlight.count) return null;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-2.5 text-[13px] text-on-surface">
      <span className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">priority_high</span>
        {tl('Needs attention: {0} {1} highlighted below.', { 0: highlight.count, 1: highlight.count === 1 ? noun[0] : noun[1] })}
      </span>
      <button type="button" onClick={highlight.clear} className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline shrink-0">
        {tl('Clear')}
      </button>
    </div>
  );
}
