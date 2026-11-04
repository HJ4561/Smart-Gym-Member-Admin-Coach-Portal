// src/pages/member/Trainers.jsx
// Coaches members can book: who's taking clients, when they work, what they cost.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import { formatSAR } from '../../utils/money';
import { getLocalized, isAr, tl } from '../../i18n';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const SORTS = [['rating', 'Top rated'], ['price', 'Lowest price'], ['experience', 'Most experienced']];

/** availability on days 0,1,2,3,5 → "Mon–Thu, Sat" */
function workingDays(availability = []) {
  const days = [...new Set(availability.filter((a) => a.is_active !== false).map((a) => a.day_of_week))].sort();
  if (!days.length) return '';
  const names = isAr ? DAYS_AR : DAYS;
  const runs = [];
  days.forEach((d) => {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d; else runs.push([d, d]);
  });
  return runs.map(([a, b]) => (a === b ? names[a] : `${names[a]}–${names[b]}`)).join(isAr ? '، ' : ', ');
}

const initials = (name = '') => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function Trainers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState('all');            // all | open | verified
  const [specialty, setSpecialty] = useState('');
  const [sort, setSort] = useState('rating');
  const { data, loading } = useApi(() => catalogService.trainers(), []);
  const list = useMemo(() => (Array.isArray(data) ? data : data?.results || []), [data]);

  const specialties = useMemo(() => {
    const count = {};
    list.forEach((t) => (getLocalized(t, 'specialties') || []).forEach((s) => { count[s] = (count[s] || 0) + 1; }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s);
  }, [list]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = list.filter((t) => (show !== 'verified' || t.is_verified)
      && (show !== 'open' || (t.is_accepting_clients && t.offers_1on1))
      && (!specialty || (getLocalized(t, 'specialties') || []).includes(specialty))
      && (!q || `${t.user?.full_name} ${t.title} ${t.title_ar || ''} ${(t.specialties || []).join(' ')} ${(t.specialties_ar || []).join(' ')}`.toLowerCase().includes(q)));
    const by = {
      rating: (a, b) => (Number(b.rating) - Number(a.rating)) || (b.total_reviews - a.total_reviews),
      price: (a, b) => Number(a.hourly_rate) - Number(b.hourly_rate),
      experience: (a, b) => (b.years_experience || 0) - (a.years_experience || 0),
    }[sort];
    return [...rows].sort(by);
  }, [list, search, show, specialty, sort]);

  const open = list.filter((t) => t.is_accepting_clients && t.offers_1on1);
  const prices = open.map((t) => Number(t.hourly_rate)).filter((n) => n > 0);
  const stats = [
    [tl('Coaches'), list.length],
    [tl('Taking new clients'), open.length],
    [tl('Verified'), list.filter((t) => t.is_verified).length],
    [tl('Sessions from'), prices.length ? formatSAR(Math.min(...prices)) : '—'],
  ];

  return (
    <div className="w-full px-space-xl py-space-xl flex flex-col gap-6">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">sports</span>{tl('Personal training')}
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide">{tl('Trainers')}</h1>
        <p className="text-on-surface-variant max-w-2xl">
          {tl('Book a 1-on-1 session with a coach. Pick someone below to see their hours and choose a time.')}
        </p>
      </motion.header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-container px-4 py-3 border border-surface-container-high">
            <div className="text-[22px] font-bold text-on-surface leading-tight">{value}</div>
            <div className="text-[11px] uppercase tracking-widest text-on-surface-variant">{label}</div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest border border-surface-container-high p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-surface-container w-fit" role="tablist" aria-label={tl('Show')}>
            {[['all', 'All'], ['open', 'Taking clients'], ['verified', 'Verified']].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={show === id} onClick={() => setShow(id)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${
                  show === id ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {tl(label)}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={tl('Search trainers')}
              placeholder={tl('Search by name, title or specialty…')}
              className="w-full bg-surface-container text-on-surface text-[14px] ps-10 pe-3 py-2.5 rounded-lg border border-surface-container-high focus:outline-none focus:border-primary" />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-on-surface-variant">
            {tl('Sort')}
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="bg-surface-container text-on-surface text-[13px] rounded-lg border border-surface-container-high px-2 py-2">
              {SORTS.map(([id, label]) => <option key={id} value={id}>{tl(label)}</option>)}
            </select>
          </label>
        </div>
        {specialties.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {['', ...specialties].map((s) => (
              <button key={s || 'any'} type="button" onClick={() => setSpecialty(s)}
                className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${
                  specialty === s ? 'bg-primary-container/20 border-primary-container text-on-surface'
                    : 'border-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
                {s || tl('Any specialty')}
              </button>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl bg-surface-container animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">person_search</span>
          <p className="text-on-surface font-bold mt-3">{tl('No trainers found')}</p>
          <p className="text-on-surface-variant text-[14px]">{tl('Try a different search or filter.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {shown.map((t, i) => <TrainerCard key={t.id} t={t} index={i} onOpen={() => navigate(`/dashboard/trainers/${t.id}`)} />)}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TrainerCard({ t, index, onOpen }) {
  const name = t.user?.full_name || tl('Coach');
  const rated = t.total_reviews > 0;
  const days = workingDays(t.availability);
  const bookable = t.is_accepting_clients && t.offers_1on1;
  return (
    <motion.button type="button" layout onClick={onOpen}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.04 } }} exit={{ opacity: 0 }}
      className="group text-start rounded-xl bg-surface-container border border-surface-container-high hover:border-primary-container/60 overflow-hidden flex flex-col transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex gap-4 p-4">
        <div className="relative shrink-0">
          {t.photo_url
            ? <img src={t.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
            : <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest border border-primary-container/30 grid place-items-center text-[24px] font-bold text-primary">{initials(name)}</div>}
          <span className={`absolute -bottom-1 -end-1 w-4 h-4 rounded-full ring-2 ring-surface-container ${bookable ? 'bg-emerald-400' : 'bg-on-surface-variant/50'}`}
            title={bookable ? tl('Taking new clients') : tl('Not taking new clients')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[17px] text-on-surface truncate group-hover:text-primary transition-colors">{name}</h3>
            {t.is_verified && <span className="material-symbols-outlined text-primary text-[18px]" title={tl('Verified')} style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
          </div>
          <p className="text-[13px] text-on-surface-variant truncate">{getLocalized(t, 'title')}{getLocalized(t, 'credentials') ? ` · ${getLocalized(t, 'credentials')}` : ''}</p>
          <div className="flex items-center gap-3 mt-2 text-[12px] text-on-surface-variant">
            {rated ? (
              <span className="flex items-center gap-1 text-on-surface">
                <span className="material-symbols-outlined text-amber-400 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                {Number(t.rating).toFixed(1)} <span className="text-on-surface-variant">({t.total_reviews})</span>
              </span>
            ) : <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[11px]">{tl('New coach')}</span>}
            {t.years_experience > 0 && <span>{tl('{n} yrs experience', { n: t.years_experience })}</span>}
          </div>
        </div>
      </div>

      {(getLocalized(t, 'specialties') || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4">
          {getLocalized(t, 'specialties').slice(0, 4).map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px]">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-auto px-4 pt-4 pb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            <span className="truncate">{bookable ? (days || tl('Hours coming soon')) : tl('Not taking new clients')}</span>
          </div>
          <div className="text-on-surface font-bold text-[17px] mt-0.5">
            {t.offers_1on1 && Number(t.hourly_rate) > 0 ? formatSAR(t.hourly_rate) : '—'}
            <span className="text-[12px] font-normal text-on-surface-variant"> / {tl('session')}</span>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-container text-on-primary-container text-[12px] font-bold">
          {bookable ? tl('Book') : tl('View profile')}
          <span className="material-symbols-outlined text-[16px] rtl:rotate-180">arrow_forward</span>
        </span>
      </div>
    </motion.button>
  );
}
