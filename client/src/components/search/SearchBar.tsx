import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export function SearchBar({ onSearch, onClear, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Search size={14} style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
        <input
          className="input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photos..."
          style={{ paddingLeft: 28, fontSize: 13, height: 32 }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {isSearching && (
        <button className="btn btn-ghost" onClick={handleClear} style={{ padding: '4px 8px', fontSize: 12 }}>
          Clear
        </button>
      )}
    </form>
  );
}
