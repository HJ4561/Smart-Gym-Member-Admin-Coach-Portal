// src/components/site/SiteUi.jsx
// Shared building blocks for the Public Website admin screens.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { btn, inputCls, labelCls } from './siteStyles';
import { tl } from '../../i18n';

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-headline-lg text-[28px] text-on-surface uppercase tracking-wider mb-1">{title}</h1>
        {subtitle && <p className="font-body-sm text-on-surface-variant text-[13px] max-w-2xl">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/** English + Arabic inputs side by side (Arabic right-to-left). */
export function BilingualField({ label, value, onChange, multiline = false, error, required = false, rows = 3 }) {
  const v = value || { en: '', ar: '' };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>{label}{required && <span className="text-primary"> *</span>}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Tag
          className={`${inputCls} ${error ? 'border-rose-500' : ''}`}
          value={v.en}
          rows={multiline ? rows : undefined}
          placeholder={tl("English")}
          onChange={(e) => onChange({ ...v, en: e.target.value })}
        />
        <Tag
          className={`${inputCls} text-right ${error ? 'border-rose-500' : ''}`}
          dir="rtl"
          lang="ar"
          value={v.ar}
          rows={multiline ? rows : undefined}
          placeholder="العربية"
          onChange={(e) => onChange({ ...v, ar: e.target.value })}
        />
      </div>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

/**
 * A staff-entered field in English and Arabic side by side, for models that keep `<field>_ar` next
 * to `<field>` (products, classes, courses, machines, trainer and nutritionist profiles).
 * `form` holds both values; `onChange(key, value)` gets `field` or `field_ar`. Arabic is optional:
 * members reading in Arabic see the English until it is filled in.
 */
export function BiInput({ label, form, field, onChange, errors = {}, multiline = false, rows = 3, required = false,
  placeholder, maxLength, readOnly = false, hint, id, className = '', inputClassName = inputCls }) {
  const Tag = multiline ? 'textarea' : 'input';
  const err = errors[field];
  const errAr = errors[`${field}_ar`];
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={labelCls}>{label}{required && <span className="text-primary"> *</span>}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Tag
          id={id}
          className={`${inputClassName} ${err ? 'border-rose-500' : ''}`}
          value={form[field] ?? ''}
          rows={multiline ? rows : undefined}
          maxLength={maxLength}
          readOnly={readOnly}
          placeholder={placeholder || tl('English')}
          aria-label={`${label} (English)`}
          aria-invalid={!!err}
          onChange={(e) => onChange(field, e.target.value)}
        />
        <Tag
          className={`${inputClassName} text-right ${errAr ? 'border-rose-500' : ''}`}
          dir="rtl"
          lang="ar"
          value={form[`${field}_ar`] ?? ''}
          rows={multiline ? rows : undefined}
          maxLength={maxLength}
          readOnly={readOnly}
          placeholder="أدخل النص العربي"
          aria-label={`${label} (العربية)`}
          aria-invalid={!!errAr}
          onChange={(e) => onChange(`${field}_ar`, e.target.value)}
        />
      </div>
      {hint && <span className="text-[11px] text-on-surface-variant">{hint}</span>}
      {err && <span className="text-[11px] text-rose-400">{err}</span>}
      {errAr && <span className="text-[11px] text-rose-400" dir="auto">{errAr}</span>}
    </div>
  );
}

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Preview + upload/replace + reset.
 * onUpload(file) / onReset() return promises; `customized` = an upload exists.
 */
export function ImageUploader({ url, customized, onUpload, onReset, label = 'Image', aspect = 'aspect-[16/9]' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('Use a JPEG, PNG or WebP image.');
    if (file.size > MAX_BYTES) return setError('Image must be under 4 MB.');
    setError('');
    setBusy(true);
    try { await onUpload(file); } catch { /* caller toasts */ } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true);
    try { await onReset(); } catch { /* caller toasts */ } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>{label}</span>
      <div className={`relative ${aspect} w-full rounded overflow-hidden bg-[#131316] border border-[#1a1a1e]`}>
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center text-on-surface-variant text-[12px]">{tl("No image")}</div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center text-[11px] uppercase tracking-widest text-on-surface">
            {tl("Uploading…")}
          </div>
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
          customized ? 'bg-primary-container text-on-primary-container' : 'bg-black/60 text-on-surface-variant'
        }`}>
          {customized ? tl("Uploaded") : tl("Original")}
        </span>
      </div>
      <input ref={input} type="file" accept={TYPES.join(',')} className="hidden" onChange={pick} />
      <div className="flex gap-2">
        <button type="button" className={btn.ghost} disabled={busy} onClick={() => input.current?.click()}>
          {customized ? tl("Replace") : tl("Upload")}
        </button>
        {customized && onReset && (
          <button type="button" className={btn.ghost} disabled={busy} onClick={reset}>{tl("Use original")}</button>
        )}
      </div>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
      <span className="text-[10px] text-on-surface-variant/60">{tl("JPEG, PNG or WebP · under 4 MB")}</span>
    </div>
  );
}

/** Right-side drawer with Esc to close. */
export function Drawer({ open, title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed top-0 right-0 h-screen w-full max-w-3xl bg-[#0b0b0c] border-l border-[#1a1a1e] z-50 flex flex-col"
          >
            <div className="p-5 border-b border-[#1a1a1e] flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline-md text-[20px] text-on-surface uppercase tracking-wide">{title}</h3>
                {subtitle && <p className="text-[11px] text-on-surface-variant mt-1">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={tl("Close")}
                className="w-8 h-8 rounded bg-[#131316] hover:bg-rose-700/30 text-on-surface-variant grid place-items-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">{children}</div>
            {footer && <div className="p-4 border-t border-[#1a1a1e] flex justify-end gap-2">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function Empty({ children }) {
  return (
    <div className="text-center py-16 bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg text-on-surface-variant text-[13px]">
      {children}
    </div>
  );
}
