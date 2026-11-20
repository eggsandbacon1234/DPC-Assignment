import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/filterPhotos.js';

const MAX_LEN = 500;
const POLL_MS = 10000;

export default function CommentSection({ photoId, photoOwnerId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const editingRef = useRef(null);
  editingRef.current = editingId;

  const isPhotoOwner = String(photoOwnerId) === String(user?.id);
  const isMine = (c) => String(c.user_id) === String(user?.id);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const list = await api.getComments(photoId);
      // Don't replace the list while the user is editing, or their typing would jump.
      if (editingRef.current == null) setComments(list);
    } catch (err) {
      if (showSpinner) setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Poll so comments from other users show up without refreshing (multi-user support).
    const t = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(t);
  }, [photoId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    setError('');
    try {
      const c = await api.addComment(photoId, trimmed);
      setComments((prev) => [...prev, { ...c, username: c.username || user.username }]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  function startEdit(c) {
    setConfirmId(null);
    setEditingId(c.id);
    setEditText(c.text);
  }

  async function saveEdit(c) {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === c.text) { setEditingId(null); return; }
    setBusyId(c.id);
    setError('');
    try {
      const updated = await api.updateComment(c.id, trimmed);
      setComments((prev) => prev.map((x) => (x.id === c.id
        ? { ...x, ...updated, username: x.username, updated_at: updated.updated_at || new Date().toISOString() }
        : x)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c) {
    setBusyId(c.id);
    setError('');
    try {
      await api.deleteComment(c.id);
      setComments((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  return (
    <section className="comments" id="comments">
      <h2>Comments <span className="muted">({comments.length})</span></h2>

      {loading ? (
        <p className="muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="muted">No comments yet. Be the first!</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => {
            const canEdit = isMine(c);
            const canDelete = isMine(c) || isPhotoOwner;
            const editing = editingId === c.id;
            return (
              <li key={c.id} className={isMine(c) ? 'comment mine' : 'comment'}>
                <div className="avatar" aria-hidden="true">{(c.username || '?')[0].toUpperCase()}</div>
                <div className="comment-main">
                  <div className="comment-head">
                    <strong>@{c.username}</strong>
                    <span className="muted">{timeAgo(c.created_at)}{c.updated_at ? ' · edited' : ''}</span>
                  </div>

                  {editing ? (
                    <div className="comment-edit">
                      <textarea
                        rows={2}
                        value={editText}
                        autoFocus
                        onChange={(e) => setEditText(e.target.value.slice(0, MAX_LEN))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <div className="comment-actions">
                        <button type="button" className="link-btn" onClick={() => saveEdit(c)} disabled={busyId === c.id}>
                          {busyId === c.id ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" className="link-btn muted" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p>{c.text}</p>
                  )}

                  {!editing && (canEdit || canDelete) && (
                    <div className="comment-actions">
                      {confirmId === c.id ? (
                        <>
                          <span className="small">Delete{isMine(c) ? '' : ` @${c.username}'s comment`}?</span>
                          <button type="button" className="link-btn danger" onClick={() => remove(c)} disabled={busyId === c.id}>
                            {busyId === c.id ? 'Deleting…' : 'Yes'}
                          </button>
                          <button type="button" className="link-btn muted" onClick={() => setConfirmId(null)}>No</button>
                        </>
                      ) : (
                        <>
                          {canEdit && <button type="button" className="link-btn" onClick={() => startEdit(c)}>Edit</button>}
                          {canDelete && <button type="button" className="link-btn danger" onClick={() => setConfirmId(c.id)}>Delete</button>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          placeholder="Write a comment…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          }}
        />
        <div className="comment-form-foot">
          <span className="muted small">{text.length}/{MAX_LEN} · Enter to post, Shift+Enter for new line</span>
          <button className="btn btn-primary btn-sm" disabled={posting || !text.trim()}>
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
      </form>
    </section>
  );
}
