// src/components/profile/BodyScan.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { tl, locale } from '../../i18n';

export default function BodyScan({ dexa }) {
  const [view, setView] = useState('front');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-lg bg-surface-container p-space-xl flex flex-col justify-between relative shadow-lg overflow-hidden"
    >
      <div>
        <div className="flex items-center justify-between mb-space-md flex-wrap gap-2">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-primary uppercase tracking-widest font-bold">
              {tl("Body Composition / Biometrics")}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
              {tl("DEXA body scan")}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded">
            <button
              onClick={() => setView('front')}
              className={`px-space-xs py-1 rounded font-label-md text-label-md font-bold transition-all ${
                view === 'front'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              {tl("FRONT")}
            </button>
            <button
              onClick={() => setView('back')}
              className={`px-space-xs py-1 rounded font-label-md text-label-md font-bold transition-all ${
                view === 'back'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              {tl("POSTERIOR")}
            </button>
          </div>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          {tl("From your latest body-composition (DEXA) scan, recorded by your nutritionist.")}
        </p>
      </div>

      {!dexa ? (
        <div className="my-space-lg text-center py-16 bg-surface-container-low rounded-lg">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
            monitor_weight
          </span>
          <p className="font-title-md text-title-md text-on-surface mt-3">
            {tl("No DEXA scan on record")}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {tl("Book a scan with your nutritionist.")}
          </p>
        </div>
      ) : (
        <>
          {/* Body visualization */}
          <div className="relative my-space-lg w-full h-80 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-72 bg-primary-container/10 rounded-full filter blur-2xl" />
            </div>

            <svg
              className="h-full w-auto text-surface-container-highest transition-all duration-500"
              viewBox="0 0 240 380"
            >
              <defs>
                <linearGradient id="crimsonHeat" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#e51937" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#bf0028" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              <g
                fill="none"
                opacity="0.45"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              >
                <circle cx="120" cy="35" r="18" strokeDasharray="3 2" />
                <path d="M112,52 L112,65 M128,52 L128,65" />
                <path d="M78,72 L162,72" />
                <path d="M78,72 L84,140 L96,180 L110,195 L120,198 L130,195 L144,180 L156,140 L162,72" />
                <path d="M120,65 L120,195" strokeDasharray="2 3" />
                <path d="M84,105 L156,105" strokeDasharray="2 3" />
                <path d="M88,140 L152,140" strokeDasharray="2 3" />
                <path d="M78,72 L62,110 L54,165 L50,210" />
                <path d="M162,72 L178,110 L186,165 L190,210" />
                <path d="M102,195 L95,260 L92,320 L88,365" />
                <path d="M138,195 L145,260 L148,320 L152,365" />
                <path d="M115,200 L110,260 L108,320 L106,365" />
                <path d="M125,200 L130,260 L132,320 L134,365" />
              </g>

              <path
                d="M86,76 Q120,84 154,76 L150,102 Q120,108 90,102 Z"
                fill="url(#crimsonHeat)"
              />
              <ellipse cx="72" cy="85" fill="url(#crimsonHeat)" rx="10" ry="16" />
              <ellipse cx="168" cy="85" fill="url(#crimsonHeat)" rx="10" ry="16" />
              <path
                d="M92,215 Q86,255 90,285 L106,285 Q108,245 106,215 Z"
                fill="url(#crimsonHeat)"
              />
              <path
                d="M148,215 Q154,255 150,285 L134,285 Q132,245 134,215 Z"
                fill="url(#crimsonHeat)"
              />

              <circle className="animate-ping opacity-75" cx="120" cy="92" fill="#e51937" r="5" />
              <circle cx="120" cy="92" fill="#ffdad8" r="4" />
              <circle cx="72" cy="85" fill="#e51937" r="4" />
              <circle cx="168" cy="85" fill="#e51937" r="4" />
              <circle cx="98" cy="245" fill="#e51937" r="4" />
              <circle cx="142" cy="245" fill="#e51937" r="4" />
            </svg>

            <div className="absolute top-16 right-4 bg-surface-container-high/90 backdrop-blur px-space-xs py-1 rounded shadow-lg flex flex-col">
              <span className="font-label-md text-label-md text-primary font-bold uppercase">
                {tl("Lean:")}{' '}{Number(dexa.lean_mass_kg).toFixed(1)} kg
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {tl("Fat:")}{' '}{Number(dexa.fat_mass_kg).toFixed(1)} kg
              </span>
            </div>

            <div className="absolute bottom-16 left-2 bg-surface-container-high/90 backdrop-blur px-space-xs py-1 rounded shadow-lg flex flex-col">
              <span className="font-label-md text-label-md text-primary font-bold uppercase">
                {tl("Body Fat:")}{' '}{Number(dexa.body_fat_percent).toFixed(1)}%
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {tl("Scanned:")}{' '}{new Date(dexa.scan_date).toLocaleDateString(locale)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm pt-space-md border-t border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <div className="w-3 h-3 rounded-full bg-primary-container" />
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface leading-none">
                  {Number(dexa.lean_mass_kg).toFixed(1)}{' '}{tl("KG")}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                  {tl("Lean Tissue Mass")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-xs">
              <div className="w-3 h-3 rounded-full bg-surface-bright" />
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface leading-none">
                  {Number(dexa.fat_mass_kg).toFixed(1)}{' '}{tl("KG")}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                  {tl("Adipose Mass")}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}