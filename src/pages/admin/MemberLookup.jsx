// src/pages/admin/MemberLookup.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';
import { formatDate, formatRemaining } from '../../utils/membershipTime';
import { errorMessage } from '../../utils/apiError';
import QrScanner from '../../components/QrScanner';
import { tl } from '../../i18n';

const PASS_PREFIX = 'SGPASS:';

const fmtDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function MemberLookup() {
  const [iqama, setIqama] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [scanning, setScanning] = useState(false);
  const [idCheck, setIdCheck] = useState({ iqama: false, photo: false });   // first visit: both ticked at the desk

  // Tick every second while a session is running
  useEffect(() => {
    if (!result?.active_check_in) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [result?.active_check_in]);

  // Accepts a typed Iqama number or a scanned digital pass (camera or a USB
  // scanner typing into the box).
  const lookup = async (e, value) => {
    e?.preventDefault();
    const q = (value ?? iqama).trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setError('');
    setIdCheck({ iqama: false, photo: false });
    try {
      const res = q.startsWith(PASS_PREFIX)
        ? await adminService.lookupMemberByPass(q)
        : await adminService.lookupMember(q);
      setResult(res);
      if (!res.found) {
        setError(
          res.reason === 'registration_pending'
            ? tl('This Iqama has a registration waiting for approval.')
            : tl('Member not found.')
        );
      }
    } catch (err) {
      const body = err?.response?.data;
      setError(body?.reason === 'not_found' ? tl('Member not found.')
        : body?.reason === 'registration_pending' ? tl('This Iqama has a registration waiting for approval.')
          : errorMessage(err, tl("Lookup failed")));
    } finally {
      setLoading(false);
    }
  };

  // ?iqama=… (from the header search) looks the member up straight away.
  const [params] = useSearchParams();
  const linkedIqama = params.get('iqama');
  useEffect(() => {
    if (!linkedIqama) return undefined;
    const id = setTimeout(() => { setIqama(linkedIqama); lookup(null, linkedIqama); }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per linked Iqama
  }, [linkedIqama]);

  const startTimer = async () => {
    if (!result?.member) return;
    setBusy(true);
    try {
      // Desk check-in: no face comparison happens here (the gate script does that). On a first visit the
      // desk has just checked the Iqama card and face, and says so.
      const first = result.membership?.needs_first_visit_check;
      const ci = await adminService.checkInMember(result.member.id, first ? { id_checked: true } : {});
      toast.success(first ? tl('ID checked — welcome to their first session') : tl("Session started"));
      setResult({ ...result, active_check_in: ci,
        membership: first ? { ...result.membership, needs_first_visit_check: false } : result.membership });
    } catch (err) {
      toast.error(errorMessage(err, tl('Check-in failed')));
    } finally {
      setBusy(false);
    }
  };

  const endTimer = async () => {
    if (!result?.active_check_in) return;
    setBusy(true);
    try {
      const ci = await adminService.checkOut(result.active_check_in.id);
      toast.success(tl("Session ended — {0} min", { 0: ci.duration_minutes }));
      setResult({ ...result, active_check_in: null });
    } catch (err) {
      toast.error(errorMessage(err, tl('Check-out failed')));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setIqama('');
    setResult(null);
    setError('');
  };

  // Live session elapsed
  const sessionElapsed = (() => {
    if (!result?.active_check_in) return null;
    const start = new Date(result.active_check_in.check_in_time).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  })();

  return (
    <div className="p-8 bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-headline-lg text-[28px] text-on-surface uppercase tracking-wider mb-1">
          {tl("Member Lookup")}
        </h1>
        <p className="font-body-sm text-on-surface-variant text-[13px]">
          {tl("Scan the member's digital pass QR (or type their Iqama number) to verify the membership and start their session timer.")}
        </p>
      </motion.div>

      <QrScanner
        open={scanning}
        title={tl("Scan member pass")}
        manualLabel={tl("Or type the Iqama number")}
        onResult={(code) => { setScanning(false); setIqama(code.startsWith(PASS_PREFIX) ? '' : code); lookup(null, code); }}
        onClose={() => setScanning(false)}
      />

      {/* Search box */}
      <form onSubmit={lookup} className="flex gap-2 mb-6 max-w-2xl">
        <input
          value={iqama}
          onChange={(e) => {
            const v = e.target.value;
            // Pass tokens (from a USB scanner) are kept as typed; Iqama numbers are digits only.
            setIqama(/^s/i.test(v) ? v.trim().slice(0, 400) : v.replace(/\D/g, '').slice(0, 10));
          }}
          placeholder={tl("Iqama 2XXXXXXXXX or scan pass")}
          aria-label={tl("Iqama number or pass")}
          className="flex-1 bg-[#131316] border border-[#1a1a1e] rounded px-4 py-3 text-[16px] font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary-container outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded bg-primary-container hover:opacity-90 disabled:opacity-40 text-on-primary-container text-[12px] font-bold uppercase tracking-wider"
        >
          {loading ? tl("Searching…") : tl("Lookup")}
        </button>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="px-4 py-3 rounded bg-[#131316] hover:bg-[#1a1a1e] text-on-surface text-[12px] font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>{' '}{tl("Scan pass")}
        </button>
        {result && (
          <button
            type="button"
            onClick={reset}
            className="px-4 py-3 rounded bg-[#131316] hover:bg-[#1a1a1e] text-on-surface-variant text-[12px] font-bold uppercase tracking-wider"
          >
            {tl("Clear")}
          </button>
        )}
      </form>

      {error && (
        <div className="max-w-2xl mb-6 p-4 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[13px]">
          {error}
        </div>
      )}

      {result?.found && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6"
        >
          {/* Photo card */}
          <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-5 flex flex-col items-center">
            <div className="w-40 h-40 rounded-lg overflow-hidden bg-[#1a1a1e] flex items-center justify-center mb-4">
              {result.registration_photo_url ? (
                <img
                  src={result.registration_photo_url}
                  alt={result.member.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[11px] text-on-surface-variant text-center px-2">
                  {tl("No registration photo")}
                </span>
              )}
            </div>

            <div className="text-center mb-3">
              <div className="text-[16px] font-bold text-on-surface">
                {result.member.full_name}
              </div>
              <div className="text-[11px] text-on-surface-variant">
                {result.member.email}
              </div>
            </div>

            <div
              className={`w-full text-center py-2 rounded font-bold text-[12px] uppercase tracking-widest ${
                result.is_valid
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {result.is_valid ? tl("✓ Valid") : tl("✗ Not Valid")}
            </div>

          </div>

          {/* Details */}
          <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Stat label={tl("Plan")} value={result.membership?.plan?.display_name} />
              <Stat
                label={tl("Time Remaining")}
                value={formatRemaining(result.membership?.time_remaining)}
                accent={
                  result.membership?.time_remaining?.expired
                    ? 'text-rose-400'
                    : result.membership?.days_remaining <= 5 ? 'text-amber-400' : ''
                }
              />
              <Stat label={tl("Started (approved)")} value={formatDate(result.membership?.start_date)} />
              <Stat label={tl("Status")} value={result.membership?.status} />
              <Stat label={tl("Pass ID")} value={result.membership?.pass_id} mono />
              <Stat
                label={tl("Iqama")}
                value={result.membership?.iqama_number}
                mono
              />
              <Stat
                label={tl("Expires")}
                value={formatDate(result.membership?.expiry_date)}
              />
            </div>

            {/* Paid facility add-ons (pool, courts, ...) */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mr-1">{tl("Facilities")}</span>
              {result.facilities?.length ? result.facilities.map((f) => (
                <span key={f.name} className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">
                  {f.name}{' '}{tl("· until")}{' '}{formatDate(f.expires_on)}
                </span>
              )) : <span className="text-[12px] text-on-surface-variant">{tl("None — gym floor only")}</span>}
            </div>
            {/* Session timer */}
            <div className="border-t border-[#1a1a1e] pt-6">
              {result.active_check_in ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
                      {tl("Session Active")}
                    </span>
                  </div>
                  <div className="text-[48px] font-mono text-on-surface leading-none mb-5">
                    {fmtDuration(sessionElapsed)}
                  </div>
                  <button
                    onClick={endTimer}
                    disabled={busy}
                    className="px-6 py-3 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-[12px] font-bold uppercase tracking-wider"
                  >
                    {tl("End Timer")}
                  </button>
                </>
              ) : (
                <>
                  {result.membership?.needs_first_visit_check && (
                    <div className="mb-5 p-4 rounded border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-amber-300 text-[12px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">badge</span>{tl('First visit — check their ID')}
                      </div>
                      <label className="flex items-center gap-2 text-[13px] text-on-surface">
                        <input type="checkbox" checked={idCheck.iqama} onChange={(e) => setIdCheck((c) => ({ ...c, iqama: e.target.checked }))} />
                        {tl('Iqama card seen — the number matches {0}', { 0: result.membership?.iqama_number || '—' })}
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-on-surface">
                        <input type="checkbox" checked={idCheck.photo} onChange={(e) => setIdCheck((c) => ({ ...c, photo: e.target.checked }))} />
                        {tl('Their face matches the signup photo')}
                      </label>
                    </div>
                  )}
                  <div className="text-[13px] text-on-surface-variant mb-4">
                    {tl("No active session. Click below to start the timer.")}
                  </div>
                  <button
                    onClick={startTimer}
                    disabled={busy || !result.is_valid || (result.membership?.needs_first_visit_check && !(idCheck.iqama && idCheck.photo))}
                    className="px-6 py-3 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[12px] font-bold uppercase tracking-wider"
                  >
                    {tl("▶ Start Timer")}
                  </button>
                  {!result.is_valid && (
                    <span className="ml-3 text-[11px] text-rose-400">
                      {tl("Membership not valid")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = '', mono = false }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
        {label}
      </div>
      <div
        className={`text-[15px] font-bold text-on-surface ${accent} ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value || '—'}
      </div>
    </div>
  );
}