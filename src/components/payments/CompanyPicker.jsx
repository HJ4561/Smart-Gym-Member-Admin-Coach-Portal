// src/components/payments/CompanyPicker.jsx
// "I need a tax invoice for my company" in the pay dialog (ZATCA B2B): pick a saved company or add one.
// The invoice then carries the company's legal details and is cleared by ZATCA before it is issued.
import { useState } from 'react';
import { zatcaService } from '../../services/zatcaService';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';

const FIELDS = [
  ['name', tl('Company legal name'), true], ['vat_number', tl('VAT number (15 digits)'), true],
  ['crn', tl('CR number (optional)')], ['street', tl('Street'), true],
  ['building_number', tl('Building number (4 digits)'), true], ['additional_number', tl('Additional number (optional)')],
  ['district', tl('District'), true], ['city', tl('City'), true], ['postal_code', tl('Postal code (5 digits)'), true],
];
const NUMERIC = ['vat_number', 'crn', 'building_number', 'additional_number', 'postal_code'];
const input = 'w-full bg-surface-container border border-surface-container-high rounded px-3 py-2 text-[13px] text-on-surface outline-none focus:border-primary-container';

export default function CompanyPicker({ companies, want, onWant, value, onChange, onAdded }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const list = companies || [];

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const c = await zatcaService.addMyCompany(form);
      onAdded(c);
      setAdding(false);
      setForm({});
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { _: errorMessage(err) });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-surface-container-high p-3 flex flex-col gap-2">
      <label className="flex items-center gap-2 text-[13px] text-on-surface cursor-pointer">
        <input type="checkbox" checked={want} onChange={(e) => { onWant(e.target.checked); if (e.target.checked && !list.length) setAdding(true); }} />
        {tl('I need a tax invoice for my company')}
      </label>
      {want && (
        <>
          {list.length > 0 && !adding && (
            <div className="flex flex-col gap-1" role="radiogroup" aria-label={tl('Company')}>
              {list.map((c) => (
                <label key={c.id} className={`flex items-start gap-2 rounded px-2 py-1.5 text-[13px] cursor-pointer ${value === c.id ? 'bg-primary-container/15' : 'hover:bg-surface-container'}`}>
                  <input type="radio" name="company" className="mt-1" checked={value === c.id} onChange={() => onChange(c.id)} />
                  <span className="min-w-0">
                    <span className="block text-on-surface font-bold truncate" dir="auto">{c.name}</span>
                    <span className="block text-[11px] text-on-surface-variant">{tl('VAT')} {c.vat_number} · {c.city}</span>
                  </span>
                </label>
              ))}
              <button type="button" onClick={() => setAdding(true)} className="self-start text-[12px] text-primary font-bold hover:underline">
                {tl('+ Add another company')}
              </button>
            </div>
          )}
          {adding && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-on-surface-variant">{tl('As registered for VAT — these details are printed on the tax invoice and sent to ZATCA.')}</p>
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(([f, label, required]) => (
                  <label key={f} className={`flex flex-col gap-0.5 ${f === 'name' || f === 'street' ? 'col-span-2' : ''}`}>
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}{required && ' *'}</span>
                    <input className={`${input} ${errors[f] ? 'border-error' : ''}`} dir={f === 'name' ? 'auto' : undefined}
                      inputMode={NUMERIC.includes(f) ? 'numeric' : undefined} value={form[f] || ''}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                    {errors[f] && <span className="text-[11px] text-error">{errors[f]}</span>}
                  </label>
                ))}
              </div>
              {errors._ && <p className="text-[12px] text-error" role="alert">{errors._}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={busy}
                  className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-bold uppercase text-[11px] disabled:opacity-50">
                  {busy ? tl('Saving…') : tl('Save company')}
                </button>
                {list.length > 0 && (
                  <button type="button" onClick={() => setAdding(false)}
                    className="px-3 py-2 rounded bg-surface-container text-on-surface-variant font-bold uppercase text-[11px]">
                    {tl('Cancel')}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
