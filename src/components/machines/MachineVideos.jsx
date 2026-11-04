// src/components/machines/MachineVideos.jsx
// A machine's videos in the Machine Guide. Basic = free for everyone; Advanced / Premium are
// included with some membership plans or unlocked one by one (paid with card or locker credit).
// The server never sends the link of a locked video.
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { workoutsService } from '../../services/workoutsService';
import PayDialog from '../payments/PayDialog';
import { formatSAR } from '../../utils/money';
import { getLocalized, tl } from '../../i18n';

const TIER = {
  basic: { label: tl('Basic · free'), tone: 'bg-emerald-500/15 text-emerald-500' },
  advanced: { label: tl('Advanced'), tone: 'bg-sky-500/15 text-sky-500' },
  premium: { label: tl('Premium'), tone: 'bg-amber-500/15 text-amber-500' },
};
const ACCESS = { free: tl('Free'), plan: tl('In your plan'), bought: tl('Unlocked') };

/** YouTube / Vimeo links play in the page; anything else opens in a new tab. */
function embedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host.endsWith('youtube.com')) id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (host === 'vimeo.com') {
      const v = u.pathname.split('/').filter(Boolean)[0];
      if (/^\d+$/.test(v || '')) return `https://player.vimeo.com/video/${v}`;
    }
  } catch { /* not a URL */ }
  return null;
}

export default function MachineVideos({ exercise }) {
  const { data, loading, refetch } = useApi(() => workoutsService.exerciseVideos(exercise.id), [exercise.id], { showError: false });
  const videos = useMemo(() => data?.videos || [], [data]);
  const [picked, setPicked] = useState(null);
  const [buy, setBuy] = useState(null);

  const current = videos.find((v) => v.id === picked && !v.locked) || videos.find((v) => !v.locked) || null;
  const embed = embedUrl(current?.video_url);
  const lockedCount = videos.filter((v) => v.locked).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative bg-surface-container rounded-xl overflow-hidden shadow-lg">
      <div className="aspect-video bg-gradient-to-br from-surface-container-high to-surface-container-lowest relative">
        {embed ? (
          <iframe key={embed} src={embed} title={getLocalized(current, 'title')} className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <>
            {exercise.image_url && <img src={exercise.image_url} alt={getLocalized(exercise, 'name')} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
            <div className="absolute inset-0 grid place-items-center">
              {current ? (
                <a href={current.video_url} target="_blank" rel="noreferrer"
                  className="flex flex-col items-center gap-3 text-primary hover:text-secondary-container">
                  <span className="material-symbols-outlined text-[64px]">play_circle</span>
                  <span className="font-label-lg text-label-lg uppercase tracking-wider">{tl('Watch: {0}', { 0: getLocalized(current, 'title') })}</span>
                </a>
              ) : (
                <div className="flex flex-col items-center gap-3 text-on-surface-variant/60 text-center px-4">
                  <span className="material-symbols-outlined text-[56px]">{lockedCount ? 'lock' : 'videocam_off'}</span>
                  <span className="font-label-lg uppercase tracking-wider">
                    {loading ? tl('Loading videos…') : lockedCount ? tl('Unlock a video below to watch it') : tl('No Video Available')}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="p-space-lg flex flex-col gap-3">
        <div>
          <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">{exercise.category}</span>
          <h2 className="font-headline-md text-headline-md text-on-surface uppercase mt-1 break-words">{getLocalized(exercise, 'name')}</h2>
        </div>

        {data && (
          <p className="text-[12px] text-on-surface-variant">
            {data.plan ? tl('Your plan ({0}) includes: {1}.', { 0: data.plan, 1: tl(data.plan_includes) })
              : tl('Basic videos are free. Advanced and Premium videos come with some plans or can be unlocked one by one.')}
          </p>
        )}

        {videos.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label={tl('Videos for {0}', { 0: getLocalized(exercise, 'name') })}>
            {videos.map((v) => {
              const active = current && v.id === current.id && !v.locked;
              return (
                <li key={v.id ?? 'walkthrough'}
                  className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                    active ? 'border-primary bg-primary-container/10' : 'border-surface-container-high bg-surface-container-low'}`}>
                  <button type="button" disabled={v.locked} onClick={() => setPicked(v.id)}
                    className="flex-1 min-w-0 text-start flex items-start gap-3 disabled:cursor-default">
                    <span className="material-symbols-outlined text-[22px] text-primary shrink-0" aria-hidden="true">
                      {v.locked ? 'lock' : active ? 'play_arrow' : 'play_circle'}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-on-surface font-bold text-[14px] break-words">{getLocalized(v, 'title')}</span>
                      <span className="block text-[12px] text-on-surface-variant">
                        {v.coach}{v.duration_minutes ? ` · ${tl('{0} min', { 0: v.duration_minutes })}` : ''}
                      </span>
                      {getLocalized(v, 'description') && <span className="block text-[12px] text-on-surface-variant mt-0.5 line-clamp-2">{getLocalized(v, 'description')}</span>}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TIER[v.tier].tone}`}>{TIER[v.tier].label}</span>
                    {v.locked ? (
                      <button type="button" onClick={() => setBuy(v)}
                        className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[11px] font-bold uppercase tracking-wider">
                        {tl('Unlock {0}', { 0: formatSAR(v.price) })}
                      </button>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">{ACCESS[v.access]}</span>
                    )}
                  </div>
                  {v.locked && v.included_in?.length > 0 && (
                    <span className="sm:basis-full text-[11px] text-on-surface-variant">
                      {tl('Included with: {0}', { 0: v.included_in.join(', ') })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PayDialog
        request={buy ? { purpose: 'video', video_id: buy.id } : null}
        title={buy ? tl('Unlock “{0}”', { 0: buy.title }) : ''}
        allowCredit
        onPaid={() => { toast.success(tl('Unlocked — enjoy the video!')); setPicked(buy?.id); setBuy(null); refetch(); }}
        onClose={() => { setBuy(null); refetch(); }}
      />
    </motion.div>
  );
}
