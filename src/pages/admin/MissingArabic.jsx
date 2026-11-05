// src/pages/admin/MissingArabic.jsx
// Everything that has English text but no Arabic yet (products, courses, trainers, plans, website texts…),
// grouped by kind, with a link to the page where it is edited. Same list as `manage.py list_missing_arabic`.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminService';
import { Empty, PageHeader } from '../../components/site/SiteUi';
import { btn } from '../../components/site/siteStyles';
import { isAr, tl } from '../../i18n';

export default function MissingArabic() {
  const { data, loading, refetch } = useApi(() => adminService.missingArabic(), []);
  const [openKey, setOpenKey] = useState(null);
  const groups = (data?.groups || []).filter((g) => g.count > 0);
  const ar = isAr;

  return (
    <div className="p-6 md:p-8">
      <PageHeader title={tl('Missing Arabic')}
        subtitle={tl('Everything with English text but no Arabic yet. Arabic readers see the English until it is filled in. Open each one and add the Arabic next to the English.')}>
        <button type="button" className={btn.ghost} onClick={refetch}>{tl('Refresh')}</button>
      </PageHeader>

      {loading && !data ? <Empty>{tl('Loading…')}</Empty> : !groups.length ? (
        <Empty>
          <span className="material-symbols-outlined text-emerald-400 text-[32px] block mb-2">task_alt</span>
          {tl('Everything has Arabic.')}
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-on-surface-variant text-[13px]">
            {tl('{0} records still need Arabic.', { 0: data.total })}
          </p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <button key={g.key} type="button" onClick={() => setOpenKey(openKey === g.key ? null : g.key)}
                className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${openKey === g.key
                  ? 'bg-primary-container text-on-primary-container' : 'bg-[#131316] text-on-surface-variant hover:text-on-surface'}`}>
                {ar ? g.label_ar : tl(g.label)} · {g.count}
              </button>
            ))}
          </div>
          {groups.filter((g) => !openKey || g.key === openKey).map((g) => (
            <section key={g.key} className="bg-[#0e0e0f] border border-[#1a1a1e] rounded-lg overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1e]">
                <h2 className="text-on-surface font-bold uppercase tracking-wider text-[12px]">{ar ? g.label_ar : tl(g.label)}</h2>
                <span className="text-on-surface-variant text-[12px]">{g.count}</span>
              </header>
              <ul>
                {g.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a1e] last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-on-surface text-[13px] truncate" dir="auto">{item.name}</div>
                      <div className="text-on-surface-variant text-[11px]">
                        {tl('Missing:')}{' '}{item.fields.map((f) => tl(FIELD_LABELS[f] || f)).join(', ')}
                      </div>
                    </div>
                    {item.link ? (
                      <Link to={item.link} className={btn.ghost}>{tl('Open')}</Link>
                    ) : item.edit_url ? (
                      <a href={item.edit_url} target="_blank" rel="noreferrer" className={btn.ghost}
                        title={tl('Edited in the Django admin')}>{tl('Open')} ↗</a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-on-surface-variant text-[11px]">
            {tl('Items marked ↗ open in the Django admin (the backend’s own admin pages), where the Arabic fields sit next to the English ones.')}
          </p>
        </div>
      )}
    </div>
  );
}

const FIELD_LABELS = {
  name: 'Name', title: 'Title', subtitle: 'Subtitle', description: 'Description', bio: 'Bio', credentials: 'Credentials',
  specialties: 'Specialties', location: 'Room', price_note: 'Price note', badge_top: 'Badge',
  badge_secondary: 'Second badge', telemetry: 'Key facts', stock_label: 'Stock note', display_name: 'Name',
  features: 'Features', tier: 'Tier', reward_value: 'Reward', excerpt: 'Summary', content: 'Content', text: 'Text',
};
