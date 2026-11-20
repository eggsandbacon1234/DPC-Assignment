import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import CommentSection from '../components/CommentSection.jsx';
import { timeAgo } from '../utils/filterPhotos.js';

export default function PhotoPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setPhoto(null);
    setError('');
    api.getPhoto(id).then(setPhoto).catch((err) => setError(err.message));
  }, [id]);

  async function handleShare() {
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: photo.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* user cancelled */ }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deletePhoto(photo.id);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (error && !photo) {
    return (
      <div className="empty">
        <h3>{error}</h3>
        <Link to="/" className="btn btn-ghost">Back to feed</Link>
      </div>
    );
  }
  if (!photo) return <div className="center-msg">Loading photo…</div>;

  const isOwner = user && String(user.id) === String(photo.user_id);

  return (
    <div className="photo-page">
      <Link to="/" className="back-link">← Back to feed</Link>

      <div className="photo-layout">
        <figure className="photo-full">
          <img src={photo.image_url} alt={photo.title} />
        </figure>

        <aside className="photo-side">
          <div className="card">
            <h1>{photo.title}</h1>
            <div className="photo-owner">
              <div className="avatar" aria-hidden="true">{(photo.username || '?')[0].toUpperCase()}</div>
              <div>
                <strong>@{photo.username}</strong>
                <div className="muted small">{timeAgo(photo.created_at)}</div>
              </div>
            </div>
            {photo.description && <p className="photo-desc">{photo.description}</p>}
            {photo.tags?.length > 0 && (
              <div className="tag-list photo-tags">
                {photo.tags.map((t) => (
                  <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="tag">#{t}</Link>
                ))}
              </div>
            )}

            <div className="photo-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleShare}>
                {copied ? '✓ Link copied' : '🔗 Share'}
              </button>
              {isOwner && !confirmDelete && (
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>
              )}
              {isOwner && confirmDelete && (
                <span className="confirm-row">
                  <span className="small">Delete this photo?</span>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                </span>
              )}
            </div>
            {error && <div className="alert alert-error">{error}</div>}
          </div>

          <div className="card">
            <CommentSection photoId={photo.id} photoOwnerId={photo.user_id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
