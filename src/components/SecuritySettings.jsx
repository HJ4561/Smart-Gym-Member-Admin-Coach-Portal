// src/components/SecuritySettings.jsx
// 2-step verification while signed in: turn it on (app or email), switch method, new backup
// codes, and turn it off. Optional for everyone unless an admin makes it required for staff
// (Admin → Settings → Sign-in security); then staff and coaches must keep it on.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useApi } from '../hooks/useApi';
import { BackupCodes, CodeInput, MethodSetup } from './auth/TwoFactor';
import { errorMessage, fieldErrors } from '../utils/apiError';
import { tl, locale } from '../i18n';

const card = 'rounded-xl border border-surface-container-high bg-surface-container p-5 flex flex-col gap-4';
const input = 'w-full bg-surface-container-lowest text-on-surface py-2.5 px-3 rounded-lg border border-surface-container-high '
  + 'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';
const btn = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider disabled:opacity-50';
const primary = `${btn} bg-primary-container text-on-primary-container hover:bg-secondary-container`;
const ghost = `${btn} bg-surface-container-high text-on-surface hover:bg-surface-container-highest`;
const danger = `${btn} bg-error/15 text-error hover:bg-error/25`;
const METHOD = { totp: tl('Authenticator app'), email: tl('Code by email') };

export default function SecuritySettings() {
  const { data: status, refetch: load } = useApi(() => authService.twoFactorStatus(), []);
  const [mode, setMode] = useState(null);         // null | 'enable' | 'codes' | 'off'

  if (!status) return <div className={`${card} h-40 animate-pulse`} />;
  const close = () => { setMode(null); load(); };

  return (
    <section className={card} aria-labelledby="tfa-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="tfa-title" className="text-on-surface font-bold text-[16px] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">shield_lock</span>
            {tl('2-step verification')}
          </h2>
          <p className="text-[13px] text-on-surface-variant mt-1">
            {tl('After your password, you also enter a code from your phone or email — so a stolen password alone can’t open your account.')}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${status.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
          {status.enabled ? tl('On') : tl('Off')}
        </span>
      </div>

      {status.enabled && !mode && (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
          <div><dt className="text-on-surface-variant text-[11px] uppercase tracking-wider">{tl('Method')}</dt><dd className="text-on-surface">{METHOD[status.method]}</dd></div>
          <div><dt className="text-on-surface-variant text-[11px] uppercase tracking-wider">{tl('Backup codes left')}</dt>
            <dd className={status.backup_codes_left <= 2 ? 'text-amber-400 font-bold' : 'text-on-surface'}>{status.backup_codes_left}</dd></div>
          <div><dt className="text-on-surface-variant text-[11px] uppercase tracking-wider">{tl('Turned on')}</dt>
            <dd className="text-on-surface">{status.confirmed_at ? new Date(status.confirmed_at).toLocaleDateString(locale) : '—'}</dd></div>
        </dl>
      )}
      {!status.gym_enabled && (
        <p className="text-[12px] text-amber-400">{tl('An admin has switched 2-step verification off for the whole gym, so right now you sign in with your password only. Your setup is kept for when it’s switched back on.')}</p>
      )}
      {status.enabled && !mode && <TrustedDevices devices={status.trusted_devices || []} onChange={load} />}
      {status.required && !status.enabled && (
        <p className="text-[12px] text-amber-400">{tl('Your role needs 2-step verification — you’ll be asked to set it up at your next sign-in.')}</p>
      )}

      {!mode && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={status.enabled ? ghost : primary} onClick={() => setMode('enable')}>
            {status.enabled ? tl('Switch method') : tl('Turn on')}
          </button>
          {status.enabled && <button type="button" className={ghost} onClick={() => setMode('codes')}>{tl('New backup codes')}</button>}
          {status.enabled && !status.required && <button type="button" className={danger} onClick={() => setMode('off')}>{tl('Turn off')}</button>}
        </div>
      )}

      {mode === 'enable' && <EnableFlow status={status} onClose={close} />}
      {mode === 'codes' && <CodeConfirm status={status} action="codes" onClose={close} />}
      {mode === 'off' && <CodeConfirm status={status} action="off" onClose={close} />}
    </section>
  );
}

/** Browsers that skip the code for 30 days; each can be forgotten (it asks for a code again). */
function TrustedDevices({ devices, onChange }) {
  const forget = async (id) => {
    try {
      await authService.forgetDevices(id);
      toast.success(id ? tl('That device will ask for a code next time') : tl('All devices will ask for a code next time'));
      onChange();
    } catch (err) { toast.error(errorMessage(err)); }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-on-surface-variant text-[11px] uppercase tracking-wider">{tl('Trusted devices (no code for 30 days)')}</span>
        {devices.length > 1 && <button type="button" className="text-primary text-[12px] font-bold hover:underline" onClick={() => forget()}>{tl('Forget all')}</button>}
      </div>
      {devices.length === 0 ? (
        <p className="text-[12px] text-on-surface-variant">{tl('None — every sign-in asks for a code.')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-[13px]">
              <span className="text-on-surface">{d.label}</span>
              <span className="text-[11px] text-on-surface-variant">
                {tl('Trusted until {0}', { 0: new Date(d.expires_at).toLocaleDateString(locale) })}
              </span>
              <button type="button" className="text-error text-[12px] font-bold hover:underline" onClick={() => forget(d.id)}>{tl('Forget')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Password first, then the same method chooser as at sign-in. */
function EnableFlow({ status, onClose }) {
  const [password, setPassword] = useState('');
  const [ok, setOk] = useState(false);
  const [ticket, setTicket] = useState(null);
  return (
    <div className="flex flex-col gap-3 border-t border-surface-container-high pt-4">
      {!ok ? (
        <form className="flex flex-col gap-3 max-w-sm" onSubmit={(e) => { e.preventDefault(); if (password) setOk(true); }}>
          <label className="text-[12px] text-on-surface-variant" htmlFor="tfa-pw">{tl('Confirm your password to continue')}</label>
          <input id="tfa-pw" type="password" autoComplete="current-password" className={input} value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className={primary} disabled={!password}>{tl('Continue')}</button>
            <button type="button" className={ghost} onClick={onClose}>{tl('Cancel')}</button>
          </div>
        </form>
      ) : (
        <div className="max-w-md">
          <MethodSetup
            emailAvailable={status.email_available} emailHint={status.email_hint}
            start={async (m) => {
              try {
                const r = await authService.enableStart(password, m);
                setTicket(r.ticket);
                return r;
              } catch (err) {
                if (fieldErrors(err).password) { setOk(false); toast.error(fieldErrors(err).password); }
                throw err;
              }
            }}
            confirm={(c) => authService.enableConfirm(ticket, c)}
            resend={() => authService.resendCode(ticket)}
            onDone={() => { toast.success(tl('2-step verification is on')); onClose(); }}
            onExpired={(msg) => { toast.error(msg); onClose(); }}
          />
          <button type="button" className={`${ghost} mt-3`} onClick={onClose}>{tl('Cancel')}</button>
        </div>
      )}
    </div>
  );
}

/** New backup codes, or turning it off: needs the current code (and the password to turn off). */
function CodeConfirm({ status, action, onClose }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState(null);
  const [backup, setBackup] = useState(false);

  const sendCode = async () => {
    try { toast.success((await authService.sendCurrentCode()).detail); } catch (err) { toast.error(errorMessage(err)); }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (action === 'off') {
        await authService.disableTwoFactor(password, code);
        toast.success(tl('2-step verification is off'));
        onClose();
      } else {
        setCodes((await authService.newBackupCodes(code)).backup_codes);
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (codes) return <BackupCodes codes={codes} continueLabel={tl('Done')} onContinue={onClose} />;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 max-w-sm border-t border-surface-container-high pt-4">
      {action === 'off' && (
        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-on-surface-variant" htmlFor="tfa-off-pw">{tl('Password')}</label>
          <input id="tfa-off-pw" type="password" autoComplete="current-password" className={input} value={password}
            onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          {errors.password && <span role="alert" className="text-[12px] text-error">{errors.password}</span>}
        </div>
      )}
      <p className="text-[12px] text-on-surface-variant">
        {status.method === 'email' ? tl('Get a code by email, or use a backup code.') : tl('Enter the code from your authenticator app, or a backup code.')}
      </p>
      {status.method === 'email' && !backup && <button type="button" className={`${ghost} self-start`} onClick={sendCode}>{tl('Email me a code')}</button>}
      <CodeInput id="tfa-current" value={code} onChange={setCode} error={errors.code} backup={backup} autoFocus={false} />
      <button type="button" className="text-primary text-[12px] font-bold self-start hover:underline"
        onClick={() => { setBackup((b) => !b); setCode(''); }}>
        {backup ? tl('Use my code instead') : tl('Use a backup code')}
      </button>
      <div className="flex gap-2">
        <button type="submit" className={action === 'off' ? danger : primary} disabled={busy || !code}>
          {action === 'off' ? tl('Turn off') : tl('Get new codes')}
        </button>
        <button type="button" className={ghost} onClick={onClose}>{tl('Cancel')}</button>
      </div>
    </form>
  );
}
