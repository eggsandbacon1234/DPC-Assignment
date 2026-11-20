import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { parseTags } from '../utils/filterPhotos.js';

const MAX_MB = 5;
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagText, setTagText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Free the preview URL when the file changes or the page closes.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pickFile(f) {
    setError('');
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError('Only JPG, PNG, GIF or WebP images are allowed.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 100));
  }

  function clearFile() {
    setFile(null);
    setPreview('');
    if (inputRef.current) inputRef.current.value = '';
  }

  // Typing "beach," or pressing Enter turns the text into a tag chip.
  function commitTags(text = tagText) {
    const next = parseTags([...tags, ...parseTags(text)].join(','));
    setTags(next);
    setTagText('');
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Choose an image to upload.');
    if (!title.trim()) return setError('Give your photo a title.');

    setUploading(true);
    setProgress(0);
    try {
      const photo = await api.uploadPhoto(
        { file, title: title.trim(), description: description.trim(), tags: commitTags() },
        setProgress
      );
      navigate(photo?.id ? `/photos/${photo.id}` : '/');
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  }

  return (
    <div className="upload-page">
      <h1>Upload a photo</h1>
      <p className="muted">Your photo is stored on AWS S3 and shared with everyone on the feed.</p>

      <form className="card upload-card" onSubmit={handleSubmit}>
        {!preview ? (
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          >
            <div className="dropzone-icon" aria-hidden="true">⬆</div>
            <strong>Drag an image here or click to browse</strong>
            <span className="muted small">JPG, PNG, GIF or WebP · up to {MAX_MB} MB</span>
          </div>
        ) : (
          <div className="preview">
            <img src={preview} alt="Preview" />
            <div className="preview-info">
              <span className="small">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
              {!uploading && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFile}>Change image</button>}
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept={ALLOWED.join(',')} hidden onChange={(e) => pickFile(e.target.files[0])} />

        <label className="field">
          <span>Title <em className="muted">(required)</em></span>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} placeholder="e.g. Sunset at the beach" disabled={uploading} />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Say something about this photo…"
            disabled={uploading}
          />
          <small className="muted counter">{description.length}/500</small>
        </label>

        <div className="field">
          <span>Tags <em className="muted">(up to 5, press Enter or comma)</em></span>
          <div className="tag-input">
            {tags.map((t) => (
              <span key={t} className="tag active">
                #{t}
                {!uploading && (
                  <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
                )}
              </span>
            ))}
            {tags.length < 5 && (
              <input
                value={tagText}
                placeholder={tags.length ? '' : 'e.g. sunset, beach, utp'}
                disabled={uploading}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[,\s]$/.test(v)) commitTags(v);
                  else setTagText(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitTags(); }
                  if (e.key === 'Backspace' && !tagText && tags.length) setTags(tags.slice(0, -1));
                }}
                onBlur={() => tagText && commitTags()}
                aria-label="Add tags"
              />
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {uploading && (
          <div className="progress" aria-label="Upload progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span>{progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Share photo'}
          </button>
        </div>
      </form>
    </div>
  );
}
