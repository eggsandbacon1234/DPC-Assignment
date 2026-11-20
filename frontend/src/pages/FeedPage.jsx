import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import PhotoCard from '../components/PhotoCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterBar, { DEFAULT_FILTERS } from '../components/FilterBar.jsx';

const POLL_MS = 15000;

export default function FeedPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  // Search + filters live in the URL (?q=sunset&tag=beach&sort=oldest) so a filtered
  // feed can be bookmarked or shared, and survives a page refresh.
  const search = params.get('q') || '';
  const filters = {
    owner: params.get('owner') || DEFAULT_FILTERS.owner,
    userId: params.get('user') || DEFAULT_FILTERS.userId,
    tag: params.get('tag') || DEFAULT_FILTERS.tag,
    period: params.get('period') || DEFAULT_FILTERS.period,
    sort: params.get('sort') || DEFAULT_FILTERS.sort,
  };

  const [photos, setPhotos] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCount, setNewCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const seenIds = useRef(null); // ids of photos the user has already been shown

  function updateParams(next) {
    const p = new URLSearchParams();
    const merged = { q: search, ...filters, ...next };
    if (merged.q) p.set('q', merged.q);
    if (merged.owner !== 'all') p.set('owner', merged.owner);
    if (merged.userId !== 'all') p.set('user', merged.userId);
    if (merged.tag) p.set('tag', merged.tag);
    if (merged.period !== 'all') p.set('period', merged.period);
    if (merged.sort !== 'newest') p.set('sort', merged.sort);
    setParams(p, { replace: true });
  }

  // Users for "Posted by" and popular tags. Both endpoints are optional on the
  // backend; if missing, the lists are built from the photos we load.
  function loadSideLists() {
    api.getUsers().then(setUsers).catch(() => {});
    api.getTags().then(setTags).catch(() => {});
  }
  useEffect(loadSideLists, []);

  // Fetch photos from the server whenever search/filters change.
  const queryKey = params.toString();
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.getPhotos({
      search,
      userId: filters.owner === 'mine' ? user.id : filters.userId,
      tag: filters.tag,
      period: filters.period,
      sort: filters.sort,
    })
      .then((list) => {
        if (cancelled) return;
        setPhotos(list);
        setUsers((prev) => (prev.length ? prev : uniqueUsers(list)));
        setTags((prev) => (prev.length ? prev : uniqueTags(list)));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [queryKey, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Multi-user: every 15s, check whether friends uploaded something new.
  useEffect(() => {
    let stopped = false;
    async function check() {
      try {
        const all = await api.getPhotos({ sort: 'newest' });
        if (stopped) return;
        if (!seenIds.current) {
          seenIds.current = new Set(all.map((p) => p.id));
          return;
        }
        const fresh = all.filter((p) => !seenIds.current.has(p.id) && String(p.user_id) !== String(user.id));
        setNewCount(fresh.length);
        // Own uploads count as seen straight away.
        all.filter((p) => String(p.user_id) === String(user.id)).forEach((p) => seenIds.current.add(p.id));
      } catch { /* ignore polling errors */ }
    }
    check();
    const t = setInterval(check, POLL_MS);
    return () => { stopped = true; clearInterval(t); };
  }, [user.id]);

  async function showNewPhotos() {
    const all = await api.getPhotos({ sort: 'newest' }).catch(() => []);
    all.forEach((p) => seenIds.current?.add(p.id));
    setNewCount(0);
    loadSideLists();
    setReloadKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const isFiltered = search || filters.owner !== 'all' || filters.userId !== 'all' || filters.tag || filters.period !== 'all';

  return (
    <div className="feed">
      <div className="feed-head">
        <div>
          <h1>Feed</h1>
          <p className="muted">
            {loading ? 'Loading photos…' : `${photos.length} photo${photos.length === 1 ? '' : 's'}${isFiltered ? ' match your filters' : ''}`}
          </p>
        </div>
        <SearchBar value={search} onChange={(q) => updateParams({ q })} />
      </div>

      <FilterBar filters={filters} users={users} tags={tags} onChange={(f) => updateParams(f)} />

      {newCount > 0 && (
        <button className="new-photos-pill" onClick={showNewPhotos}>
          ↑ {newCount} new photo{newCount === 1 ? '' : 's'} from friends
        </button>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="photo-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="photo-card skeleton" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="empty">
          {isFiltered ? (
            <>
              <h3>No photos match</h3>
              <p className="muted">Try a different search or reset the filters.</p>
              <button className="btn btn-ghost" onClick={() => setParams({}, { replace: true })}>Clear search & filters</button>
            </>
          ) : (
            <>
              <h3>No photos yet</h3>
              <p className="muted">Be the first to share something.</p>
              <Link to="/upload" className="btn btn-primary">Upload a photo</Link>
            </>
          )}
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <PhotoCard key={p.id} photo={p} onTagClick={(tag) => updateParams({ tag })} />
          ))}
        </div>
      )}
    </div>
  );
}

function uniqueUsers(list) {
  const seen = new Map();
  list.forEach((p) => seen.set(String(p.user_id), { id: p.user_id, username: p.username }));
  return [...seen.values()];
}

function uniqueTags(list) {
  const counts = {};
  list.forEach((p) => (p.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}
