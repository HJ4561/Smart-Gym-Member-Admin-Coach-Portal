// src/pages/admin/AdminZatca.jsx
// ZATCA Phase 2 e-invoicing: every paid sale becomes a signed simplified tax invoice with a QR,
// reported to ZATCA automatically; refunds get credit notes. Here the owner sees the device and its
// certificate, edits the seller's legal details, goes live (Sandbox → Simulation → Production) with
// the wizard, and follows every invoice ZATCA has (or hasn't yet) accepted.
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { zatcaService as api } from '../../services/zatcaService';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl, locale } from '../../i18n';

const TABS = [
  ['overview', tl('Overview'), 'dashboard'],
  ['details', tl('Business details'), 'storefront'],
  ['golive', tl('Go live'), 'rocket_launch'],
  ['invoices', tl('Invoices'), 'receipt_long'],
  ['companies', tl('Companies'), 'domain'],
  ['activity', tl('Activity'), 'history'],
];
const STATUS_BADGE = {
  reported: 'bg-emerald-500/15 text-emerald-400', pending: 'bg-amber-500/15 text-amber-300',
  rejected: 'bg-rose-500/15 text-rose-300', cleared: 'bg-emerald-500/15 text-emerald-400',
};
const sar = (v) => `SAR ${Number(v || 0).toFixed(2)}`;
const when = (v) => (v ? new Date(v).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function Card({ title, icon, children, className = '' }) {
  return (
    <section className={`bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-5 flex flex-col gap-3 ${className}`}>
      <h2 className="flex items-center gap-2 text-on-surface font-bold uppercase tracking-wider text-[13px]">
        <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">{icon}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, tone }) {
  const color = { ok: 'text-emerald-400', warn: 'text-amber-300', bad: 'text-rose-400' }[tone] || 'text-on-surface';
  return (
    <div className="flex justify-between gap-4 border-b border-[#1a1a1e] last:border-0 pb-2 last:pb-0 text-[13px]">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={`text-right break-all ${color}`}>{value}</dd>
    </div>
  );
}

function Notice({ tone = 'warn', icon = 'warning', children }) {
  const cls = {
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    bad: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  }[tone];
  return (
    <div role="status" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-[13px] ${cls}`}>
      <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AdminZatca() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  const { data: s, loading, error, refetch, setData } = useApi(() => api.status(), [], { poll: 30_000 });

  if (loading && !s) {
    return <div className="p-6 md:p-8"><div className="h-96 bg-[#0e0e0f] rounded-lg animate-pulse" /></div>;
  }
  if (!s) {
    return (
      <div className="p-6 md:p-8">
        <Empty>
          <div className="flex flex-col items-center gap-3">
            {tl('Could not load ZATCA settings.')}
            {error && <span className="text-[12px] text-rose-300">{errorMessage(error)}</span>}
            <button type="button" className={btn.ghost} onClick={refetch}>{tl('Try again')}</button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <PageHeader title={tl('ZATCA e-invoicing')}
        subtitle={tl('Every paid sale becomes a signed simplified tax invoice with a QR code and is reported to ZATCA automatically. Refunds get a credit note. Locker top-ups are invoiced when the credit is spent.')} />

      {s.test_mode && (
        <Notice tone="info" icon="science">
          <b>{tl('TEST MODE — {0}.', { 0: s.environment_label })}</b>{' '}
          {tl('Invoices are signed and checked by ZATCA but are not legal tax invoices. Receipts print “TEST”.')}
        </Notice>
      )}
      {!s.encryption_key_set && (
        <Notice tone="bad" icon="key_off">
          {tl('ZATCA_ENCRYPTION_KEY is not set on the server, so the device’s key can’t be stored. Add it in Vercel → Settings → Environment Variables and redeploy.')}
        </Notice>
      )}
      {s.summary.late > 0 && (
        <Notice tone="bad" icon="schedule">
          {tl('{0} invoices were not sent to ZATCA within 12 hours. ZATCA expects them within 24 hours.', { 0: s.summary.late })}{' '}
          <button type="button" className="underline font-bold" onClick={() => setTab('invoices')}>{tl('Open the invoices')}</button>
        </Notice>
      )}
      {s.device?.certificate_expiring && (
        <Notice tone="warn" icon="event_busy">
          {tl('The device certificate expires in {0} days. Go live again with a new OTP before then.', { 0: s.device.certificate_days_left })}
        </Notice>
      )}

      <div className="flex gap-1 flex-wrap bg-[#0e0e0f] border border-[#1a1a1e] p-1 rounded-lg w-fit" role="tablist">
        {TABS.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              tab === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>{label}
            {id === 'invoices' && s.summary.rejected + s.summary.late > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center">
                {s.summary.rejected + s.summary.late}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview s={s} isAdmin={isAdmin} onChanged={setData} refetch={refetch} go={setTab} />}
      {tab === 'details' && <Details s={s} isAdmin={isAdmin} onSaved={setData} />}
      {tab === 'golive' && <GoLive s={s} isAdmin={isAdmin} onChanged={setData} />}
      {tab === 'invoices' && <Invoices isAdmin={isAdmin} onChanged={refetch} />}
      {tab === 'companies' && <Companies isAdmin={isAdmin} b2b={s.b2b} />}
      {tab === 'activity' && <Activity />}
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function Overview({ s, isAdmin, onChanged, refetch, go }) {
  const [busy, setBusy] = useState(false);
  const d = s.device;
  const toggle = async () => {
    setBusy(true);
    try {
      onChanged(await api.saveSettings({ enabled: !s.enabled }));
      toast.success(s.enabled ? tl('E-invoicing paused') : tl('E-invoicing on'));
    } catch (err) {
      toast.error(fieldErrors(err).enabled || errorMessage(err));
    } finally { setBusy(false); }
  };
  const retry = async () => {
    setBusy(true);
    try {
      const r = await api.retry();
      toast.success(tl('Sent {0}: {1} reported, {2} still waiting', { 0: r.sent, 1: r.reported, 2: r.waiting }));
      refetch();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const tiles = [
    [tl('Reported / cleared'), s.summary.reported, 'text-emerald-400'], [tl('Waiting to be sent'), s.summary.pending, 'text-amber-300'],
    [tl('Late (12 h+)'), s.summary.late, s.summary.late ? 'text-rose-400' : 'text-on-surface'],
    [tl('Rejected'), s.summary.rejected, s.summary.rejected ? 'text-rose-400' : 'text-on-surface'],
    [tl('Accepted with warnings'), s.summary.with_warnings, 'text-on-surface'],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map(([label, value, color]) => (
          <div key={label} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg px-4 py-3">
            <div className={`text-[22px] font-bold ${color}`}>{value}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={tl('E-invoicing')} icon="receipt_long">
          <div className="flex items-start justify-between gap-4">
            <div className="text-[13px]">
              <div className="text-on-surface font-bold">
                {s.live ? tl('On — paid sales are invoiced and reported') : s.enabled ? tl('On, but no active device') : tl('Off')}
              </div>
              <div className="text-on-surface-variant text-[12px]">
                {tl('Off = payments carry on as usual with plain receipts; nothing is sent to ZATCA.')}
              </div>
            </div>
            <button type="button" role="switch" aria-checked={s.enabled} aria-label={tl('E-invoicing')}
              disabled={!isAdmin || busy || (!s.enabled && !d)} onClick={toggle}
              className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 ${
                s.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
              {s.enabled ? tl('On') : tl('Off')}
            </button>
          </div>
          <dl className="flex flex-col gap-2">
            <Row label={tl('Environment')} value={s.environment_label} tone={s.test_mode ? 'warn' : 'ok'} />
            <Row label={tl('Switched on')} value={when(s.enabled_at)} />
            <Row label={tl('Retry job (every 5 minutes)')} value={s.cron_secret_set ? tl('Endpoint ready') : tl('Not set up')}
              tone={s.cron_secret_set ? 'ok' : 'warn'} />
          </dl>
          {!s.cron_secret_set && (
            <p className="text-[12px] text-amber-300">
              {tl('Invoices are sent right after each payment. To resend anything that failed, set ZATCA_CRON_SECRET on the server and have a scheduler call /api/admin/zatca/cron/ every 5 minutes — or press “Send waiting now”.')}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={btn.ghost} disabled={busy || !s.summary.pending} onClick={retry}>{tl('Send waiting now')}</button>
            {!d && isAdmin && <button type="button" className={btn.primary} onClick={() => go('golive')}>{tl('Go live')}</button>}
          </div>
        </Card>

        <Card title={tl('Device & credentials')} icon="memory">
          {!d ? (
            <p className="text-[13px] text-on-surface-variant">{tl('No device yet. Run the go-live wizard to register this system with ZATCA.')}</p>
          ) : (
            <dl className="flex flex-col gap-2">
              <Row label={tl('Device (EGS unit)')} value={d.common_name} />
              <Row label={tl('Invoice types')} value={d.b2b ? tl('Members and companies (B2C + B2B)') : tl('Members only (B2C)')} />
              <Row label={tl('Environment')} value={d.environment_label} />
              <Row label={tl('Private key')} value={tl(d.private_key === 'set' ? 'Set' : 'Not set')} tone={d.private_key === 'set' ? 'ok' : 'bad'} />
              <Row label={tl('Production certificate')} value={tl(d.production_certificate === 'set' ? 'Set' : 'Not set')}
                tone={d.production_certificate === 'set' ? 'ok' : 'bad'} />
              <Row label={tl('Issued by')} value={d.certificate_issuer || '—'} />
              <Row label={tl('Certificate expires')}
                value={d.certificate_expires_at ? `${when(d.certificate_expires_at)} · ${tl('{0} days', { 0: d.certificate_days_left })}` : '—'}
                tone={d.certificate_expiring ? 'warn' : undefined} />
              <Row label={tl('Documents issued (counter)')} value={d.last_icv} />
              <Row label={tl('Live since')} value={when(d.activated_at)} />
            </dl>
          )}
          <p className="text-[11px] text-on-surface-variant">{tl('Keys and ZATCA secrets are stored encrypted and are never shown.')}</p>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// BUSINESS DETAILS
// ============================================================
const DETAIL_FIELDS = [
  ['seller_name_ar', tl('Seller name (Arabic)'), 'rtl'], ['seller_name_en', tl('Seller name (English)')],
  ['vat_number', tl('VAT number (15 digits)')], ['crn', tl('Commercial registration (CR) number')],
  ['street', tl('Street')], ['building_number', tl('Building number (4 digits)')],
  ['additional_number', tl('Additional number (4 digits, optional)')], ['district', tl('District')],
  ['city', tl('City')], ['postal_code', tl('Postal code (5 digits)')],
  ['branch_name', tl('Branch name')], ['business_category', tl('Business category')],
  ['vat_rate', tl('VAT rate (%)')],
];

function DetailsForm({ s, isAdmin, onSaved, clearTest = false }) {
  const start = { ...s.settings };
  if (clearTest && start.vat_number === s.sandbox_vat) {
    ['vat_number', 'crn', 'street', 'building_number', 'additional_number', 'district', 'city', 'postal_code']
      .forEach((f) => { start[f] = ''; });
  }
  const [form, setForm] = useState(start);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const locked = s.locked_fields || [];
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const out = await api.saveSettings(form);
      onSaved(out);
      toast.success(tl('Business details saved'));
      if (out.warning) toast(out.warning, { icon: '⚠️' });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(tl('Check the highlighted fields'));
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DETAIL_FIELDS.map(([f, label, dir]) => (
          <label key={f} className="flex flex-col gap-1">
            <span className={labelCls}>{label}{locked.includes(f) && <span className="text-amber-300"> · {tl('locked')}</span>}</span>
            <input className={`${inputCls} ${errors[f] ? 'border-rose-500' : ''} ${dir ? 'text-right' : ''}`} dir={dir}
              value={form[f] ?? ''} disabled={!isAdmin || locked.includes(f)}
              inputMode={['vat_number', 'crn', 'building_number', 'additional_number', 'postal_code'].includes(f) ? 'numeric' : undefined}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            {errors[f] && <span className="text-[11px] text-rose-400">{errors[f]}</span>}
          </label>
        ))}
      </div>
      {locked.length > 0 && (
        <p className="text-[12px] text-amber-300">{tl('The VAT number and CR number are locked while this device is live, because its certificate carries them. Name, address and branch stay editable.')}</p>
      )}
      {isAdmin ? (
        <div><button type="submit" className={btn.primary} disabled={busy}>{busy ? tl('Saving…') : tl('Save details')}</button></div>
      ) : <p className="text-[12px] text-on-surface-variant">{tl('Only an admin can change these.')}</p>}
    </form>
  );
}

function Details({ s, isAdmin, onSaved }) {
  return (
    <Card title={tl('Business details')} icon="storefront">
      <p className="text-[13px] text-on-surface-variant">
        {tl('Printed on every tax invoice and sent to ZATCA. They must match the business’s VAT registration.')}
      </p>
      <DetailsForm s={s} isAdmin={isAdmin} onSaved={onSaved} />
    </Card>
  );
}

// ============================================================
// GO-LIVE WIZARD
// ============================================================
function Step({ n, title, done, active, children }) {
  return (
    <li className={`rounded-lg border p-4 flex gap-3 ${active ? 'border-primary-container/60 bg-[#111114]' : 'border-[#1a1a1e] bg-[#0e0e0f]'}`}>
      <span className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold shrink-0 ${
        done ? 'bg-emerald-500/20 text-emerald-400' : active ? 'bg-primary-container text-on-primary-container' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
        {done ? <span className="material-symbols-outlined text-[16px]">check</span> : n}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <h3 className={`text-[14px] font-bold ${active || done ? 'text-on-surface' : 'text-on-surface-variant'}`}>{title}</h3>
        {active && children}
      </div>
    </li>
  );
}


function GoLive({ s, isAdmin, onChanged }) {
  const dev = s.onboarding;
  const [picked, setEnv] = useState(s.device ? 'simulation' : 'sandbox');
  const env = dev?.environment || picked;     // an unfinished device keeps its environment
  const [chosen, setChosen] = useState(false);
  const [confirmProd, setConfirmProd] = useState(false);
  const [withB2b, setWithB2b] = useState(true);
  const [detailsOk, setDetailsOk] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = useCallback(async (key, fn, ok) => {
    setBusy(key);
    setError('');
    try {
      onChanged(await fn());
      if (ok) toast.success(ok);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.settings) onChanged(data);
      setError(data?.detail || errorMessage(err));
    } finally { setBusy(''); }
  }, [onChanged]);

  if (!isAdmin) return <Empty>{tl('Only an admin can take the system live.')}</Empty>;
  const sandbox = env === 'sandbox';
  const problems = Object.values(s.problems || {});
  const step = !dev ? (!chosen ? 1 : !detailsOk ? 2 : 3)
    : dev.production_certificate === 'set' ? 6 : dev.compliance_certificate === 'set' ? 5 : 4;
  const code = otp || (sandbox ? s.sandbox_otp : '');

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info" icon="info">
        {tl('Each go-live registers a new device with its own key and a fresh invoice chain; the previous device is archived. Practise in Sandbox first — it uses the fixed OTP {0}.', { 0: s.sandbox_otp })}
      </Notice>
      {error && <Notice tone="bad" icon="error">{error}</Notice>}
      <ol className="flex flex-col gap-3">
        <Step n={1} title={tl('Choose where to go live')} done={step > 1} active={step === 1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {s.environments.map((e) => (
              <button key={e.value} type="button" aria-pressed={env === e.value} onClick={() => setEnv(e.value)}
                className={`text-left rounded-lg border p-3 text-[13px] ${env === e.value ? 'border-primary-container bg-primary-container/10' : 'border-[#1a1a1e] hover:border-[#2a2a30]'}`}>
                <div className="font-bold text-on-surface">{tl(e.label)}</div>
                <div className="text-[12px] text-on-surface-variant">
                  {e.value === 'sandbox' ? tl('Practice: test VAT number, OTP 123345, nothing is legal.')
                    : e.value === 'simulation' ? tl('A real VAT-registered business and an OTP from the Fatoora simulation portal. Not legal yet.')
                      : tl('Legally real invoices, with the business’s own OTP.')}
                </div>
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 text-[13px] text-on-surface">
            <input type="checkbox" checked={withB2b} onChange={(e) => setWithB2b(e.target.checked)} className="mt-0.5" />
            <span>
              {tl('Also issue company (B2B) tax invoices')}
              <span className="block text-[12px] text-on-surface-variant">{tl('Members can ask for a tax invoice in their company’s name; ZATCA clears each one before it is issued. Adds three more compliance checks.')}</span>
            </span>
          </label>
          {env === 'production' && (
            <label className="flex items-start gap-2 text-[13px] text-rose-200">
              <input type="checkbox" checked={confirmProd} onChange={(e) => setConfirmProd(e.target.checked)} className="mt-0.5" />
              {tl('I understand that production invoices are legally real tax invoices reported to ZATCA.')}
            </label>
          )}
          <div><button type="button" className={btn.primary} disabled={env === 'production' && !confirmProd}
            onClick={() => setChosen(true)}>{tl('Continue')}</button></div>
        </Step>

        <Step n={2} title={tl('Check the business details')} done={step > 2} active={step === 2}>
          <DetailsForm s={s} isAdmin={isAdmin} onSaved={onChanged} clearTest={!sandbox} />
          <div className="flex gap-2 items-center flex-wrap">
            <button type="button" className={btn.ghost} onClick={() => setChosen(false)}>{tl('Back')}</button>
            <button type="button" className={btn.primary} disabled={problems.length > 0} onClick={() => setDetailsOk(true)}>
              {tl('Details are correct')}
            </button>
            {problems.length > 0 && <span className="text-[12px] text-amber-300">{tl('Fix {0} problem(s) and save first.', { 0: problems.length })}</span>}
          </div>
        </Step>

        <Step n={3} title={tl('Create the device key and certificate request')} done={step > 3} active={step === 3}>
          <p className="text-[13px] text-on-surface-variant">{tl('One click: a new private key (kept encrypted on the server) and a certificate request.')}</p>
          <div className="flex gap-2">
            <button type="button" className={btn.ghost} onClick={() => setDetailsOk(false)}>{tl('Back')}</button>
            <button type="button" className={btn.primary} disabled={!!busy}
              onClick={() => run('start', () => api.start(env, confirmProd, withB2b), tl('Device created'))}>
              {busy === 'start' ? tl('Creating…') : tl('Create device')}</button>
          </div>
        </Step>

        <Step n={4} title={tl('Enter the OTP from the Fatoora portal')} done={step > 4} active={step === 4}>
          {sandbox ? (
            <p className="text-[13px] text-on-surface-variant">{tl('Sandbox always uses {0}.', { 0: s.sandbox_otp })}</p>
          ) : (
            <ol className="list-decimal ms-5 text-[13px] text-on-surface-variant flex flex-col gap-1">
              <li>{tl('Sign in to the Fatoora portal with the business’s ZATCA (ERAD) account.')}</li>
              <li>{tl('Choose “Onboard new solution unit / device” and generate an OTP for 1 unit.')}</li>
              <li>{tl('Enter it below — it is valid for 1 hour.')}</li>
            </ol>
          )}
          <div className="flex gap-2 flex-wrap">
            <input className={`${inputCls} max-w-[180px] font-mono tracking-widest`} inputMode="numeric" maxLength={6}
              placeholder="123456" aria-label={tl('OTP')} value={code}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className={btn.primary} disabled={!!busy || code.length !== 6}
              onClick={() => run('otp', () => api.otp(dev.id, code), tl('Compliance certificate received'))}>
              {busy === 'otp' ? tl('Asking ZATCA…') : tl('Get compliance certificate')}</button>
          </div>
        </Step>

        <Step n={5} title={tl('Compliance checks and production certificate')} done={step > 5} active={step === 5}>
          <p className="text-[13px] text-on-surface-variant">{tl('ZATCA checks a sample invoice, credit note and debit note, then issues the production certificate.')}</p>
          {dev?.compliance_checks && Object.keys(dev.compliance_checks).length > 0 && (
            <ul className="flex flex-col gap-1 text-[13px]">
              {Object.entries(dev.compliance_checks).map(([k, r]) => (
                <li key={k} className={r.ok ? 'text-emerald-400' : 'text-rose-300'}>
                  {r.ok ? '✓' : '✕'} {tl(k)}: {r.status}
                  {r.warnings?.length > 0 && <span className="text-amber-300"> · {r.warnings.join('; ')}</span>}
                  {r.errors?.length > 0 && <span> · {r.errors.join('; ')}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={dev?.checks_passed ? btn.ghost : btn.primary} disabled={!!busy}
              onClick={() => run('checks', () => api.checks(dev.id), tl('Compliance checks passed'))}>
              {busy === 'checks' ? tl('Checking…') : tl('Run compliance checks')}</button>
            <button type="button" className={btn.primary} disabled={!!busy || !dev?.checks_passed}
              onClick={() => run('production', () => api.production(dev.id), tl('Production certificate received'))}>
              {busy === 'production' ? tl('Asking ZATCA…') : tl('Get production certificate')}</button>
          </div>
        </Step>

        <Step n={6} title={tl('Switch on and make a test sale')} done={false} active={step === 6}>
          <p className="text-[13px] text-on-surface-variant">
            {tl('From now on every paid sale is invoiced on this device. Make a small test purchase, then check it under Invoices.')}
          </p>
          <div><button type="button" className={btn.primary} disabled={!!busy}
            onClick={() => run('activate', () => api.activate(dev.id), tl('E-invoicing is live on the new device'))}>
            {busy === 'activate' ? tl('Switching…') : tl('Activate this device')}</button></div>
        </Step>
      </ol>
    </div>
  );
}

// ============================================================
// INVOICES
// ============================================================
const FILTERS = [['', tl('All')], ['pending', tl('Waiting')], ['late', tl('Late')], ['rejected', tl('Rejected')],
  ['warnings', tl('With warnings')], ['reported', tl('Reported')], ['cleared', tl('Cleared')], ['company', tl('Company invoices')]];

function Invoices({ isAdmin, onChanged }) {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, loading, refetch } = useApi(() => api.documents({ status: status || undefined, q: q || undefined, page }),
    [status, q, page], { poll: 30_000 });
  const rows = data?.results || [];
  const show = async (id) => { try { setOpen(await api.document(id)); } catch (err) { toast.error(errorMessage(err)); } };
  const send = async () => {
    try {
      const doc = await api.send(open.id);
      setOpen(doc);
      toast.success(doc.status === 'reported' ? tl('Reported to ZATCA') : tl('Still waiting — will retry'));
      refetch();
      onChanged();
    } catch (err) { toast.error(errorMessage(err)); }
  };
  const download = async (copy) => {
    try {
      const url = URL.createObjectURL(await api.xml(open.id, copy));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${open.number}${copy === 'cleared' ? '-cleared' : ''}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map(([id, label]) => (
          <button key={id || 'all'} type="button" onClick={() => { setStatus(id); setPage(1); }}
            className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${status === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <input className={`${inputCls} md:w-64`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder={tl('Search number or customer…')} aria-label={tl('Search invoices')} />
      </div>
      {loading && !data ? <Empty>{tl('Loading…')}</Empty> : !rows.length ? <Empty>{tl('No invoices here yet.')}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl('Number')}</th><th className="px-4 py-3">{tl('Type')}</th><th className="px-4 py-3">{tl('Issued')}</th>
                <th className="px-4 py-3">{tl('Customer')}</th><th className="px-4 py-3 text-right">{tl('VAT')}</th>
                <th className="px-4 py-3 text-right">{tl('Total')}</th><th className="px-4 py-3">{tl('ZATCA')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} onClick={() => show(d.id)} className="border-b border-[#1a1a1e] last:border-0 hover:bg-[#131316] cursor-pointer">
                  <td className="px-4 py-3 font-mono text-on-surface whitespace-nowrap">
                    {d.number}{d.test && <span className="ms-2 text-[9px] text-amber-300 font-bold">TEST</span>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{tl(d.doc_type_label)}</td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{when(d.issued_at)}</td>
                  <td className="px-4 py-3 text-on-surface" dir="auto">
                    {d.customer_name || '—'}
                    {d.standard && <span className="ms-2 text-[9px] text-sky-300 font-bold uppercase">{tl('Company')}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{Number(d.vat).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-on-surface whitespace-nowrap">{sar(d.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[d.status]}`}>{tl(d.status_label)}</span>
                    {d.late && <span className="ms-1 text-[10px] text-rose-400 font-bold">{tl('late')}</span>}
                    {d.has_warnings && <span className="ms-1 text-[10px] text-amber-300 font-bold">{tl('warnings')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (data.next || data.previous) && (
        <div className="flex gap-2 justify-end">
          <button type="button" className={btn.ghost} disabled={!data.previous} onClick={() => setPage(page - 1)}>{tl('Previous')}</button>
          <button type="button" className={btn.ghost} disabled={!data.next} onClick={() => setPage(page + 1)}>{tl('Next')}</button>
        </div>
      )}

      <Drawer open={!!open} title={open?.number || ''} subtitle={open ? `${tl(open.doc_type_label)} · ${when(open.issued_at)}` : ''}
        onClose={() => setOpen(null)}>
        {open && (
          <div className="p-5 flex flex-col gap-4 text-[13px]">
            <dl className="flex flex-col gap-2">
              <Row label={tl('ZATCA')} value={tl(open.status_label)} tone={{ reported: 'ok', pending: 'warn', rejected: 'bad' }[open.status]} />
              {open.standard && open.buyer_details && (
                <>
                  <Row label={tl('Buyer')} value={open.buyer_details.name} />
                  <Row label={tl('Buyer VAT number')} value={open.buyer_details.vat_number} />
                  <Row label={tl('Buyer address')} value={[`${open.buyer_details.building_number} ${open.buyer_details.street}`, open.buyer_details.district, open.buyer_details.city, open.buyer_details.postal_code].join(', ')} />
                </>
              )}
              {open.original && <Row label={tl('Original invoice')} value={open.original} />}
              {open.reason && <Row label={tl('Reason')} value={open.reason} />}
              <Row label={tl('Customer')} value={open.customer_name || '—'} />
              <Row label={tl('Paid with')} value={open.payment_label || '—'} />
              <Row label={tl('Payment')} value={open.transaction_id || (open.registration_id ? `REG-${open.registration_id}` : '—')} />
              <Row label={tl('Counter / UUID')} value={`${open.icv} · ${open.uuid}`} />
              <Row label={tl('Attempts')} value={`${open.attempts}${open.next_attempt_at ? ` · ${tl('next')} ${when(open.next_attempt_at)}` : ''}`} />
              {open.last_error && <Row label={tl('Last error')} value={open.last_error} tone="bad" />}
            </dl>
            {open.errors?.length > 0 && <Notice tone="bad" icon="error"><ul>{open.errors.map((m) => <li key={m}>{m}</li>)}</ul></Notice>}
            {open.warnings?.length > 0 && <Notice tone="warn"><ul>{open.warnings.map((m) => <li key={m}>{m}</li>)}</ul></Notice>}
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant text-left">
                  <th className="py-2">{tl('Item')}</th><th className="py-2 text-right">{tl('Qty')}</th>
                  <th className="py-2 text-right">{tl('Price excl. VAT')}</th><th className="py-2 text-right">{tl('VAT')}</th>
                </tr>
              </thead>
              <tbody>
                {open.lines.map((l, i) => (
                  <tr key={i} className="border-t border-[#1a1a1e]">
                    <td className="py-2 text-on-surface">{l.name}</td><td className="py-2 text-right">{l.qty}</td>
                    <td className="py-2 text-right">{l.unit_net}</td><td className="py-2 text-right">{l.vat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="flex flex-col gap-2">
              <Row label={tl('Total excl. VAT')} value={sar(open.net)} />
              <Row label={tl('VAT {0}%', { 0: Number(open.vat_rate) })} value={sar(open.vat)} />
              {Number(open.rounding) !== 0 && <Row label={tl('Rounding')} value={Number(open.rounding).toFixed(2)} />}
              <Row label={tl('Total incl. VAT')} value={sar(open.total)} />
            </dl>
            {open.credit_notes?.length > 0 && (
              <p className="text-on-surface-variant">{tl('Credit notes')}: {open.credit_notes.map((n) => n.number).join(', ')}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn.ghost} onClick={() => download()}>{tl('Download signed XML')}</button>
              {open.has_cleared_copy && (
                <button type="button" className={btn.ghost} onClick={() => download('cleared')}>{tl('Download ZATCA’s cleared copy')}</button>
              )}
              {isAdmin && open.status === 'pending' && <button type="button" className={btn.primary} onClick={send}>{tl('Send now')}</button>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ============================================================
// ACTIVITY
// ============================================================
function Activity() {
  const { data, loading } = useApi(() => api.events(), []);
  const rows = Array.isArray(data) ? data : [];
  if (loading && !data) return <Empty>{tl('Loading…')}</Empty>;
  if (!rows.length) return <Empty>{tl('Nothing has happened yet.')}</Empty>;
  return (
    <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg divide-y divide-[#1a1a1e]">
      {rows.map((e) => (
        <div key={e.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-[13px]">
          <span className="text-on-surface-variant md:w-44 shrink-0">{when(e.created_at)}</span>
          <span className="text-on-surface font-bold first-letter:uppercase">{e.action.replaceAll('_', ' ')}</span>
          <span className="text-on-surface-variant">{e.actor}{e.device && ` · ${e.device}`}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// COMPANIES (B2B buyers)
// ============================================================
function Companies({ isAdmin, b2b }) {
  const [q, setQ] = useState('');
  const { data, loading, refetch } = useApi(() => api.companies({ q: q || undefined }), [q]);
  const rows = Array.isArray(data) ? data : [];
  const remove = async (c) => {
    if (!window.confirm(tl('Remove {0}? Invoices already issued keep its details.', { 0: c.name }))) return;
    try { await api.removeCompany(c.id); toast.success(tl('Company removed')); refetch(); } catch (err) { toast.error(errorMessage(err)); }
  };
  return (
    <div className="flex flex-col gap-3">
      {!b2b && (
        <Notice tone="info" icon="info">
          {tl('Company invoices are off: the live device only issues member (B2C) invoices. Go live again with “Also issue company (B2B) tax invoices” ticked.')}
        </Notice>
      )}
      <p className="text-[13px] text-on-surface-variant">
        {tl('Companies members buy for. Members add them when paying (“I need a tax invoice for my company”); the front desk can choose one when extending a membership.')}
      </p>
      <input className={`${inputCls} md:w-72`} value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={tl('Search company, VAT number or member…')} aria-label={tl('Search companies')} />
      {loading && !data ? <Empty>{tl('Loading…')}</Empty> : !rows.length ? <Empty>{tl('No companies yet.')}</Empty> : (
        <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1a1a1e] text-left text-[10px] uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">{tl('Company')}</th><th className="px-4 py-3">{tl('VAT number')}</th>
                <th className="px-4 py-3">{tl('Address')}</th><th className="px-4 py-3">{tl('Member')}</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-[#1a1a1e] last:border-0">
                  <td className="px-4 py-3 text-on-surface font-bold" dir="auto">{c.name}{c.crn && <span className="block text-[11px] font-normal text-on-surface-variant">CR {c.crn}</span>}</td>
                  <td className="px-4 py-3 font-mono text-on-surface-variant">{c.vat_number}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.building_number} {c.street}, {c.district}, {c.city} {c.postal_code}</td>
                  <td className="px-4 py-3 text-on-surface">{c.owner_name}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && <button type="button" className={btn.ghost} onClick={() => remove(c)}>{tl('Remove')}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
