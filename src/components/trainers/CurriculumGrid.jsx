import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getLocalized, tl } from '../../i18n';

function EmptyState() {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-xl text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40" aria-hidden="true">
        menu_book
      </span>
      <p className="font-title-md text-title-md text-on-surface mt-3">
        {tl('No Published Courses')}
      </p>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1">
        {tl("This trainer hasn't published any courses yet.")}
      </p>
    </div>
  );
}

export default function CurriculumGrid({ courses = [] }) {
  const navigate = useNavigate();
  const list = Array.isArray(courses) ? courses : [];

  if (list.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wider">
          {tl('Courses by this trainer')}
        </h2>
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tabular-nums">
          {list.length} {tl('Programs Active')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {list.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            whileHover={{ y: -4 }}
            whileFocus={{ y: -4 }}
            onClick={() => navigate(`/dashboard/courses/${c.id}`)}
            className="group text-left bg-surface-container-low rounded-xl overflow-hidden shadow-md flex flex-col justify-between hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            aria-label={tl('Open course {0}', { 0: getLocalized(c, 'title') })}
          >
            <div className="relative h-32 w-full overflow-hidden">
              {c.cover_image_url ? (
                <img
                  src={c.cover_image_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full bg-gradient-to-br from-primary-container/30 to-secondary-container/20"
                  aria-hidden="true"
                />
              )}
              {c.duration_weeks > 0 && (
                <div className="absolute top-2 right-2 bg-surface-container-lowest/90 px-space-xs py-space-2xs rounded font-label-md text-label-md text-primary uppercase tabular-nums">
                  {c.duration_weeks} {tl('Weeks')}
                </div>
              )}
            </div>

            <div className="p-space-md flex flex-col gap-space-2xs">
              {c.category && (
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest">
                  {c.category}
                </span>
              )}
              <h3 className="font-title-lg text-title-lg text-on-surface uppercase leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {getLocalized(c, 'title')}
              </h3>
              {(c.subtitle || c.description) && (
                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                  {getLocalized(c, 'subtitle') || getLocalized(c, 'description')}
                </p>
              )}

              <div className="mt-space-sm flex items-center justify-between pt-space-xs">
                <span className="font-headline-md text-headline-md text-on-surface tabular-nums">
                  {Number(c.price) > 0
                    ? tl('SAR {0}', { 0: Number(c.price).toFixed(0) })
                    : tl('Free')}
                </span>
                <span className="font-label-md text-label-md text-primary flex items-center gap-space-2xs group-hover:translate-x-1 transition-transform">
                  {tl('View Syllabus')}
                  <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}