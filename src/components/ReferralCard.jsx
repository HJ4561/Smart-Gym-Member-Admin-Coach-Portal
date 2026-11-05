// src/components/ReferralCard.jsx
// Member dashboard card: the member's referral link (the website's signup page with their code),
// a copy / share button, and how many people joined with it. The gym credits the reward when it
// approves the new member's signup.
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { membersService } from '../services/membersService';
import { LOCKER_CREDIT_ENABLED } from '../config/features';
import { tl } from '../i18n';

export default function ReferralCard() {
  const { data, loading, error } = useApi(() => membersService.referral(), [], { showError: false });
  const [copied, setCopied] = useState(false);

  if (loading) return <div className="h-[132px] rounded-lg bg-surface-container animate-pulse" aria-hidden="true" />;
  if (error || !data) return null;

  const reward = Number(data.reward).toFixed(0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      toast.success(tl('Link copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tl('Could not copy — select the link and copy it.'));
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Smart Gym', text: tl('Join me at Smart Gym'), url: data.link });
    } catch { /* closed the share sheet */ }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg p-space-lg shadow-md bg-surface-container flex flex-col gap-space-md"
      aria-label={tl('Invite a friend')}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-primary-container text-[28px]">redeem</span>
          <div className="flex flex-col gap-space-2xs">
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">{tl('Invite a friend')}</span>
            <span className="font-body-md text-on-surface">
              {tl('Get SAR {0} locker credit when a friend joins with your link.', { 0: reward })}
              {!LOCKER_CREDIT_ENABLED && <>{' '}{tl('It’s saved for you and ready when locker credit launches.')}</>}
            </span>
          </div>
        </div>
        <div className="flex gap-space-lg shrink-0">
          <div className="flex flex-col">
            <span className="font-headline-md text-[24px] leading-none text-on-surface tabular-nums">{data.joined}</span>
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">{tl('Joined')}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-[24px] leading-none text-on-surface tabular-nums">{Number(data.earned).toFixed(0)}</span>
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">{tl('SAR earned')}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-space-sm">
        <input readOnly value={data.link} dir="ltr" aria-label={tl('Your referral link')} onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 bg-surface-container-high rounded px-3 py-2 font-mono text-[13px] text-on-surface" />
        <div className="flex gap-space-sm">
          <button type="button" onClick={copy}
            className="px-4 py-2 rounded bg-primary-container text-on-primary-container font-bold text-[12px] uppercase tracking-wider">
            {copied ? tl('Copied') : tl('Copy link')}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" onClick={share}
              className="px-4 py-2 rounded bg-surface-container-high text-on-surface font-bold text-[12px] uppercase tracking-wider">
              {tl('Share')}
            </button>
          )}
        </div>
      </div>
      <span className="text-[12px] text-on-surface-variant">
        {tl('Your code: {0} · The credit arrives once the gym approves their membership.', { 0: data.code })}
      </span>
    </motion.section>
  );
}
