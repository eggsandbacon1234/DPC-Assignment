import { Link } from 'react-router-dom';
import { timeAgo } from '../utils/filterPhotos.js';

export default function PhotoCard({ photo, onTagClick }) {
  return (
    <article className="photo-card">
      <Link to={`/photos/${photo.id}`} className="photo-card-img">
        <img src={photo.image_url} alt={photo.title} loading="lazy" />
      </Link>
      <div className="photo-card-body">
        <Link to={`/photos/${photo.id}`} className="photo-card-title">{photo.title}</Link>
        <div className="photo-card-meta">
          <span>@{photo.username}</span>
          <span>·</span>
          <span>{timeAgo(photo.created_at)}</span>
          <Link to={`/photos/${photo.id}#comments`} className="comment-count" title="Comments">
            💬 {photo.comment_count ?? 0}
          </Link>
        </div>
        {photo.tags?.length > 0 && (
          <div className="tag-list">
            {photo.tags.map((t) => (
              <button key={t} type="button" className="tag tag-sm" onClick={() => onTagClick && onTagClick(t)}>
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
