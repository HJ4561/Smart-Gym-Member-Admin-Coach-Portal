import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { attendanceService } from '../../services/attendanceService';
import { useApi } from '../../hooks/useApi';
import { tl } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

export default function CheckInLedger() {
  const [page, setPage] = useState(1);
  const perPage = 5;

  const { data, loading } = useApi(
    () => attendanceService.ledger({ page, per_page: perPage }),
    [page]
  );

  const rows = Array.isArray(data?.results) ? data.results : [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total || 0;

  const handleExport = async () => {
    try {
      const blob = await attendanceService.exportLedger();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_ledger.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(tl("Ledger exported"));
    } catch {
      toast.error(tl("Export failed"));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex flex-col gap-space-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
        <div>
          <span className="font-label-md text-label-md uppercase text-primary tracking-widest font-bold">
            {tl("History")}
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase">
            {tl("Visit log")}
          </h2>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={handleExport}
            className="flex items-center gap-space-2xs px-space-sm py-space-xs rounded bg-surface-container-high text-on-surface font-label-md uppercase hover:bg-surface-bright"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>{tl("Export CSV")}</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg bg-surface-container shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant font-label-md uppercase">
              {['Date & Status', 'Entry', 'Exit', 'Duration', 'Zone', 'Logged that day'].map((h, i) => (
                <th key={h} className={`py-space-sm px-space-md ${i === 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-highest/20">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-space-xl">
                  <span className="text-on-surface-variant">{tl("Loading...")}</span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-space-xl">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 block mb-2">event_busy</span>
                  <span className="text-on-surface-variant">{tl("No check-ins yet")}</span>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-high/60 transition-colors">
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className={`w-2 h-2 rounded-full bg-primary-container ${row.statusType === 'active' ? 'animate-ping' : ''}`} />
                      <span className="font-title-md text-title-md text-on-surface">{row.date}</span>
                      <span className={`px-space-2xs py-0.5 rounded font-label-md text-label-md uppercase font-bold ${
                        row.statusType === 'active'
                          ? 'bg-primary-container/20 text-primary'
                          : row.statusType === 'tier'
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {tl(row.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md font-mono text-on-surface-variant">{row.entry}</td>
                  <td className={`py-space-md px-space-md font-mono ${row.exitActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                    {row.exit}
                  </td>
                  <td className="py-space-md px-space-md">
                    <span className={`font-title-md text-title-md ${row.durationActive ? 'text-primary' : 'text-on-surface'}`}>
                      {row.duration}
                    </span>
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-wrap gap-1">
                      {row.zones.map((z) => (
                        <span key={z} className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-md text-label-md uppercase">
                          {z}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-space-md px-space-md text-right">
                    <span className="font-title-md text-title-md text-on-surface">{row.reps}</span>
                    <span className="text-on-surface-variant font-label-md text-label-md block">{row.volume}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-md text-label-md">
        <span>{tl("Showing")}{' '}{rows.length} of {total}{' '}{tl("Visits")}</span>
        <div className="flex items-center gap-space-xs">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-space-sm py-1 rounded bg-surface-container-high text-on-surface disabled:opacity-40"
            type="button"
          >
            {tl("Previous")}
          </button>
          <span className="px-space-xs text-on-surface">{tl("Page")}{' '}{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-space-sm py-1 rounded bg-surface-container-high text-on-surface disabled:opacity-40"
            type="button"
          >
            {tl("Next")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}