// src/hooks/useHighlight.js
// "Needs attention" links open a page with ?highlight=1,2,3 — the records the alert is about.
// The page outlines those rows (HIGHLIGHT_ROW + data-highlight) and shows <HighlightBar> to clear it.
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const HIGHLIGHT_ROW = 'outline outline-2 -outline-offset-2 outline-primary-container bg-primary-container/10';

export function useHighlight() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('highlight') || '';
  const ids = useMemo(() => new Set(raw.split(',').filter((v) => /^\d+$/.test(v))), [raw]);
  const clear = () => {
    const next = new URLSearchParams(params);
    next.delete('highlight');
    setParams(next, { replace: true });
  };
  return { ids, raw: [...ids].join(','), count: ids.size, has: (id) => ids.has(String(id)), clear };
}
