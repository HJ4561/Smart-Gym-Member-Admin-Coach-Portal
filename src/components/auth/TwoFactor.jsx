// src/components/auth/TwoFactor.jsx
// 2-step verification pieces shared by every sign-in page and the security settings:
//  · TwoFactorStep  — after the password: enter the code, or (staff without 2FA yet) set it up.
//  · MethodSetup    — choose authenticator app (QR) or email code, then confirm the first code.
//  · BackupCodes    — the one-time codes, shown once after 2FA is turned on.
import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../../services/authService';
import { fieldErrors, errorMessage } from '../../utils/apiError';
import { tl } from '../../i18n';

const box = 'rounded-xl border border-surface-container-high bg-surface-container-low';
const input = 'w-full bg-surface-container-lowest text-on-surface py-3 px-4 rounded-lg border border-surface-container-high '
  + 'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/40';
const primary = 'w-full inline-flex items-center justify-center gap-2 bg-primary-container hover:bg-secondary-container '
  + 'text-on-primary-container font-bold uppercase tracking-widest text-[13px] py-3 rounded-lg disabled:opacity-60';
const link = 'text-primary text-[12px] font-bold hover:underline disabled:opacity-50 disabled:no-underline';

/** 6-digit code box (or a backup code when `backup`). */
export function CodeInput({ value, onChange, error, backup = false, autoFocus = true, id = 'tfa-code' }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, backup]);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] uppercase tracking-wider text-on-surface-variant">
        {backup ? tl('Backup code') : tl('6-digit code')}
      </label>
      <input
        ref={ref} id={id} value={value} autoComplete="one-time-code"
        inputMode={backup ? 'text' : 'numeric'} maxLength={backup ? 9 : 6}
        placeholder={backup ? 'abcd-efgh' : '123456'}
        onChange={(e) => onChange(backup ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
          : e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
        className={`${input} text-center font-mono text-[22px] tracking-[0.4em] ${error ? 'border-error' : ''}`}
      />
      {error && <span id={`${id}-err`} role="alert" className="text-[12px] text-error">{error}</span>}
    </div>
  );
}

/** The one-time backup codes, with copy / download and an "I saved them" check. */
export function BackupCodes({ codes, onContinue, continueLabel = tl('Continue') }) {
  const [saved, setSaved] = useState(false);
  const text = codes.join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(text); } catch { /* blocked */ } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Smart Gym backup codes\n\n${text}\n`], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'smart-gym-backup-codes.txt' });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-on-surface font-bold text-[18px]">{tl('Save your backup codes')}</h2>
        <p className="text-on-surface-variant text-[13px] mt-1">
          {tl('If you lose your phone or can’t get the email, each code below signs you in once. They won’t be shown again.')}
        </p>
      </div>
      <ol className={`${box} grid grid-cols-2 gap-2 p-4 font-mono text-[15px] text-on-surface`} aria-label={tl('Backup codes')}>
        {codes.map((c) => <li key={c} className="text-center">{c}</li>)}
      </ol>
      <div className="flex gap-3">
        <button type="button" className={link} onClick={copy}>{tl('Copy')}</button>
        <button type="button" className={link} onClick={download}>{tl('Download .txt')}</button>
      </div>
      <label className="flex items-start gap-2 text-[13px] text-on-surface">
        <input type="checkbox" className="mt-1" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {tl('I saved these codes somewhere safe')}
      </label>
      <button type="button" className={primary} disabled={!saved} onClick={onContinue}>{continueLabel}</button>
    </div>
  );
}

/**
 * Choose a method and confirm the first code.
 * @param {function} start   (method) => Promise<{method, secret?, otpauth_uri?, email_hint?, detail}>
 * @param {function} confirm (code) => Promise<data with backup_codes>
 * @param {function} resend  () => Promise
 * @param {function} onDone  (data) — after the backup codes were saved
 */
export function MethodSetup({ emailAvailable = true, emailHint = '', start, confirm, resend, onDone, onExpired }) {
  const [method, setMethod] = useState(null);
  const [info, setInfo] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const choose = async (m) => {
    setBusy(true);
    setError('');
    try {
      setInfo(await start(m));
      setMethod(m);
      setCode('');
    } catch (err) {
      if (err?.response?.status === 401) onExpired?.(errorMessage(err));
      else setError(fieldErrors(err).method || fieldErrors(err).password || errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { setError(tl('Enter the 6-digit code.')); return; }
    setBusy(true);
    setError('');
    try {
      setResult(await confirm(code));
    } catch (err) {
      if (err?.response?.status === 401) onExpired?.(errorMessage(err));
      else setError(fieldErrors(err).code || errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <BackupCodes codes={result.backup_codes || []} onContinue={() => onDone(result)} />;

  if (!method) {
    return (
      <div className="flex flex-col gap-3" role="radiogroup" aria-label={tl('Choose how to get codes')}>
        <MethodCard icon="phone_iphone" title={tl('Authenticator app')} recommended
          text={tl('Google Authenticator, Microsoft Authenticator, 1Password… Works without signal or email.')}
          onClick={() => choose('totp')} disabled={busy} />
        <MethodCard icon="mail" title={tl('Code by email')}
          text={emailAvailable ? tl('We email a code to {0} each time you sign in.', { 0: emailHint })
            : tl('Not available — email isn’t set up on the server yet.')}
          onClick={() => choose('email')} disabled={busy || !emailAvailable} />
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {method === 'totp' ? (
        <>
          <p className="text-[13px] text-on-surface-variant">{tl('1. Open your authenticator app and scan this QR code.')}</p>
          <div className="self-center bg-white p-3 rounded-xl">
            <QRCodeSVG value={info.otpauth_uri} size={176} level="M" />
          </div>
          <details className="text-[12px] text-on-surface-variant">
            <summary className="cursor-pointer">{tl('Can’t scan? Type this key instead')}</summary>
            <code className="block mt-2 break-all font-mono text-on-surface select-all">{info.secret}</code>
          </details>
          <p className="text-[13px] text-on-surface-variant">{tl('2. Enter the 6-digit code the app shows.')}</p>
        </>
      ) : (
        <p className="text-[13px] text-on-surface-variant">{tl('We emailed a 6-digit code to {0}.', { 0: info.email_hint || emailHint })}</p>
      )}
      <CodeInput value={code} onChange={setCode} error={error} />
      <button type="submit" className={primary} disabled={busy}>{busy ? tl('Checking…') : tl('Turn on 2-step verification')}</button>
      <div className="flex justify-between">
        <button type="button" className={link} onClick={() => { setMethod(null); setError(''); }}>{tl('Use another method')}</button>
        {method === 'email' && <ResendButton onResend={resend} onError={setError} />}
      </div>
    </form>
  );
}

function MethodCard({ icon, title, text, onClick, disabled, recommended }) {
  return (
    <button type="button" role="radio" aria-checked="false" onClick={onClick} disabled={disabled}
      className={`${box} text-start p-4 flex items-start gap-3 hover:border-primary disabled:opacity-50 disabled:hover:border-surface-container-high`}>
      <span className="material-symbols-outlined text-primary text-[26px]" aria-hidden="true">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-on-surface font-bold">
          {title}
          {recommended && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-container/20 text-primary">{tl('Recommended')}</span>}
        </span>
        <span className="block text-[12px] text-on-surface-variant mt-0.5">{text}</span>
      </span>
    </button>
  );
}

function ResendButton({ onResend, onError }) {
  const [wait, setWait] = useState(30);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const resend = async () => {
    try {
      await onResend();
      setWait(30);
    } catch (err) {
      onError(errorMessage(err));
    }
  };
  return (
    <button type="button" className={link} disabled={wait > 0} onClick={resend}>
      {wait > 0 ? tl('Resend code in {0}s', { 0: wait }) : tl('Resend code')}
    </button>
  );
}

/**
 * The second step at sign-in. `step` is the login answer ({two_factor: 'verify'|'setup', ticket, …}).
 * @param {function} onDone  ({access, refresh, user})
 * @param {function} onRestart (message) — the ticket expired: back to email + password
 */
/** "Trust this device for 30 days" — after the code passes, this browser isn't asked again for 30 days. */
function TrustDevice({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-[13px] text-on-surface">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{tl('Trust this device for 30 days')}
        <span className="block text-[11px] text-on-surface-variant">{tl('Don’t tick this on a shared or public computer.')}</span>
      </span>
    </label>
  );
}

export function TwoFactorStep({ step, onDone, onRestart }) {
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const expired = (msg) => onRestart?.(msg || tl('This sign-in step expired. Sign in again.'));

  if (step.two_factor === 'setup') {
    return (
      <div className="flex flex-col gap-4">
        <Heading icon="shield_lock" title={tl('Set up 2-step verification')}
          text={tl('Your account needs a second step at sign-in. Choose how you want to get your codes — you only do this once.')} />
        <MethodSetup
          emailAvailable={step.email_available} emailHint={step.email_hint}
          start={(m) => authService.setupMethod(step.ticket, m)}
          confirm={(c) => authService.setupConfirm(step.ticket, c, remember)}
          resend={() => authService.resendCode(step.ticket)}
          onDone={onDone} onExpired={expired}
        />
        <TrustDevice checked={remember} onChange={setRemember} />
        <button type="button" className={`${link} self-start`} onClick={() => onRestart?.('')}>{tl('← Back to sign in')}</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const clean = code.replace('-', '');
    if (backup ? clean.length !== 8 : code.length !== 6) {
      setError(backup ? tl('Backup codes have 8 letters and numbers.') : tl('Enter the 6-digit code.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(await authService.verifyCode(step.ticket, code, remember));
    } catch (err) {
      if (err?.response?.status === 401) expired(errorMessage(err));
      else setError(fieldErrors(err).code || errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Heading icon={step.method === 'email' ? 'mark_email_unread' : 'phone_iphone'} title={tl('2-step verification')}
        text={backup ? tl('Enter one of your backup codes. Each works once.')
          : step.method === 'email' ? tl('We emailed a 6-digit code to {0}.', { 0: step.email_hint })
            : tl('Enter the 6-digit code from your authenticator app.')} />
      <CodeInput value={code} onChange={setCode} error={error} backup={backup} />
      <TrustDevice checked={remember} onChange={setRemember} />
      <button type="submit" className={primary} disabled={busy}>{busy ? tl('Checking…') : tl('Verify and sign in')}</button>
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={link} onClick={() => { setBackup((b) => !b); setCode(''); setError(''); }}>
          {backup ? tl('Use my code instead') : tl('Use a backup code')}
        </button>
        {step.method === 'email' && !backup && (
          <ResendButton onResend={() => authService.resendCode(step.ticket)} onError={setError} />
        )}
      </div>
      <button type="button" className={`${link} self-start`} onClick={() => onRestart?.('')}>{tl('← Back to sign in')}</button>
    </form>
  );
}

function Heading({ icon, title, text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-10 h-10 rounded-lg bg-primary-container/15 text-primary grid place-items-center shrink-0">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
      </span>
      <div className="min-w-0">
        <h2 className="text-on-surface font-bold text-[18px] leading-tight">{title}</h2>
        <p className="text-on-surface-variant text-[13px] mt-1">{text}</p>
      </div>
    </div>
  );
}
