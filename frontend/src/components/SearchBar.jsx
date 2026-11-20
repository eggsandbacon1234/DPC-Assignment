import { useEffect, useState } from 'react';

// Waits until the user stops typing (300ms) before searching,
// so we don't call the backend on every keystroke.
export default function SearchBar({ value, onChange, placeholder = 'Search titles, tags, users or comments…' }) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label="Search photos"
      />
      {text && (
        <button type="button" className="search-clear" onClick={() => { setText(''); onChange(''); }} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  );
}
