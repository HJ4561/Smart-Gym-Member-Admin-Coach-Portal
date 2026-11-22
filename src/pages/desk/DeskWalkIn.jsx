// src/pages/desk/DeskWalkIn.jsx
// Sign up someone standing at the desk: their details and photo, a plan, payment taken at the desk.
// They're a member straight away (no admin approval) and get their login by email.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { adminService } from '../../services/adminService';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useListState';
import { PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import SaudiPhoneInput from '../../components/SaudiPhoneInput';
import CameraCapture from '../../components/common/CameraCapture';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { isAr, tl } from '../../i18n';
import { card, Page, Section } from '../coach/ui';

const EMPTY = { full_name: '', email: '', phone: '', iqama_number: '', age: '', gender: '', address: '',
  plan: '', duration_months: 1, facilities: [], payment: 'cash', payment_reference: '', language: isAr ? 'ar' : 'en' };
const MONTHS = [1, 3, 6, 12];

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
      {error && <span className="text-[11px] text-rose-400">{tl(error)}</span>}
    </label>
  );
}

export default function DeskWalkIn() {
  const gate = useLocation().pathname.startsWith('/admin') ? '/admin/member-lookup' : '/desk/gate';
  const [f, setF] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const { data: plans } = useApi(() => api.get('/public/plans/').then((r) => r.data), []);
  const { data: facilities } = useApi(() => api.get('/public/collections/facilities/').then((r) => r.data), []);
  const bookable = (Array.isArray(facilities) ? facilities : []).filter((x) => x.bookable);
  const pick = useDebounced(`${f.plan}|${f.duration_months}|${f.facilities.join(',')}`, 300);
  const { data: quote } = useApi(() => {
    const [plan, months, fac] = pick.split('|');
    return plan ? adminService.walkInQuote({ plan, duration_months: months, facilities: fac }) : Promise.resolve(null);
  }, [pick]);

  const toggleFacility = (id) => setF((p) => ({
    ...p, facilities: p.facilities.includes(id) ? p.facilities.filter((x) => x !== id) : [...p.facilities, id] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!photo) { setErrors({ photo: 'Take their photo — the entrance checks faces against it.' }); return; }
    if (!window.confirm(tl('Take {0} by {1} and add {2} as a member?', {
      0: formatSAR(quote?.total || 0), 1: f.payment === 'cash' ? tl('cash') : tl('card terminal'), 2: f.full_name || '—' }))) return;
    setBusy(true);
    setErrors({});
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => form.append(k, Array.isArray(v) ? v.join(',') : v));
    form.append('photo', photo);
    try {
      const res = await adminService.walkIn(form);
      toast.success(tl(res.detail));
      setDone(res);
      setF(EMPTY);
      setPhoto(null);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not add the member')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title={tl('Add a walk-in')}
        subtitle={tl('For someone signing up at the desk. They’re a member as soon as you save — no admin approval — and their login comes by email.')} />

      {done && (
        <div className={`${card} p-4 border-emerald-500/40 flex flex-wrap items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-400" aria-hidden="true">check_circle</span>
          <div className="flex-1 min-w-0 text-[13px]">
            <div className="text-on-surface font-bold">{done.user.full_name} · {done.membership.pass_id}</div>
            <div className="text-on-surface-variant">{tl('{0} paid by {1}. Their ID is checked, so they can go straight in.', { 0: formatSAR(done.amount), 1: tl(done.payment) })}</div>
          </div>
          <Link className={btn.primary} to={`${gate}?iqama=${done.membership.iqama_number || ''}`}>{tl('Check them in')}</Link>
          <button type="button" className={btn.ghost} onClick={() => setDone(null)}>{tl('Add another')}</button>
        </div>
      )}

      <form onSubmit={submit} noValidate className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Section title={tl('Their details')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label={tl('Full name')} error={errors.full_name}><input className={inputCls} value={f.full_name} onChange={set('full_name')} maxLength={150} /></Field>
              <Field label={tl('Iqama number')} error={errors.iqama_number}><input className={`${inputCls} font-mono`} inputMode="numeric" maxLength={10} value={f.iqama_number} onChange={set('iqama_number')} placeholder="2XXXXXXXXX" /></Field>
              <Field label={tl('Email')} error={errors.email}><input className={inputCls} type="email" value={f.email} onChange={set('email')} /></Field>
              <Field label={tl('Mobile')} error={errors.phone}><SaudiPhoneInput value={f.phone} onChange={set('phone')} /></Field>
              <Field label={tl('Age')} error={errors.age}><input className={inputCls} type="number" min="12" max="100" value={f.age} onChange={set('age')} /></Field>
              <Field label={tl('Gender')} error={errors.gender}>
                <select className={inputCls} value={f.gender} onChange={set('gender')}>
                  <option value="">{tl('Choose…')}</option>
                  <option value="female">{tl('Female')}</option><option value="male">{tl('Male')}</option>
                </select>
              </Field>
              <Field label={tl('Address')} error={errors.address} className="md:col-span-2"><input className={inputCls} value={f.address} onChange={set('address')} /></Field>
              <Field label={tl('Emails in')} error={errors.language}>
                <select className={inputCls} value={f.language} onChange={set('language')}>
                  <option value="en">English</option><option value="ar">العربية</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title={tl('Photo')}>
            <p className="text-[12px] text-on-surface-variant">{tl('Face the camera, no hat or sunglasses. The entrance compares their face with this photo.')}</p>
            <CameraCapture value={photo} onChange={(file) => { setPhoto(file); setErrors((x) => ({ ...x, photo: undefined })); }} error={errors.photo} />
          </Section>

          <Section title={tl('Plan')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label={tl('Plan')} error={errors.plan}>
                <select className={inputCls} value={f.plan} onChange={set('plan')}>
                  <option value="">{tl('Choose a plan…')}</option>
                  {(plans || []).map((p) => <option key={p.id} value={p.id}>{(isAr && p.display_name_ar) || p.display_name} · {formatSAR(p.price_monthly)}{tl('/mo')}</option>)}
                </select>
              </Field>
              <Field label={tl('Length')} error={errors.duration_months}>
                <select className={inputCls} value={f.duration_months} onChange={set('duration_months')}>
                  {MONTHS.map((m) => <option key={m} value={m}>{tl('{0} months', { 0: m })}</option>)}
                </select>
              </Field>
            </div>
            {bookable.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className={labelCls}>{tl('Facility add-ons (optional)')}</span>
                <div className="flex flex-wrap gap-2">
                  {bookable.map((x) => (
                    <label key={x.id} className={`flex items-center gap-2 px-3 py-2 rounded border text-[13px] cursor-pointer ${f.facilities.includes(x.id) ? 'border-primary-container bg-primary-container/10' : 'border-[#1a1a1e]'}`}>
                      <input type="checkbox" checked={f.facilities.includes(x.id)} onChange={() => toggleFacility(x.id)} />
                      {(isAr && x.name_ar) || x.name} · {formatSAR(x.monthly_price)}{tl('/mo')}
                    </label>
                  ))}
                </div>
                {errors.facilities && <span className="text-[11px] text-rose-400">{tl(errors.facilities)}</span>}
              </div>
            )}
          </Section>
        </div>

        <div className={`${card} p-5 flex flex-col gap-4 xl:sticky xl:top-20`}>
          <h2 className="text-on-surface font-bold uppercase tracking-wider text-[13px]">{tl('Payment at the desk')}</h2>
          <div className="flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between"><span className="text-on-surface-variant">{tl('Plan')}</span><span>{quote ? formatSAR(quote.plan) : '—'}</span></div>
            {(quote?.facilities || []).map((l) => (
              <div key={l.id} className="flex justify-between"><span className="text-on-surface-variant">{l.name}</span><span>{formatSAR(l.amount)}</span></div>
            ))}
            <div className="flex justify-between border-t border-[#1a1a1e] pt-2 mt-1 text-[18px] font-bold">
              <span>{tl('Total')}</span><span className="text-primary">{quote ? formatSAR(quote.total) : '—'}</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">{tl('VAT included. A receipt and tax invoice are emailed to them.')}</span>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label={tl('Paid by')}>
            {[['cash', tl('Cash'), 'payments'], ['card_terminal', tl('Card terminal'), 'credit_card']].map(([v, l, icon]) => (
              <button key={v} type="button" role="radio" aria-checked={f.payment === v} onClick={() => setF((p) => ({ ...p, payment: v }))}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded border text-[12px] font-bold uppercase tracking-wider ${f.payment === v ? 'border-primary-container bg-primary-container/15 text-on-surface' : 'border-[#1a1a1e] text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>{l}
              </button>
            ))}
          </div>
          {errors.payment && <span className="text-[11px] text-rose-400">{tl(errors.payment)}</span>}
          {f.payment === 'card_terminal' && (
            <Field label={tl('Terminal slip number (optional)')} error={errors.payment_reference}>
              <input className={inputCls} value={f.payment_reference} onChange={set('payment_reference')} maxLength={60} />
            </Field>
          )}
          {errors.detail && <p className="text-[12px] text-rose-400">{tl(errors.detail)}</p>}
          <button type="submit" className={`${btn.primary} py-3`} disabled={busy || !quote}>
            {busy ? tl('Saving…') : tl('Payment received — add member')}
          </button>
        </div>
      </form>
    </Page>
  );
}
