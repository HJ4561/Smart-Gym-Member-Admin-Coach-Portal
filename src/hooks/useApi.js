// src/hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

const FOCUS_MIN_GAP_MS = 5_000;   // don't refetch on every quick tab switch

/**
 * useApi — a simple data-fetching hook with loading/error/refetch.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(
 *     () => nutritionService.nutritionists(),
 *     [],
 *     { poll: 30_000 }          // optional: refresh every 30 s while the tab is visible
 *   );
 *
 * Data also refreshes quietly when the tab or window becomes active again, so changes made
 * elsewhere (another staff member, the member app, the public website) show up without a reload.
 * `refetch()` keeps the current data on screen while it reloads (no skeleton flash).
 */
export function useApi(fetcher, deps = [], options = {}) {
  const {
    immediate = true,
    showError = true,
    initialData = null,
    poll = 0,
    refreshOnFocus = true,
    refreshOn = [],          // window events that mean "this data changed" (e.g. NOTIFICATIONS_CHANGED)
  } = options;
  const refreshEvents = refreshOn.join('|');

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const lastFetch = useRef(0);
  const hasData = useRef(initialData != null);

  const run = useCallback(async (quiet = false) => {
    lastFetch.current = Date.now();
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcher();
      setData(result);
      hasData.current = result != null;
      if (quiet) setError(null);
      return result;
    } catch (e) {
      if (quiet) return null;          // background refresh: keep what's on screen
      // Ignore 404s for optional endpoints (no plan, no DEXA)
      const status = e?.response?.status;
      const silent = !showError || status === 404;

      if (!silent) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          'Failed to fetch data';
        toast.error(msg);
      }

      setError(e);
      return null; // don't throw — prevents unhandled rejections
    } finally {
      if (!quiet) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/use-memo

  useEffect(() => {
    if (immediate) {
      run(false);
    }
  }, [run, immediate]);

  // Quiet refresh when the page becomes visible again, and on an interval if asked.
  useEffect(() => {
    if (!immediate) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current > FOCUS_MIN_GAP_MS) run(true);
    };
    if (refreshOnFocus) {
      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', refresh);
    }
    const id = poll > 0 ? setInterval(refresh, poll) : null;
    const now = () => run(true);
    const events = refreshEvents ? refreshEvents.split('|') : [];
    events.forEach((e) => window.addEventListener(e, now));
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      events.forEach((e) => window.removeEventListener(e, now));
      if (id) clearInterval(id);
    };
  }, [run, immediate, poll, refreshOnFocus, refreshEvents]);

  /** Reload now; shows the loading state only when there's nothing on screen yet. */
  const refetch = useCallback(() => run(hasData.current), [run]);

  return { data, loading, error, refetch, setData };
}

export default useApi;
