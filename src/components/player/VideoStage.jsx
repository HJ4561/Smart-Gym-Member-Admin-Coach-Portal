import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

export default function VideoStage({ course, currentModule }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => setPlaying((p) => !p);

  const videoUrl = currentModule?.video_url || course?.promo_video_url;
  const posterImage = course?.cover_image_url;

  // If there's a real video URL, embed it
  if (videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl">
        <iframe
          src={videoUrl}
          title={currentModule?.title || course?.title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback: poster with play button
  return (
    <div
      className="relative w-full aspect-video bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl group select-none"
      id="video-stage"
    >
      {posterImage && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url('${posterImage}')` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-black/60 pointer-events-none" />

      {/* Top HUD */}
      <div className="absolute top-space-md left-space-md right-space-md flex items-start justify-between pointer-events-none flex-wrap gap-2">
        <div className="flex items-center gap-space-xs bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-space-2xs rounded-lg">
          <span className="material-symbols-outlined text-primary text-title-md animate-pulse">
            radar
          </span>
          <div className="flex flex-col">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-widest leading-none">
              {course?.category || tl("Training")}
            </span>
            <span className="text-title-md font-headline-md text-on-surface leading-none mt-1">
              {course?.level?.replace('_', ' ').toUpperCase() || tl("ALL LEVELS")}
            </span>
          </div>
        </div>

        <span className="px-space-xs py-1 rounded bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-md text-label-md uppercase tracking-wider">
          {course?.duration_weeks}{' '}{tl("Weeks")}
        </span>
      </div>

      {/* Center play button */}
      <AnimatePresence>
        {!playing && (
          <motion.button
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-2xl focus:outline-none z-20"
            type="button"
          >
            <span
              className="material-symbols-outlined text-[42px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom overlay with title */}
      <div className="absolute bottom-0 left-0 right-0 p-space-md bg-gradient-to-t from-surface-container-lowest to-transparent">
        <span className="font-label-md text-[10px] text-primary uppercase tracking-widest font-bold">
          {currentModule ? tl("Current Module") : tl("Course Preview")}
        </span>
        <h2 className="font-headline-md text-headline-md text-on-surface uppercase mt-1">
          {currentModule?.title || course?.title}
        </h2>
        {currentModule?.description && (
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl line-clamp-2">
            {getLocalized(currentModule, 'description')}
          </p>
        )}
      </div>
    </div>
  );
}