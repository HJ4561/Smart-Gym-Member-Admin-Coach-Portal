import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../../hooks/useApi';
import { catalogService } from '../../services/catalogService';
import { membersService } from '../../services/membersService';
import CourseHeader from '../../components/courses/CourseHeader';
import FeaturedCourse from '../../components/courses/FeaturedCourse';
import CourseFilters from '../../components/courses/CourseFilters';
import CourseCard from '../../components/courses/CourseCard';
import PayDialog from '../../components/payments/PayDialog';
import { getLocalized, tl } from '../../i18n';

const EASE = [0.22, 1, 0.36, 1];

const emptyV = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
};

const gridV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export default function Courses() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [sortBy, setSortBy] = useState('Top Rated');
  const navigate = useNavigate();

  const { data: courses, loading } = useApi(() => catalogService.courses(), []);
  const { data: enrollments, refetch: refetchEnrollments } = useApi(
    () => catalogService.enrollments(),
    []
  );
  const { data: membership } = useApi(
    () => membersService.myMembership(),
    [],
    { showError: false }
  );

  const list = Array.isArray(courses) ? courses : [];
  const enrolledIds = new Set(
    (Array.isArray(enrollments) ? enrollments : [])
      .map((e) => e.course?.id)
      .filter(Boolean)
  );

  const filtered = useMemo(() => {
    let result = [...list];

    if (level !== 'all') {
      result = result.filter((c) => c.level === level);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          [c.title, c.title_ar].some((v) => v?.toLowerCase().includes(s)) ||
          c.category?.toLowerCase().includes(s)
      );
    }

    switch (sortBy) {
      case 'Price: Low to High':
        result.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
        break;
      case 'Price: High to Low':
        result.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
        break;
      case 'Top Rated':
      default:
        result.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
        break;
    }

    return result;
  }, [list, level, search, sortBy]);

  const featured = list.find((c) => c.is_featured) || list[0];

  const [buying, setBuying] = useState(null);

  // Free (or included-in-plan) courses enrol directly; paid ones are enrolled by the payment.
  const handleEnroll = async (course) => {
    if (!course.free_for_me) {
      setBuying(course);
      return;
    }
    try {
      await catalogService.enroll(course.id);
      toast.success(tl("Enrolled in {0}! Opening player...", { 0: getLocalized(course, 'title') }));
      refetchEnrollments();
      setTimeout(() => navigate(`/dashboard/player/${course.id}`), 800);
    } catch (e) {
      if (e.response?.status === 402) setBuying(course);
      else toast.error(e.response?.data?.detail || 'Failed to enroll');
    }
  };

  return (
    <div className="relative flex flex-col w-full gap-space-xl px-space-xl py-space-xl">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 80%)',
          }}
        />
        <motion.div
          className="absolute -top-40 right-[6%] w-[460px] h-[460px] rounded-full bg-primary-container/10 blur-3xl"
          animate={{ x: [0, 38, 0], y: [0, 26, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <CourseHeader
        courseCount={list.length}
        membershipTier={membership?.plan?.display_name}
      />

      {featured && (
        <FeaturedCourse
          course={featured}
          enrolled={enrolledIds.has(featured.id)}
          onEnroll={handleEnroll}
        />
      )}

      <CourseFilters
        level={level}
        setLevel={setLevel}
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 bg-surface-container rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={emptyV}
          initial="hidden"
          animate="show"
          className="bg-surface-container-lowest rounded-xl p-space-2xl text-center"
        >
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-space-md inline-block">
            search_off
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface uppercase mb-2">
            {tl("No Courses Match")}
          </h3>
          <p className="font-body-md text-on-surface-variant">
            {tl("Try changing your filters or selecting a different discipline.")}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={gridV}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <CourseCard
                key={c.id}
                course={c}
                index={i}
                enrolled={enrolledIds.has(c.id)}
                onEnroll={handleEnroll}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <PayDialog
        request={buying ? { purpose: 'course', course_id: buying.id } : null}
        title={buying ? buying.title : ''}
        allowCredit
        onPaid={() => {
          const id = buying?.id;
          toast.success(tl("Enrolled! Opening player..."));
          refetchEnrollments();
          setTimeout(() => navigate(`/dashboard/player/${id}`), 800);
        }}
        onClose={() => { setBuying(null); refetchEnrollments(); }}
      />
    </div>
  );
}