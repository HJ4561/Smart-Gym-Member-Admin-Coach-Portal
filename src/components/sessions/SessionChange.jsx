// src/components/sessions/SessionChange.jsx — delay, move or edit a scheduled 1-on-1 (coach portal and admin).
// `change(body)` sends {delay_minutes | scheduled_at, duration_minutes, focus_area, notes, reason}; the member is told.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Drawer } from '../site/SiteUi';
import { btn, inputCls, labelCls } from '../site/siteStyles';
import { Tabs } from '../../pages/coach/ui';
import { formatGymDateTime } from '../../utils/gymTime';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl } from '../../i18n';

/** Local "YYYY-MM-DDTHH:MM" for a datetime-local input. */
const localInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SessionChange({ s, change, onClose, onSaved }) {
  const [mode, setMode] = useState('delay');         // delay | move | edit
  const [delay, setDelay] = useState(15);
  const [when, setWhen] = useState(localInput(s.scheduled_at));
  const [f, setF] = useState({ duration_minutes: s.duration_minutes, focus_area: s.focus_area || '', notes: s.notes || '', reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { ...f };
    if (mode === 'delay') body.delay_minutes = delay;
    if (mode === 'move') body.scheduled_at = new Date(when).toISOString();
    try {
      await change(body);
      toast.success(mode === 'edit' ? tl('Session updated') : tl('Session moved — {0} has been told', { 0: s.member.name }));
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not change the session')));
    } finally {
      setBusy(false);
    }
  };
  const err = (k) => errors[k] && <span className="text-[11px] text-rose-400">{tl(errors[k])}</span>;
  return (
    <Drawer open title={s.member.name} subtitle={formatGymDateTime(s.scheduled_at)} onClose={onClose}
      footer={<><div className="flex-1" /><button type="button" className={btn.ghost} onClick={onClose}>{tl('Close')}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl('Saving…') : tl('Save and tell the member')}</button></>}>
      <Tabs value={mode} onChange={setMode} options={[['delay', tl('Delay')], ['move', tl('Move')], ['edit', tl('Edit details')]]} />
      {mode === 'delay' && (
        <div className="flex flex-col gap-2">
          <span className={labelCls}>{tl('Start later by')}</span>
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 30, 45, 60].map((m) => (
              <button key={m} type="button" onClick={() => setDelay(m)}
                className={`px-3 py-2 rounded border text-[12px] font-bold ${delay === m ? 'border-primary-container bg-primary-container/15 text-on-surface' : 'border-[#1a1a1e] text-on-surface-variant'}`}>
                {tl('{0} min', { 0: m })}</button>
            ))}
          </div>
          {err('delay_minutes')}{err('scheduled_at')}
        </div>
      )}
      {mode === 'move' && (
        <label className="flex flex-col gap-1"><span className={labelCls}>{tl('New date and time')}</span>
          <input className={inputCls} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          {err('scheduled_at')}
          <span className="text-[11px] text-on-surface-variant">{tl('It has to be free in your calendar. Agree the new time with the member first if you can.')}</span>
        </label>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className={labelCls}>{tl('Length (minutes)')}</span>
          <input className={inputCls} type="number" min="15" max="240" value={f.duration_minutes} onChange={set('duration_minutes')} />{err('duration_minutes')}</label>
        <label className="flex flex-col gap-1"><span className={labelCls}>{tl('Focus')}</span>
          <input className={inputCls} value={f.focus_area} onChange={set('focus_area')} maxLength={120} /></label>
        <label className="flex flex-col gap-1 md:col-span-2"><span className={labelCls}>{tl('Notes')}</span>
          <textarea className={inputCls} rows={3} value={f.notes} onChange={set('notes')} /></label>
        <label className="flex flex-col gap-1 md:col-span-2"><span className={labelCls}>{tl('Reason (sent to the member)')}</span>
          <input className={inputCls} value={f.reason} onChange={set('reason')} maxLength={300} placeholder={tl('e.g. Running late from the previous session')} /></label>
      </div>
    </Drawer>
  );
}
