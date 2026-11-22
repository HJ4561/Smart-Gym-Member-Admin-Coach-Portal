// src/components/classes/CoachPosts.jsx — what coaches shared with the member's classes: messages and videos.
import { useApi } from '../../hooks/useApi';
import { classesService } from '../../services/classesService';
import VideoPlayer from '../common/VideoPlayer';
import { getLocalized, locale, tl } from '../../i18n';

const fmtDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

export default function CoachPosts({ classes }) {
  const ids = classes.map((c) => c.id).join(',');
  const { data } = useApi(async () => {
    const lists = await Promise.all(classes.map((c) => classesService.posts(c.id).catch(() => [])));
    return lists.flatMap((rows, i) => rows.map((p) => ({ ...p, className: getLocalized(classes[i], 'name') })))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12);
  }, [ids], { poll: 60_000, showError: false });
  const posts = data || [];
  if (!posts.length) return null;
  return (
    <section className="bg-surface-container rounded-xl p-5 flex flex-col gap-3">
      <h2 className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant">{tl('From your coaches')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {posts.map((p) => (
          <article key={p.id} className="bg-surface-container-high rounded-lg p-3 flex flex-col gap-2 min-w-0">
            <div className="text-[11px] text-on-surface-variant">
              {p.className}{p.for_date ? ` · ${fmtDay(p.for_date)}` : ''} · {p.author}
            </div>
            {p.kind === 'video' && <VideoPlayer url={p.video_url} thumbnail={p.thumbnail_url} />}
            <div className="text-on-surface font-bold text-[14px]">{p.title}</div>
            {p.body && <p className="text-[13px] text-on-surface-variant whitespace-pre-line break-words">{p.body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
