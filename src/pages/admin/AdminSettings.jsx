// src/pages/admin/AdminSettings.jsx
// What this deployment is actually configured to do (payments, email, uploads, gym), who can do
// what, and your own account. Values come from the server's environment variables — except the
// 2-step verification switches, which admins change here.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';

function Card({ title, icon, children }) {
  return (
    <section className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-5 flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-on-surface font-bold uppercase tracking-wider text-[13px]">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>{title}
      </h2>
      <dl className="flex flex-col gap-2 text-[13px]">{children}</dl>
    </section>
  );
}

function Row({ label, value, tone }) {
  const color = { ok: 'text-emerald-400', warn: 'text-amber-300', bad: 'text-rose-400' }[tone] || 'text-on-surface';
  return (
    <div className="flex justify-between gap-4 border-b border-[#1a1a1e] last:border-0 pb-2 last:pb-0">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className={`text-right ${color}`}>{value}</dd>
    </div>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { data: s, loading, refetch } = useApi(() => adminService.settings(), []);

  if (loading || !s) {
    return <div className="p-6 md:p-8"><div className="h-96 bg-[#0e0e0f] rounded-lg animate-pulse" /></div>;
  }
  const { payments: p, email: e, storage: st, gym: g, server, access, me } = s;
  const modeTone = { live: 'ok', test: 'warn' }[p.mode] || 'bad';

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <PageHeader title={tl("Settings")} subtitle={tl("How this system is set up. These values come from the server’s environment variables (Vercel → Project → Settings → Environment Variables); change them there and redeploy.")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={tl("Payments")} icon="credit_card">
          <Row label={tl("Provider")} value={p.provider} />
          <Row label={tl("Mode")} value={p.mode === 'live' ? 'Live — real cards are charged' : p.mode === 'test' ? 'Test — no real money moves' : `Not working (${p.mode})`} tone={modeTone} />
          <Row label={tl("Checkout key")} value={p.publishable_key_set ? 'Set' : 'Missing'} tone={p.publishable_key_set ? 'ok' : 'bad'} />
          <Row label={tl("Webhook secret")} value={p.webhook_secret_set ? 'Set' : 'Missing — payments still verify on return, but late confirmations are missed'} tone={p.webhook_secret_set ? 'ok' : 'warn'} />
          <Row label={tl("Currency")} value={p.currency} />
          <Row label={tl("VAT on shop items")} value={`${p.vat_rate_percent}%`} />
        </Card>

        <Card title={tl("Email")} icon="mail">
          <Row label={tl("Sending")} value={e.sending ? 'Yes' : 'No'} tone={e.sending ? 'ok' : 'bad'} />
          <Row label={tl("How")} value={e.method} />
          <Row label={tl("From address")} value={e.from} />
          <Row label={tl("Contact form alerts go to")} value={e.contact_form_notifies || 'Nobody (messages wait in Website Inbox)'} tone={e.contact_form_notifies ? undefined : 'warn'} />
          {!e.sending && <p className="text-[12px] text-amber-300">{tl("Welcome emails, receipts, password resets and staff invites aren’t delivered until email is set up.")}</p>}
        </Card>

        <Card title={tl("Gym")} icon="fitness_center">
          <Row label={tl("Time zone (all dates and hours)")} value={g.time_zone} />
          <Row label={tl("Capacity for the live load")} value={`${g.capacity.value || '—'} · from ${g.capacity.source}`} tone={g.capacity.value ? undefined : 'warn'} />
          <Row label={tl("Member portal")} value={g.portal_url.join(', ')} />
          <Row label={tl("Uploads")} value={st.uploads} tone={st.durable ? 'ok' : 'warn'} />
          <Row label={tl("Database")} value={server.database} />
          {server.debug && <Row label={tl("Debug mode")} value="On — never use on the live site" tone="bad" />}
        </Card>

        <SecurityCard security={s.security} isAdmin={user?.role === 'admin'} onSaved={refetch} />

        <Card title={tl("Your account")} icon="account_circle">
          <Row label={tl("Name")} value={me.name || '—'} />
          <Row label={tl("Email")} value={me.email} />
          <Row label={tl("Role")} value={me.role} />
          <div className="flex gap-2 pt-2">
            <Link to="/admin/change-password" className={btn.ghost}>{tl("Change password")}</Link>
            <Link to="/admin/security" className={btn.ghost}>{tl("My 2-step verification")}</Link>
            <Link to="/admin/staff" className={btn.ghost}>{tl("Manage staff")}</Link>
          </div>
        </Card>
      </div>

      <section className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-5 flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-on-surface font-bold uppercase tracking-wider text-[13px]">
          <span className="material-symbols-outlined text-primary text-[18px]">shield_person</span>{tl("Who can do what")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {access.map((a) => (
            <div key={a.role} className="bg-[#131316] rounded-lg p-4 text-[13px] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface font-bold">{tl(a.role)}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${a.portal ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
                  {a.portal ? tl("Admin sign-in") : tl("No admin sign-in")}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {a.can.map((c) => <li key={c} className="text-on-surface-variant">✓ {c}</li>)}
                {(a.cannot || []).map((c) => <li key={c} className="text-on-surface-variant/60">✕ {c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


/** The gym-wide 2-step verification switches (admins only, confirmed with their password). */
function SecurityCard({ security, isAdmin, onSaved }) {
  const [pending, setPending] = useState(null);      // {key, value} waiting for the password
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = [
    ['two_factor_enabled', 'enabled', tl("2-step verification"),
      tl("Off = everyone signs in with email and password only. People keep their setup for when it’s back on.")],
    ['two_factor_required_for_staff', 'required_for_staff', tl("Required for staff and coaches"),
      tl("On = admins, managers and coaches must set it up at sign-in. Off = optional for everyone.")],
  ];
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminService.saveSecurity({ [pending.key]: pending.value, password });
      toast.success(tl("Sign-in security updated"));
      setPending(null);
      setPassword('');
      onSaved();
    } catch (err) {
      setError(fieldErrors(err).password || errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-5 flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-on-surface font-bold uppercase tracking-wider text-[13px]">
        <span className="material-symbols-outlined text-primary text-[18px]">shield_lock</span>{tl("Sign-in security")}
      </h2>
      {rows.map(([key, field, label, hint]) => {
        const on = !!security[field];
        const disabled = !isAdmin || (key === 'two_factor_required_for_staff' && !security.enabled);
        return (
          <div key={key} className="flex items-start justify-between gap-4 border-b border-[#1a1a1e] pb-3">
            <div className="min-w-0">
              <div className="text-on-surface text-[13px] font-bold">{label}</div>
              <div className="text-[12px] text-on-surface-variant">{hint}</div>
            </div>
            <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
              onClick={() => { setPending({ key, value: !on }); setError(''); }}
              className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 ${
                on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
              {on ? tl("On") : tl("Off")}
            </button>
          </div>
        );
      })}
      <dl className="flex flex-col gap-2 text-[13px]">
        <Row label={tl("Code by email")} value={security.email_codes ? tl("Available (SMTP is set up)") : tl("Not available — set up SMTP email; the authenticator app still works")}
          tone={security.email_codes ? 'ok' : 'warn'} />
        <Row label={tl("Trusted devices")} value={tl("Asked once per device, then every {0} days", { 0: security.trust_days })} />
      </dl>
      {!isAdmin && <p className="text-[12px] text-on-surface-variant">{tl("Only an admin can change these.")}</p>}
      {pending && (
        <form onSubmit={save} className="flex flex-col gap-2 rounded-lg border border-[#26262b] p-3">
          <span className="text-[12px] text-on-surface">
            {tl("Turn “{0}” {1}? Confirm with your password. Every admin is notified.",
              { 0: rows.find((r) => r[0] === pending.key)[2], 1: pending.value ? tl("on") : tl("off") })}
          </span>
          <input type="password" autoComplete="current-password" className={inputCls} value={password}
            onChange={(e) => setPassword(e.target.value)} aria-label={tl("Your password")} autoFocus />
          {error && <span role="alert" className="text-[12px] text-rose-400">{error}</span>}
          <div className="flex gap-2 justify-end">
            <button type="button" className={btn.ghost} onClick={() => setPending(null)}>{tl("Cancel")}</button>
            <button type="submit" className={btn.primary} disabled={busy || !password}>{busy ? tl("Saving…") : tl("Confirm")}</button>
          </div>
        </form>
      )}
    </section>
  );
}
