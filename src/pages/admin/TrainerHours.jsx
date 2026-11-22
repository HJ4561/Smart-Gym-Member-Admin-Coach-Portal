// src/pages/admin/TrainerHours.jsx
// Weekly 1:1 booking hours, hourly rate and booking switches per trainer, plus the
// sessions members have booked (mark completed / no-show, or cancel with refund).
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { opsService as api } from '../../services/opsService';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import { formatGymDateTime } from '../../utils/gymTime';
import { tl } from '../../i18n';
import SessionChange from '../../components/sessions/SessionChange';
import { matches } from '../../hooks/useListState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];   // 0 = Monday

const summary = (windows) => {
  if (!windows.length) return 'No booking hours';
  const byDay = DAYS.map((d, i) => [d.slice(0, 3), windows.filter((w) => w.day_of_week === i)]).filter(([, w]) => w.length);
  return byDay.map(([d, w]) => `${d} ${w.map((x) => `${x.start_time}–${x.end_time}`).join(', ')}`).join(' · ');
};

export default function TrainerHours() {
  const [tab, setTab] = useState('hours');
  const [trainers, setTrainers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [scope, setScope] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);     // { id, name, hourly_rate, is_accepting_clients, offers_1on1, windows }
  const [changing, setChanging] = useState(null);   // a session being moved / delayed / edited
  const [q, setQ] = useState('');
  const [state, setState] = useState('');            // session status filter
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  const quiet = useRef(false);                 // background refresh: no loading state, no error toast
  useAutoRefresh(() => { quiet.current = true; load(); }, 30_000);
  useEffect(() => {
    let alive = true;
    const background = quiet.current;
    quiet.current = false;
    (async () => {
      if (!background) setLoading(true);
      try {
        const [t, s] = await Promise.all([api.trainerHours(), api.trainerSessions({ scope })]);
        if (!alive) return;
        setTrainers(t);
        setSessions(s);
      } catch (err) { if (!background) toast.error(errorMessage(err)); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [scope, version]);

  const edit = (t) => {
    setErrors({});
    setEditing({ ...t, windows: t.windows.map((w) => ({ ...w })) });
  };
  const setW = (i, patch) => setEditing((e) => ({ ...e, windows: e.windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) }));
  const addW = (day) => setEditing((e) => ({ ...e, windows: [...e.windows, { day_of_week: day, start_time: '09:00', end_time: '12:00' }] }));
  const delW = (i) => setEditing((e) => ({ ...e, windows: e.windows.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.saveTrainerHours(editing.id, {
        hourly_rate: editing.hourly_rate,
        is_accepting_clients: editing.is_accepting_clients,
        offers_1on1: editing.offers_1on1,
        windows: editing.windows.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time })),
      });
      toast.success(tl("{0} saved", { 0: editing.name }));
      setEditing(null);
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl("Fix the highlighted hours")));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (s, status) => {
    const msg = status === 'cancelled'
      ? `Cancel ${s.member.name}'s session? SAR ${s.amount_charged} goes back to their locker credit.`
      : `Mark this session as ${status === 'no_show' ? 'a no-show' : 'completed'}?`;
    if (!window.confirm(msg)) return;
    try {
      await api.setSessionStatus(s.id, status);
      toast.success(tl("Updated"));
      load();
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <PageHeader
        title={tl("Trainer Hours")}
        subtitle={tl("Weekly hours members can book 1:1 sessions in (60-minute slots, gym local time), each trainer's hourly rate, and the sessions booked so far.")}
      />

      <div className="flex gap-1 mb-5" role="tablist">
        {[['hours', tl("Booking hours")], ['sessions', tl("Booked sessions")]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${tab === id ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input className={`${inputCls} md:w-72`} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'hours' ? tl('Search coaches…') : tl('Search coach, member or focus…')} aria-label={tl('Search')} />
        {tab === 'sessions' && (
          <select className={`${inputCls} md:w-48`} value={state} onChange={(e) => setState(e.target.value)} aria-label={tl('Status')}>
            <option value="">{tl('Any status')}</option>
            {['scheduled', 'completed', 'no_show', 'cancelled'].map((v) => <option key={v} value={v}>{tl(v)}</option>)}
          </select>
        )}
      </div>

      {loading ? <Empty>{tl("Loading…")}</Empty> : tab === 'hours' ? (
        !trainers.length ? <Empty>{tl("No trainers yet.")}</Empty> : (
          <div className="flex flex-col gap-2">
            {trainers.filter((t) => matches(t, q, ['name', 'user_name', 'email', 'title'])).map((t) => (
              <div key={t.id} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-on-surface font-bold">{t.name} <span className="text-on-surface-variant font-normal text-[12px]">· {t.title}</span></div>
                  <div className="text-[12px] text-on-surface-variant">{summary(t.windows)}</div>
                  <div className="text-[11px] mt-1 flex gap-2 flex-wrap">
                    <span className="text-on-surface">{tl("SAR")}{' '}{t.hourly_rate} / hour</span>
                    {!t.is_accepting_clients && <span className="text-amber-300">{tl("Not accepting clients")}</span>}
                    {!t.offers_1on1 && <span className="text-amber-300">{tl("No 1:1")}</span>}
                    <span className="text-on-surface-variant">{t.upcoming_sessions}{' '}{tl("upcoming session")}{t.upcoming_sessions === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <button type="button" className={btn.primary} onClick={() => edit(t)}>{tl("Edit hours")}</button>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex gap-1 mb-3">
            {[['upcoming', tl("Upcoming")], ['past', tl("Past")]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setScope(id)}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${scope === id ? 'bg-[#1a1a1e] text-on-surface' : 'text-on-surface-variant'}`}>{label}</button>
            ))}
          </div>
          {!sessions.length ? <Empty>{tl("No sessions.")}</Empty> : (
            <div className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-[#1a1a1e]">
                    <th className="p-3">{tl("When")}</th><th className="p-3">{tl("Trainer")}</th><th className="p-3">{tl("Member")}</th>
                    <th className="p-3">{tl("Focus")}</th><th className="p-3">{tl("Status")}</th><th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.filter((s) => (!state || s.status === state)
                    && matches(s, q, [(x) => x.trainer?.name, (x) => x.member?.name, (x) => x.member?.email, 'focus_area', 'notes'])).map((s) => (
                    <tr key={s.id} className="border-b border-[#1a1a1e] last:border-0">
                      <td className="p-3 text-on-surface">{formatGymDateTime(s.scheduled_at)}</td>
                      <td className="p-3 text-on-surface">{s.trainer.name}</td>
                      <td className="p-3"><div className="text-on-surface">{s.member.name}</div><div className="text-[11px] text-on-surface-variant">{s.member.email}</div></td>
                      <td className="p-3 text-on-surface-variant">{s.focus_area || '—'}{s.notes && <div className="text-[11px]">{s.notes}</div>}</td>
                      <td className="p-3 text-on-surface-variant uppercase text-[11px] font-bold">{s.status.replace('_', ' ')}</td>
                      <td className="p-3 text-right">
                        {s.status === 'scheduled' && (
                          <div className="flex gap-1 justify-end flex-wrap">
                            <button type="button" className={btn.primary} onClick={() => setStatus(s, 'completed')}>{tl("Completed")}</button>
                            <button type="button" className={btn.ghost} onClick={() => setStatus(s, 'no_show')}>{tl("No-show")}</button>
                            <button type="button" className={btn.ghost} onClick={() => setChanging(s)}>{tl("Delay / move / edit")}</button>
                            <button type="button" className={btn.danger} onClick={() => setStatus(s, 'cancelled')}>{tl("Cancel")}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {changing && <SessionChange s={changing} change={(body) => api.changeSession(changing.id, body)}
        onClose={() => setChanging(null)} onSaved={() => { setChanging(null); setVersion((v) => v + 1); }} />}
      <Drawer
        open={!!editing}
        title={editing ? tl("{0} — booking hours", { 0: editing.name }) : ''}
        subtitle={tl("Members can book 60-minute slots inside these hours.")}
        onClose={() => setEditing(null)}
        footer={<button type="button" className={btn.primary} disabled={saving} onClick={save}>{saving ? tl("Saving…") : tl("Save")}</button>}
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelCls}>{tl("Hourly rate (SAR)")}</span>
                <input className={inputCls} inputMode="decimal" value={editing.hourly_rate}
                  onChange={(e) => setEditing({ ...editing, hourly_rate: e.target.value })} />
                {errors.hourly_rate && <span className="text-rose-400 text-[11px]">{errors.hourly_rate}</span>}
              </label>
              <Toggle label={tl("Accepting clients")} on={editing.is_accepting_clients} onChange={(v) => setEditing({ ...editing, is_accepting_clients: v })} />
              <Toggle label={tl("Offers 1:1")} on={editing.offers_1on1} onChange={(v) => setEditing({ ...editing, offers_1on1: v })} />
            </div>

            {DAYS.map((day, d) => {
              const rows = editing.windows.map((w, i) => [w, i]).filter(([w]) => w.day_of_week === d);
              return (
                <div key={day} className="flex flex-col gap-2 border-t border-[#1a1a1e] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface font-bold text-[13px]">{day}</span>
                    <button type="button" className={btn.ghost} onClick={() => addW(d)}>{tl("+ Add hours")}</button>
                  </div>
                  {!rows.length && <span className="text-[12px] text-on-surface-variant">{tl("Not bookable")}</span>}
                  {rows.map(([w, i]) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" className={`${inputCls} w-32`} value={w.start_time} aria-label={tl("{0} start", { 0: day })}
                        onChange={(e) => setW(i, { start_time: e.target.value })} />
                      <span className="text-on-surface-variant">to</span>
                      <input type="time" className={`${inputCls} w-32`} value={w.end_time} aria-label={tl("{0} end", { 0: day })}
                        onChange={(e) => setW(i, { end_time: e.target.value })} />
                      <button type="button" className={btn.ghost} onClick={() => delW(i)} aria-label={tl("Remove")}>✕</button>
                      {errors[`windows.${i}`] && <span className="text-rose-400 text-[11px]">{errors[`windows.${i}`]}</span>}
                    </div>
                  ))}
                  {errors[`day.${d}`] && <span className="text-rose-400 text-[11px]">{errors[`day.${d}`]}</span>}
                </div>
              );
            })}
            <p className="text-[11px] text-on-surface-variant">{tl("Changing hours never cancels sessions that are already booked.")}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={labelCls}>{label}</span>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className={`px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider ${on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1a1a1e] text-on-surface-variant'}`}>
        {on ? tl("Yes") : tl("No")}
      </button>
    </div>
  );
}
