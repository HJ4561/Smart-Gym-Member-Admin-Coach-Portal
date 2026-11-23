// src/pages/coach/CoachClasses.jsx — group classes the coach teaches: upcoming and past dates, who's booked,
// and messages or videos for the class (a message reaches members at once; a video after an admin approves it).
// The gym sets the timetable and prices (admin → Classes).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useListState';
import { coachService } from '../../services/coachService';
import { Drawer, Empty, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls, labelCls } from '../../components/site/siteStyles';
import VideoPlayer from '../../components/common/VideoPlayer';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { formatSAR } from '../../utils/money';
import { tl, locale } from '../../i18n';
import { card, Chip, Page, Skeleton, Tabs, LIVE_MS } from './ui';

const DAYS = [tl('Monday'), tl('Tuesday'), tl('Wednesday'), tl('Thursday'), tl('Friday'), tl('Saturday'), tl('Sunday')];
const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

function Post({ p, onDelete }) {
  return (
    <div className="flex flex-col gap-2 bg-[#0a0a0c] border border-[#1a1a1e] rounded-lg p-3 min-w-0">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">{p.kind === 'video' ? 'smart_display' : 'campaign'}</span>
        <span className="text-on-surface font-bold truncate flex-1">{p.title}</span>
        {p.approval_status === 'pending' && <Chip tone="bg-amber-500/15 text-amber-300">{tl('Waiting for approval')}</Chip>}
        {p.approval_status === 'rejected' && <Chip tone="bg-rose-500/15 text-rose-300">{tl('Not approved')}</Chip>}
        <button type="button" className="text-on-surface-variant hover:text-rose-400" onClick={() => onDelete(p)} aria-label={tl('Delete')}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
        </button>
      </div>
      {p.kind === 'video' && <VideoPlayer url={p.video_url} thumbnail={p.thumbnail_url} />}
      {p.body && <p className="text-[12px] text-on-surface-variant whitespace-pre-line break-words">{p.body}</p>}
      <div className="text-[10px] text-on-surface-variant/70">{new Date(p.created_at).toLocaleString(locale)}</div>
    </div>
  );
}

export default function CoachClasses() {
  const [scope, setScope] = useState('upcoming');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data, loading, refetch } = useApi(() => coachService.classes(scope, { q: search || undefined }), [scope, search],
    { poll: LIVE_MS });
  const [open, setOpen] = useState(null);
  const [compose, setCompose] = useState(null);       // {cls, date?}
  const list = Array.isArray(data) ? data : [];

  const remove = async (cls, p) => {
    if (!window.confirm(tl('Delete “{0}”? Members won’t see it any more.', { 0: p.title }))) return;
    try { await coachService.deleteClassPost(cls.id, p.id); toast.success(tl('Deleted')); refetch(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <Page>
      <PageHeader title={tl('My classes')} subtitle={tl('The group classes you teach. Send the class a message or a video for one date or for every week. The gym sets times, rooms and prices.')} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={scope} onChange={(v) => { setScope(v); setOpen(null); }} options={[['upcoming', tl('Upcoming')], ['past', tl('Past')]]} />
        <div className="flex-1" />
        <input className={`${inputCls} sm:w-64`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tl('Search classes…')} aria-label={tl('Search classes')} />
      </div>
      {loading && !data ? <Skeleton rows={3} h="h-24" /> : list.length === 0 ? (
        <Empty>{scope === 'upcoming' ? tl('You don’t teach any classes yet.') : tl('No past classes yet.')}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(({ class: c, roster, dates, posts }) => {
            const expanded = open === c.id;
            return (
              <section key={c.id} className={`${card} p-4 flex flex-col gap-3 ${c.is_active ? '' : 'opacity-60'}`}>
                <button type="button" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}
                  className="flex flex-col md:flex-row md:items-center gap-2 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-on-surface font-bold flex flex-wrap items-center gap-2">
                      {c.name}
                      {!c.is_active && <Chip tone="bg-rose-500/15 text-rose-400">{tl('Paused')}</Chip>}
                      {c.is_paid && <Chip tone="bg-amber-500/15 text-amber-300">{tl('Paid')}</Chip>}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      {DAYS[c.day_of_week]} · {c.start_time}–{c.end_time}{c.location && ` · ${c.location}`}
                      {dates[0] && ` · ${scope === 'upcoming' ? tl('next {0}', { 0: day(dates[0].date) }) : tl('last {0}', { 0: day(dates[0].date) })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    {c.is_paid && <span className="text-on-surface-variant">{formatSAR(c.price_per_session)} {tl('/ session')}</span>}
                    <span className="text-on-surface font-bold">{tl('{0}/{1} booked', { 0: c.booked, 1: c.capacity })}</span>
                    {c.waitlisted > 0 && <span className="text-amber-300">{tl('{0} waiting', { 0: c.waitlisted })}</span>}
                    <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">{expanded ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-4 border-t border-[#1a1a1e] pt-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btn.primary} onClick={() => setCompose({ cls: c })}>{tl('Message or video for the class')}</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                      <div className="flex flex-col gap-3">
                        <h3 className={labelCls}>{scope === 'upcoming' ? tl('Next dates') : tl('Past dates')}</h3>
                        {dates.map((d) => (
                          <div key={d.date} className="border border-[#1a1a1e] rounded-lg p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-[13px]">
                              <span className="text-on-surface font-bold flex-1">{day(d.date)} · {c.start_time}</span>
                              {c.is_paid && <span className="text-on-surface-variant text-[12px]">{tl('{0} drop-ins', { 0: d.drop_ins })}</span>}
                              <button type="button" className={btn.ghost} onClick={() => setCompose({ cls: c, date: d.date })}>{tl('Send for this date')}</button>
                            </div>
                            {d.posts.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{d.posts.map((p) => <Post key={p.id} p={p} onDelete={(x) => remove(c, x)} />)}</div>}
                          </div>
                        ))}
                        {posts.length > 0 && (
                          <>
                            <h3 className={labelCls}>{tl('For every week')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{posts.map((p) => <Post key={p.id} p={p} onDelete={(x) => remove(c, x)} />)}</div>
                          </>
                        )}
                      </div>
                      <div>
                        <h3 className={`${labelCls} mb-2`}>{tl('Every week')}</h3>
                        {roster.length === 0 ? <p className="text-[12px] text-on-surface-variant">{tl('Nobody yet.')}</p> : (
                          <ul className="flex flex-col gap-1 text-[13px]">
                            {roster.map((r) => (
                              <li key={r.id} className="flex justify-between gap-2">
                                <span className="text-on-surface truncate">{r.name}</span>
                                {r.status === 'waitlist' && <span className="text-amber-300 text-[11px]">{tl('waitlist')}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {compose && <Composer cls={compose.cls} date={compose.date} onClose={() => setCompose(null)} onSent={() => { setCompose(null); refetch(); }} />}
    </Page>
  );
}

function Composer({ cls, date, onClose, onSent }) {
  const [f, setF] = useState({ kind: 'message', title: '', body: '', video_url: '' });
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const send = async () => {
    setBusy(true);
    setErrors({});
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => form.append(k, v));
    if (date) form.append('for_date', date);
    if (image) form.append('image', image);
    try {
      const res = await coachService.addClassPost(cls.id, form);
      toast.success(tl(res.detail), { duration: 5000 });
      onSent();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not send')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open title={cls.name} subtitle={date ? tl('For the class on {0}', { 0: day(date) }) : tl('For every week of this class')} onClose={onClose}
      footer={<><div className="flex-1" /><button type="button" className={btn.ghost} onClick={onClose}>{tl('Cancel')}</button>
        <button type="button" className={btn.primary} disabled={busy} onClick={send}>
          {busy ? tl('Sending…') : f.kind === 'video' ? tl('Send for approval') : tl('Send to the class')}</button></>}>
      <div className="flex gap-2" role="radiogroup" aria-label={tl('What to send')}>
        {[['message', tl('Message'), 'campaign'], ['video', tl('Video'), 'smart_display']].map(([v, l, icon]) => (
          <button key={v} type="button" role="radio" aria-checked={f.kind === v} onClick={() => setF((p) => ({ ...p, kind: v }))}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded border text-[12px] font-bold uppercase tracking-wider ${f.kind === v ? 'border-primary-container bg-primary-container/15 text-on-surface' : 'border-[#1a1a1e] text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>{l}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-on-surface-variant">
        {f.kind === 'video' ? tl('An admin checks videos first; the class is told once it’s approved.') : tl('Everyone booked is notified straight away.')}
      </p>
      <label className="flex flex-col gap-1"><span className={labelCls}>{tl('Title')}</span>
        <input className={inputCls} value={f.title} onChange={set('title')} maxLength={120} />
        {errors.title && <span className="text-[11px] text-rose-400">{tl(errors.title)}</span>}</label>
      {f.kind === 'video' && (
        <>
          <label className="flex flex-col gap-1"><span className={labelCls}>{tl('Video link (YouTube, Vimeo or a file)')}</span>
            <input className={inputCls} value={f.video_url} onChange={set('video_url')} placeholder="https://" />
            {errors.video_url && <span className="text-[11px] text-rose-400">{tl(errors.video_url)}</span>}</label>
          {f.video_url.startsWith('https://') && <VideoPlayer url={f.video_url} title={f.title} />}
          <label className="flex flex-col gap-1"><span className={labelCls}>{tl('Thumbnail (optional — YouTube links get one automatically)')}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-[12px] text-on-surface-variant" />
            {errors.image && <span className="text-[11px] text-rose-400">{tl(errors.image)}</span>}</label>
        </>
      )}
      <label className="flex flex-col gap-1"><span className={labelCls}>{f.kind === 'video' ? tl('Note (optional)') : tl('Message')}</span>
        <textarea className={inputCls} rows={5} value={f.body} onChange={set('body')} maxLength={2000} />
        {errors.body && <span className="text-[11px] text-rose-400">{tl(errors.body)}</span>}</label>
    </Drawer>
  );
}
