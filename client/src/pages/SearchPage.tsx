import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Photo } from '@photo-viewer/shared';
import { FilterPanel } from '../components/search/FilterPanel.js';
import { ThumbnailGrid } from '../components/photos/ThumbnailGrid.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';
import { useTheme } from '../hooks/useTheme.js';

interface SearchPageProps {
  initialQuery: string;
  onBack: () => void;
  onPhotoSelect: (photo: Photo, allPhotos: Photo[]) => void;
}

export function SearchPage({ initialQuery, onBack, onPhotoSelect }: SearchPageProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query] = useState(initialQuery);
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

  const searchQuery = useQuery<{ results: (Photo & { folder_name: string })[]; total: number }>({
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '10px 24px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Search
        </h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <button className="btn btn-ghost" onClick={() => navigate('/readme')} style={{ padding: '4px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <BookOpen size={14} /> Read Me
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          "{query}"
          {searchQuery.data && (
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 14, marginLeft: 8 }}>
              ({searchQuery.data.total} result{searchQuery.data.total !== 1 ? 's' : ''})
            </span>
          )}
        </span>
      </header>

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
