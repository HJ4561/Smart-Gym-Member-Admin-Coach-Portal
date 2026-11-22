// src/pages/desk/DeskHome.jsx — the front desk's start page: today's numbers and the jobs it can do.
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/site/SiteUi';
import { btn, inputCls } from '../../components/site/siteStyles';
import { card, Page, Section, Skeleton, Tile } from '../coach/ui';
import { DESK_PAGES } from './deskPages';
import { tl } from '../../i18n';

export default function DeskHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [iqama, setIqama] = useState('');
  const { data, loading } = useApi(() => adminService.deskToday(), [], { poll: 20_000 });
  const mine = new Set(user?.modules || []);
  const pages = DESK_PAGES.filter((p) => mine.has(p.module));

  const tiles = [
    ['gate', tl('In the gym now'), data?.checked_in_now, 'fitness_center'],
    ['gate', tl('Check-ins today'), data?.check_ins_today, 'login'],
    ['gate', tl('First visits to check'), data?.first_visits_waiting, 'badge', 'text-amber-400'],
    ['registrations', tl('Signups waiting'), data?.signups_waiting, 'how_to_reg', 'text-amber-400'],
    ['walk_in', tl('Walk-ins today'), data?.walk_ins_today, 'person_add'],
    ['inbox', tl('New messages'), data?.messages_new, 'mail'],
    ['classes', tl('Classes today'), data?.classes_today, 'event'],
  ].filter(([m]) => mine.has(m));

  if (!pages.length) {
    return (
      <Page>
        <PageHeader title={tl('Front Desk')} />
        <Section>
          <p className="text-on-surface-variant text-[14px]">
            {tl('You don’t have any front-desk modules yet. Ask an admin to give you access in Team → your name.')}
          </p>
        </Section>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={tl('Today at the desk')} subtitle={tl('Scan passes, check first-time visitors, approve signups and add walk-ins.')} />
      {mine.has('gate') && (
        <form className={`${card} p-4 flex flex-col sm:flex-row gap-2`}
          onSubmit={(e) => { e.preventDefault(); if (iqama.trim()) navigate(`/desk/gate?iqama=${encodeURIComponent(iqama.trim())}`); }}>
          <input className={`${inputCls} flex-1 font-mono`} value={iqama} onChange={(e) => setIqama(e.target.value)}
            placeholder={tl('Iqama number or scan a pass…')} aria-label={tl('Iqama number or pass')} />
          <button type="submit" className={btn.primary}>{tl('Look up')}</button>
          <Link to="/desk/gate" className={btn.ghost}>{tl('Open scanner')}</Link>
        </form>
      )}
      {loading && !data ? <Skeleton rows={2} /> : tiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {tiles.map(([, label, value, icon, tone]) => <Tile key={label} label={label} value={value ?? 0} icon={icon} tone={tone} />)}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {pages.map((p) => (
          <Link key={p.path} to={p.path} className={`${card} p-4 flex items-center gap-3 hover:border-primary-container/60`}>
            <span className="material-symbols-outlined text-primary text-[26px]" aria-hidden="true">{p.icon}</span>
            <span className="text-on-surface font-bold">{p.label}</span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
