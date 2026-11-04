import { motion } from 'framer-motion';
import { getLocalized, tl } from '../../i18n';

const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export default function TrainerBanner({ trainer }) {
  if (!trainer) return null;

  const name = trainer.user?.full_name || tl('Trainer');
  const initials = initialsOf(name);

  const metrics = [
    {
      label: tl('Athlete Rating'),
      value: trainer.rating ?? '—',
      unit: '/ 5.0',
      sub: trainer.total_reviews > 0
        ? tl('{0} Reviews', { 0: trainer.total_reviews })
        : tl('No Reviews Yet'),
      icon: 'star',
    },
    {
      label: tl('Experience'),
      value: trainer.years_experience || 0,
      unit: tl('YRS'),
      sub: tl('Industry'),
      icon: 'speed',
    },
    {
      label: tl('Athletes Coached'),
      value: trainer.total_students || 0,
      unit: '',
      sub: tl('Active Roster'),
      icon: 'trophy',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full rounded-xl bg-surface-container-lowest overflow-hidden shadow-xl"
      aria-label={tl('Trainer profile banner')}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/80 to-transparent z-10" aria-hidden="true" />
      <div className="absolute -right-16 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-space-lg p-space-xl items-end">
        {/* Image + Identity */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-space-md items-start">
          <div className="relative w-36 h-48 sm:w-44 sm:h-56 lg:w-48 lg:h-60 rounded-lg overflow-hidden bg-surface-container-low shadow-md shrink-0">
            {trainer.photo_url ? (
              <img
                src={trainer.photo_url}
                alt={name}
                className="w-full h-full object-cover object-top"
                loading="eager"
              />
            ) : (
              <div
                className="w-full h-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[64px]"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            {trainer.is_accepting_clients && (
              <div className="absolute bottom-2 left-2 bg-surface-container-lowest/90 px-space-xs py-space-2xs rounded-lg flex items-center gap-space-2xs backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" aria-hidden="true" />
                <span className="font-label-md text-label-md text-primary tracking-widest uppercase">
                  {tl('Accepting Athletes')}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-space-2xs min-w-0">
            <span className="font-label-md text-label-md text-primary tracking-widest uppercase flex items-center gap-space-2xs">
              <span
                className="material-symbols-outlined text-title-md text-primary"
                style={{ fontVariationSettings: trainer.is_verified ? "'FILL' 1" : undefined }}
                aria-label={trainer.is_verified ? tl('Verified') : undefined}
                role={trainer.is_verified ? 'img' : undefined}
              >
                {trainer.is_verified ? 'verified' : 'person'}
              </span>
              <span className="truncate">{getLocalized(trainer, 'title') || tl('Coach')}</span>
            </span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide leading-none break-words">
              {name}
            </h1>
            {getLocalized(trainer, 'credentials') && (
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                {getLocalized(trainer, 'credentials')}
              </p>
            )}
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-space-sm w-full">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className="bg-surface-container-low/90 rounded-lg p-space-md flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between text-on-surface-variant gap-2">
                <span className="font-label-md text-label-md uppercase truncate">{m.label}</span>
                <span
                  className="material-symbols-outlined text-primary text-title-md shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {m.icon}
                </span>
              </div>
              <div className="mt-space-sm flex items-baseline gap-space-xs min-w-0">
                <span className="font-headline-lg text-headline-lg text-on-surface leading-none tabular-nums truncate">
                  {m.value}
                </span>
                {m.unit && (
                  <span className="font-label-md text-label-md text-on-surface-variant shrink-0">
                    {m.unit}
                  </span>
                )}
              </div>
              <span className="font-label-md text-label-md text-primary uppercase mt-space-2xs truncate">
                {m.sub}
              </span>
            </motion.div>
          ))}

          {/* Rate Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.34 }}
            className="bg-surface-container-low/90 rounded-lg p-space-md flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between text-on-surface-variant gap-2">
              <span className="font-label-md text-label-md uppercase truncate">{tl('Session Rate')}</span>
              <span className="material-symbols-outlined text-primary text-title-md shrink-0" aria-hidden="true">
                payments
              </span>
            </div>
            <div className="mt-space-sm flex flex-col min-w-0">
              <span className="font-title-lg text-title-lg text-primary leading-tight font-bold tabular-nums truncate">
                {tl('SAR')} {Number(trainer.hourly_rate ?? 0).toFixed(2)}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                {tl('Per 60-min session')}
              </span>
            </div>
            {trainer.is_verified ? (
              <span className="font-label-md text-label-md text-on-surface-variant uppercase mt-space-2xs">
                {tl('Verified Coach')}
              </span>
            ) : <span aria-hidden="true" />}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}