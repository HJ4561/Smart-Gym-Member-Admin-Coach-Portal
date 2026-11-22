// src/hooks/useListState.js
// Filters + page for a list page in one state, so changing a filter goes back to page 1 in the same
// update (no effect needed), and a search box that settles before it's sent.
import { useCallback, useEffect, useState } from 'react';

/** const [f, setF, clear] = useListState({ q: '', role: '' }); setF('role', 'trainer') → page 1. */
export function useListState(initial) {
  const [state, setState] = useState(() => ({ page: 1, ...initial }));
  const set = useCallback((key, value) => setState((p) => ({ ...p, [key]: value, ...(key === 'page' ? {} : { page: 1 }) })), []);
  const clear = useCallback(() => setState({ page: 1, ...initial }), []);   // eslint-disable-line react-hooks/exhaustive-deps
  return [state, set, clear];
}

/** Text that settles after the person stops typing (search boxes call the API with this). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Rows filtered in the browser (for lists the API returns whole): text match on the given fields. */
export function matches(row, q, fields) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => String(typeof f === 'function' ? f(row) : row?.[f] ?? '').toLowerCase().includes(needle));
}
