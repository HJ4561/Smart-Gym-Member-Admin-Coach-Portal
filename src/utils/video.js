// src/utils/video.js
// Turns a video link into something the page can play. YouTube and Vimeo refuse to be shown in a
// frame from their normal pages (X-Frame-Options), so their links become the embed player's link.

/**
 * The embed link for a YouTube or Vimeo video, or null when the link isn't one.
 * Handles watch?v=, youtu.be/, /embed/, /shorts/, /live/, m. and music. hosts, and vimeo.com/<id>.
 */
export function embedUrl(url, { autoplay = false } = {}) {
  if (!url) return null;
  let u;
  try { u = new URL(String(url).trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  const auto = autoplay ? '&autoplay=1' : '';

  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v');
    if (!id) {
      const [kind, value] = u.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live', 'v'].includes(kind)) id = value;
    }
  }
  if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0${auto}`;

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p));
    if (v) return `https://player.vimeo.com/video/${v}?${autoplay ? 'autoplay=1' : ''}`;
  }
  return null;
}

/** True for a direct video file the browser plays itself (.mp4, .webm, .ogg, .mov). */
export function isVideoFile(url) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url || '');
}
