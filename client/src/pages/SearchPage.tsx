import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import type { Photo } from '@photo-viewer/shared';
import { AppChrome } from '../components/layout/AppChrome.js';
import { FilterPanel } from '../components/search/FilterPanel.js';
import { ThumbnailGrid } from '../components/photos/ThumbnailGrid.js';

interface SearchPageProps {
  initialQuery: string;
  onBack: () => void;
  onHome: () => void;
  onSearch: (query: string) => void;
  onPhotoSelect: (photo: Photo, allPhotos: Photo[]) => void;
}

export function SearchPage({ initialQuery, onBack, onHome, onSearch, onPhotoSelect }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [needsTitle, setNeedsTitle] = useState(false);
  const [needsCaption, setNeedsCaption] = useState(false);
  const [needsStory, setNeedsStory] = useState(false);

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (needsTitle) params.set('needsTitle', 'true');
  if (needsCaption) params.set('needsCaption', 'true');
  if (needsStory) params.set('needsStory', 'true');

  const searchQuery = useQuery<{ results: (Photo & { folderName: string })[]; total: number }>({
    queryKey: ['search', query, dateFrom, dateTo, needsTitle, needsCaption, needsStory],
    queryFn: async () => {
      const res = await fetch(`/api/search?${params.toString()}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!(query || dateFrom || dateTo || needsTitle || needsCaption || needsStory),
  });

  const handlePhotoClick = useCallback((photo: Photo) => {
    const allPhotos = searchQuery.data?.results || [];
    onPhotoSelect(photo, allPhotos);
  }, [searchQuery.data, onPhotoSelect]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = draftQuery.trim();
    if (!nextQuery) return;
    setQuery(nextQuery);
    onSearch(nextQuery);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppChrome onHome={onHome} />

      <div className="search-taskbar">
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <form className="search-taskbar-form" onSubmit={handleSearchSubmit}>
          <Search size={14} className="search-taskbar-icon" />
          <input
            className="input"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Search photos..."
            style={{ height: 34, paddingLeft: 30, fontSize: 13 }}
          />
        </form>
        <span className="search-result-count">
          {searchQuery.data && (
            `${searchQuery.data.total} result${searchQuery.data.total !== 1 ? 's' : ''}`
          )}
        </span>
      </div>

      <div style={{ padding: '0 24px' }}>
        <FilterPanel
          dateFrom={dateFrom} dateTo={dateTo}
          needsTitle={needsTitle} needsCaption={needsCaption} needsStory={needsStory}
          onDateFromChange={setDateFrom} onDateToChange={setDateTo}
          onNeedsTitleChange={setNeedsTitle} onNeedsCaptionChange={setNeedsCaption}
          onNeedsStoryChange={setNeedsStory}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {searchQuery.isLoading && <p style={{ color: 'var(--text-muted)' }}>Searching...</p>}
        {searchQuery.data && (
          <ThumbnailGrid photos={searchQuery.data.results} onPhotoClick={handlePhotoClick} />
        )}
      </div>
    </div>
  );
}
