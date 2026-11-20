export const DEFAULT_FILTERS = { owner: 'all', userId: 'all', tag: '', period: 'all', sort: 'newest' };

export default function FilterBar({ filters, onChange, users = [], tags = [] }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const isDefault = Object.keys(DEFAULT_FILTERS).every((k) => filters[k] === DEFAULT_FILTERS[k]);
  const popular = tags.slice(0, 8);

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="segmented" role="group" aria-label="Whose photos">
          {[['all', 'Everyone'], ['mine', 'My photos']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={filters.owner === val ? 'active' : ''}
              onClick={() => onChange({ ...filters, owner: val, userId: 'all' })}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="filter-field">
          <span>Posted by</span>
          <select value={filters.userId} onChange={set('userId')} disabled={filters.owner === 'mine'}>
            <option value="all">Anyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>@{u.username}</option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Date</span>
          <select value={filters.period} onChange={set('period')}>
            <option value="all">Any time</option>
            <option value="today">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </label>

        <label className="filter-field">
          <span>Sort</span>
          <select value={filters.sort} onChange={set('sort')}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="most_commented">Most commented</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>

        {!isDefault && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(DEFAULT_FILTERS)}>
            Reset filters
          </button>
        )}
      </div>

      {(popular.length > 0 || filters.tag) && (
        <div className="tag-row" aria-label="Filter by tag">
          <span className="tag-row-label">Tags</span>
          {filters.tag && !popular.some((t) => t.name === filters.tag) && (
            <button type="button" className="tag active" onClick={() => onChange({ ...filters, tag: '' })}>
              #{filters.tag} ×
            </button>
          )}
          {popular.map((t) => {
            const active = filters.tag === t.name;
            return (
              <button
                key={t.name}
                type="button"
                className={`tag ${active ? 'active' : ''}`}
                onClick={() => onChange({ ...filters, tag: active ? '' : t.name })}
              >
                #{t.name}{active ? ' ×' : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
