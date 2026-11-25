// src/components/common/VideoPlayer.jsx
// A video card: the thumbnail and title until someone presses play, then the video itself —
// YouTube and Vimeo links play in their own player, a direct file (.mp4, .webm) in the browser's.
import { useState } from 'react';
import { tl } from '../../i18n';
import { embedUrl, isVideoFile } from '../../utils/video';


export default function VideoPlayer({ url, thumbnail, title, subtitle, className = '' }) {
  const [playing, setPlaying] = useState(false);
  const embed = embedUrl(url, { autoplay: true });
  const file = !embed && isVideoFile(url);

  return (
    <figure className={`flex flex-col gap-2 min-w-0 ${className}`}>
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#0a0a0c] border border-[#1a1a1e]">
        {playing && embed ? (
          <iframe src={embed} title={title || tl('Video')} className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : playing && file ? (
          <video src={url} poster={thumbnail || undefined} controls autoPlay className="absolute inset-0 w-full h-full bg-black">
            <track kind="captions" />
          </video>
        ) : (
          <button type="button" onClick={() => (embed || file ? setPlaying(true) : window.open(url, '_blank', 'noopener'))}
            className="absolute inset-0 w-full h-full group" aria-label={tl('Play {0}', { 0: title || tl('video') })}>
            {thumbnail
              ? <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
              : <span className="w-full h-full grid place-items-center text-on-surface-variant"><span className="material-symbols-outlined text-[40px]" aria-hidden="true">movie</span></span>}
            <span className="absolute inset-0 grid place-items-center bg-black/25 group-hover:bg-black/40 transition-colors">
              <span className="w-14 h-14 rounded-full bg-primary-container grid place-items-center shadow-lg">
                <span className="material-symbols-outlined text-on-primary-container text-[32px]" aria-hidden="true">play_arrow</span>
              </span>
            </span>
          </button>
        )}
      </div>
      {(title || subtitle) && (
        <figcaption className="min-w-0">
          {title && <div className="text-on-surface font-bold text-[13px] truncate">{title}</div>}
          {subtitle && <div className="text-[11px] text-on-surface-variant truncate">{subtitle}</div>}
        </figcaption>
      )}
    </figure>
  );
}
