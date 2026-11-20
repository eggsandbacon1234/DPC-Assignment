// Search + filter + sort logic.
// In the real system this runs on the server (Express + SQL). The mock backend
// uses this file to behave the same way, so the UI can be developed without it.

const DAY = 24 * 60 * 60 * 1000;

// commentsByPhoto: optional { [photoId]: ['comment text', ...] } for comment-content search
export function filterPhotos(photos, { search = '', userId, tag, period = 'all', sort = 'newest' } = {}, commentsByPhoto = {}) {
  const q = search.trim().toLowerCase();
  const wantTag = (tag || '').trim().toLowerCase();
  const now = Date.now();
  const periodMs = { today: DAY, week: 7 * DAY, month: 30 * DAY }[period];

  let list = photos.filter((p) => {
    if (q) {
      const hay = [p.title, p.description, p.username, ...(p.tags || []), ...(commentsByPhoto[p.id] || [])]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (userId && userId !== 'all' && String(p.user_id) !== String(userId)) return false;
    if (wantTag && !(p.tags || []).some((t) => t.toLowerCase() === wantTag)) return false;
    if (periodMs && now - new Date(p.created_at).getTime() > periodMs) return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'most_commented') return (b.comment_count || 0) - (a.comment_count || 0);
    if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
    return new Date(b.created_at) - new Date(a.created_at); // newest
  });

  return list;
}

// "sunset, Beach , #KL" -> ['sunset', 'beach', 'kl']
export function parseTags(input) {
  const seen = new Set();
  return String(input || '')
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter((t) => t && !seen.has(t) && seen.add(t))
    .slice(0, 5);
}

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
