// src/pages/coach/CoachMore.jsx — the smaller coach pages: reviews, earnings, notifications, profile.
import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { coachService } from '../../services/coachService';
import { NOTIFICATIONS_CHANGED, notificationsService } from '../../services/notificationsService';
import { BiInput, Empty, ImageUploader, PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { Field } from '../../components/courses/CourseEditor';
import SaudiPhoneInput from '../../components/SaudiPhoneInput';
import SecuritySettings from '../../components/SecuritySettings';
import { formatSAR } from '../../utils/money';
import { errorMessage, fieldErrors } from '../../utils/apiError';
import { tl, locale } from '../../i18n';
import { card, Page, Section, Skeleton, Tile, LIVE_MS } from './ui';

// ------------------------------------------------------------------ reviews
export function CoachReviews() {
  const { data, loading } = useApi(() => coachService.reviews(), [], { poll: LIVE_MS });
  return (
    <Page>
      <PageHeader title={tl('Reviews')} subtitle={tl('What members say after training with you.')} />
      {loading && !data ? <Skeleton /> : (
        <>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Tile icon="star" label={tl('Average')} value={data?.total ? data.rating.toFixed(1) : '—'} tone="text-amber-300" />
            <Tile icon="reviews" label={tl('Reviews')} value={data?.total ?? 0} />
          </div>
          {!data?.reviews?.length ? <Empty>{tl('No reviews yet.')}</Empty> : (
            <ul className="flex flex-col gap-2">
              {data.reviews.map((r) => (
                <li key={r.id} className={`${card} p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-amber-300" aria-label={tl('{0} out of 5 stars', { 0: r.rating })}>{'★'.repeat(r.rating)}<span className="text-[#2a2a2e]">{'★'.repeat(5 - r.rating)}</span></span>
                    <span className="text-[11px] text-on-surface-variant">{r.member} · {new Date(r.created_at).toLocaleDateString(locale)}</span>
                  </div>
                  {r.comment && <p className="text-[13px] text-on-surface mt-2 break-words">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ earnings
export function CoachEarnings() {
  const { data, loading } = useApi(() => coachService.earnings(), [], { poll: LIVE_MS });
  const parts = [['sessions', tl('1-on-1 sessions'), 'event_available'], ['courses', tl('Courses'), 'school'],
    ['classes', tl('Classes'), 'event'], ['videos', tl('Machine videos'), 'smart_display']];
  const max = Math.max(1, ...(data?.by_month || []).map((m) => m.total));
  return (
    <Page>
      <PageHeader title={tl('Earnings')} subtitle={tl('What members paid for your sessions, courses, classes and videos. Payouts are arranged with the gym.')} />
      {loading && !data ? <Skeleton rows={2} h="h-24" /> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {parts.map(([k, label, icon]) => <Tile key={k} icon={icon} label={`${label} · ${tl('30 days')}`} value={formatSAR(data.last_30_days[k])} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title={tl('Last 6 months')} className="lg:col-span-2">
              <div className="flex items-end gap-3 h-48" role="img"
                aria-label={data.by_month.map((m) => `${m.month}: ${formatSAR(m.total)}`).join(', ')}>
                {data.by_month.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
                    <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{m.total ? Math.round(m.total) : ''}</span>
                    <div className="w-full max-w-[44px] rounded-t bg-primary-container" style={{ height: `${Math.max(2, (m.total / max) * 100)}%` }}
                      title={formatSAR(m.total)} />
                    <span className="text-[10px] text-on-surface-variant">
                      {new Date(`${m.month}-01`).toLocaleDateString(locale, { month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title={tl('All time')}>
              {parts.map(([k, label]) => (
                <div key={k} className="flex justify-between text-[13px]">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="text-on-surface font-bold">{formatSAR(data.all_time[k])}</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] border-t border-[#1a1a1e] pt-2">
                <span className="text-on-surface-variant">{tl('Total')}</span>
                <span className="text-emerald-400 font-bold">{formatSAR(data.all_time.total)}</span>
              </div>
            </Section>
          </div>
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ notifications
export function CoachNotifications() {
  const navigate = useNavigate();
  const { reloadUnread } = useOutletContext() || {};
  const { data, loading, refetch } = useApi(() => notificationsService.list(), [],
    { poll: 10_000, refreshOn: [NOTIFICATIONS_CHANGED] });
  const list = Array.isArray(data) ? data : [];
  const changed = () => { refetch(); reloadUnread?.(); };
  const open = async (n) => {
    if (!n.is_read) { try { await notificationsService.markRead(n.id); changed(); } catch { /* ignore */ } }
    if (n.action_path?.startsWith('/coach')) navigate(n.action_path);
  };
  return (
    <Page>
      <PageHeader title={tl('Notifications')} subtitle={tl('New students, bookings, course reviews and video sales.')}>
        <button type="button" className={btn.ghost} disabled={!list.some((n) => !n.is_read)}
          onClick={async () => { await notificationsService.markAllRead(); changed(); }}>{tl('Mark all read')}</button>
      </PageHeader>
      {loading && !data ? <Skeleton /> : list.length === 0 ? <Empty>{tl('Nothing yet.')}</Empty> : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)}
                className={`${card} w-full text-left p-4 flex gap-3 ${n.is_read ? 'opacity-70' : 'border-primary-container/40'}`}>
                <span className="material-symbols-outlined text-primary" aria-hidden="true">{n.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[14px] ${n.is_read ? 'text-on-surface' : 'text-on-surface font-bold'}`}>{n.title}</span>
                  <span className="block text-[13px] text-on-surface-variant break-words">{n.message}</span>
                  <span className="block text-[11px] text-on-surface-variant/70 mt-1">{new Date(n.created_at).toLocaleString(locale)}</span>
                </span>
                {n.action_label && n.action_path?.startsWith('/coach') && (
                  <span className="text-primary text-[12px] font-bold self-center whitespace-nowrap">{n.action_label} →</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ profile + security
export function CoachProfile() {
  const { data, refetch } = useApi(() => coachService.me(), [], { poll: LIVE_MS });
  return (
    <Page>
      <PageHeader title={tl('Profile & security')} subtitle={tl('What members see when they choose a coach, and how you sign in.')} />
      {!data ? <Skeleton rows={2} h="h-40" /> : <ProfileForm me={data} onSaved={refetch} />}
      <SecuritySettings />
    </Page>
  );
}

function ProfileForm({ me, onSaved }) {
  const [f, setF] = useState(() => ({ ...me, specialties: (me.specialties || []).join(', '),
    specialties_ar: (me.specialties_ar || []).join('، ') }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const row = await coachService.updateMe({
        first_name: f.first_name, last_name: f.last_name, phone: f.phone || '', title: f.title, title_ar: f.title_ar || '',
        credentials: f.credentials, credentials_ar: f.credentials_ar || '', bio: f.bio, bio_ar: f.bio_ar || '',
        specialties: f.specialties, specialties_ar: f.specialties_ar || '', years_experience: f.years_experience,
      });
      setF({ ...row, specialties: row.specialties.join(', '), specialties_ar: (row.specialties_ar || []).join('، ') });
      toast.success(tl('Profile saved'));
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, tl('Could not save')));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file) => {
    try {
      const row = await coachService.uploadPhoto(file);
      setF((p) => ({ ...p, photo_url: row.photo_url }));
      toast.success(tl('Photo updated'));
    } catch (err) {
      toast.error(errorMessage(err, tl('Upload failed')));
      throw err;
    }
  };
  return (
    <Section title={tl('Public profile')}
      action={<span className="text-[11px] text-on-surface-variant">{me.is_verified ? tl('✓ Verified by the gym') : tl('Not verified yet')}</span>}>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <ImageUploader label={tl('Photo')} aspect="aspect-square" url={f.photo_url} customized={!!f.photo_url} onUpload={upload} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={tl('First name')} error={errors.first_name}><input className={inputCls} value={f.first_name} onChange={set('first_name')} /></Field>
          <Field label={tl('Last name')} error={errors.last_name}><input className={inputCls} value={f.last_name} onChange={set('last_name')} /></Field>
          <Field label={tl('Phone')} error={errors.phone}><SaudiPhoneInput value={f.phone} onChange={(phone) => setF((p) => ({ ...p, phone }))} /></Field>
          <Field label={tl('Years of experience')} error={errors.years_experience}>
            <input className={inputCls} type="number" min="0" max="60" value={f.years_experience} onChange={set('years_experience')} /></Field>
          <BiInput label={tl('Title')} form={f} field="title" errors={errors} required maxLength={120} className="sm:col-span-2"
            placeholder={tl('e.g. Strength & Conditioning Coach')} onChange={(k, v) => set(k)(v)} />
          <BiInput label={tl('Credentials')} form={f} field="credentials" errors={errors} maxLength={200} className="sm:col-span-2"
            placeholder="CSCS, NASM-CPT" onChange={(k, v) => set(k)(v)} />
          <BiInput label={tl('Specialties (comma separated)')} form={f} field="specialties" errors={errors} className="sm:col-span-2"
            placeholder={tl('Strength, Mobility, Fat loss')} onChange={(k, v) => set(k)(v)} />
          <BiInput label={tl('About you')} form={f} field="bio" errors={errors} multiline rows={4} className="sm:col-span-2"
            onChange={(k, v) => set(k)(v)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" className={btn.primary} disabled={busy} onClick={save}>{busy ? tl('Saving…') : tl('Save profile')}</button>
      </div>
    </Section>
  );
}
