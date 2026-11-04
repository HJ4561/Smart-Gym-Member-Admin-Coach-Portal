// src/pages/trainers/TrainerProfile.jsx
// Public trainer profile: banner, philosophy, telemetry, curriculum, reviews, and
// a sticky booking panel. Layout: 2/1 grid on desktop, stacked on mobile.
import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import TrainerBanner from '../../components/trainers/TrainerBanner';
import SpecialtiesPillRow from '../../components/trainers/SpecialtiesPillRow';
import PhilosophyCard from '../../components/trainers/PhilosophyCard';
import TelemetryImpact from '../../components/trainers/TelemetryImpact';
import CurriculumGrid from '../../components/trainers/CurriculumGrid';
import ReviewsList from '../../components/trainers/ReviewsList';
import ReviewForm from '../../components/trainers/ReviewForm';
import BookingPanel from '../../components/trainers/BookingPanel';
import { getLocalized, tl } from '../../i18n';

// Subtle fade-up wrapper that respects reduced-motion.
function Section({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// Mirrors the real page layout so there's no content jump when data arrives.
function ProfileSkeleton() {
  return (
    <div
      className="w-full px-space-xl py-space-xl flex flex-col gap-space-xl"
      aria-busy="true"
      aria-label={tl("Loading trainer profile")}
    >
      <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-space-xl">
        <div className="flex flex-col gap-space-lg">
          <div className="h-8 w-2/3 bg-surface-container rounded animate-pulse" />
          <div className="h-40 bg-surface-container rounded-xl animate-pulse" />
          <div className="h-48 bg-surface-container rounded-xl animate-pulse" />
          <div className="h-56 bg-surface-container rounded-xl animate-pulse" />
        </div>
        <div className="h-[520px] bg-surface-container rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function NotFound({ onBack }) {
  return (
    <main
      role="alert"
      className="w-full px-space-xl py-space-xl flex items-center justify-center min-h-[60vh]"
    >
      <div className="max-w-md w-full text-center bg-surface-container border border-outline-variant/30 rounded-2xl p-10">
        <div className="mx-auto w-14 h-14 rounded-full bg-surface-container-high grid place-items-center">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/60" aria-hidden="true">
            person_off
          </span>
        </div>
        <p className="font-title-md text-title-md text-on-surface mt-4">
          {tl("Trainer not found")}
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          {tl("This profile may have been moved or is no longer available.")}
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded-lg border border-outline-variant/40 text-on-surface-variant font-label-lg uppercase tracking-wider hover:text-on-surface hover:border-outline-variant transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {tl("Go back")}
          </button>
          <Link
            to="/dashboard/trainers"
            className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-lg uppercase tracking-wider hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-container"
          >
            {tl("Back to Directory")}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TrainerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const { data: trainer, loading, refetch } = useApi(
    () => catalogService.trainer(id),
    [id]
  );

  // Derive once — avoids re-computing in each section.
  const reviews = trainer?.reviews ?? [];
  const hasReviewed = Boolean(trainer?.my_review?.id);
  const showReviewForm = !hasReviewed;

  const heroDelay = useMemo(() => 0.05, []);

  if (loading) return <ProfileSkeleton />;

  if (!trainer) {
    return <NotFound onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard/trainers'))} />;
  }

  return (
    <main className="w-full px-space-xl py-space-xl flex flex-col gap-space-xl">
      {/* Breadcrumb — subtle, above the banner */}
      <nav aria-label={tl("Breadcrumb")} className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
        <Link to="/dashboard" className="hover:text-on-surface transition">{tl("Dashboard")}</Link>
        <span aria-hidden="true">/</span>
        <Link to="/dashboard/trainers" className="hover:text-on-surface transition">{tl("Trainers")}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-on-surface truncate max-w-[220px]" aria-current="page">
          {trainer.user_name || trainer.name}
        </span>
      </nav>

      {/* Ambient blob — scoped to hero area, not fixed to viewport */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <motion.div
            className="absolute -top-32 right-[10%] w-[460px] h-[460px] rounded-full bg-primary-container/10 blur-3xl will-change-transform"
            animate={reduce ? {} : { x: [0, 34, 0], y: [0, 26, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        </div>

        <Section delay={heroDelay}>
          <TrainerBanner trainer={trainer} />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-space-xl items-start">
        {/* LEFT: Content */}
        <div className="flex flex-col gap-space-xl min-w-0">
          {getLocalized(trainer, 'specialties')?.length > 0 && (
            <Section delay={0.05} aria-label={tl("Specialties")}>
              <SpecialtiesPillRow specialties={getLocalized(trainer, 'specialties')} />
            </Section>
          )}

          {getLocalized(trainer, 'bio') && (
            <Section delay={0.1} aria-label={tl("Coaching Philosophy")}>
              <PhilosophyCard bio={getLocalized(trainer, 'bio')} title={tl("Coaching Philosophy")} />
            </Section>
          )}

          <Section delay={0.15} aria-label={tl("Impact")}>
            <TelemetryImpact trainer={trainer} />
          </Section>

          <Section delay={0.2} aria-label={tl("Curriculum")}>
            <CurriculumGrid courses={trainer.courses || []} />
          </Section>

          {/* Reviews section: existing reviews first, then the form CTA */}
          <Section delay={0.25} aria-label={tl("Reviews")}>
            <div className="flex flex-col gap-space-lg">
              <ReviewsList reviews={reviews} />
              {showReviewForm && (
                <ReviewForm
                  key={trainer.my_review?.id || 'new'}
                  trainer={trainer}
                  onSaved={refetch}
                />
              )}
            </div>
          </Section>
        </div>

        {/* RIGHT: Sticky booking panel — sticky on desktop, inline on mobile */}
        <aside
          className="lg:sticky lg:top-6 lg:self-start min-w-0"
          aria-label={tl("Booking")}
        >
          <Section delay={0.1}>
            <BookingPanel trainer={trainer} />
          </Section>
        </aside>
      </div>
    </main>
  );
}