import { useState, useCallback, useRef } from 'react';
import type { Photo, SortField, SortOrder } from '@photo-viewer/shared';
import { useFolderContents } from '../hooks/useFolders.js';
import { AppChrome } from '../components/layout/AppChrome.js';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.js';
import { FolderCard } from '../components/photos/FolderCard.js';
import { ThumbnailGrid } from '../components/photos/ThumbnailGrid.js';
import { SearchBar } from '../components/search/SearchBar.js';
import { OnThisDayBanner } from '../components/shared/OnThisDayBanner.js';

interface BrowsePageProps {
  folderPath: string;
  onNavigate: (path: string) => void;
  onPhotoSelect: (photo: Photo, allPhotos: Photo[]) => void;
  onSearch: (query: string) => void;
  onHome: () => void;
  onShowActivity?: () => void;
}

export function BrowsePage({ folderPath, onNavigate, onPhotoSelect, onSearch, onHome, onShowActivity }: BrowsePageProps) {
  const [sort, setSort] = useState<SortField>('filename');
  const [order, setOrder] = useState<SortOrder>('asc');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useFolderContents(folderPath, sort, order);
  const visibleSubfolders = data?.subfolders.filter((folder) => folder.photoCount > 0) ?? [];

  const handlePhotoClick = useCallback((photo: Photo) => {
    if (data?.photos) {
      onPhotoSelect(photo, data.photos);
    }
  }, [data?.photos, onPhotoSelect]);

  return (
    <div style={{ height: '100vh', width: '100%', minWidth: 0, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppChrome
        homeTitle={folderPath ? 'Go to parent folder' : 'Home'}
        onHome={onHome}
        onActivity={onShowActivity}
        onNavigateToPhoto={async (photoId) => {
          try {
            const res = await fetch(`/api/photos/${photoId}`, { credentials: 'include' });
            if (!res.ok) return;
            const body = await res.json();
            if (body?.photo) onPhotoSelect(body.photo, [body.photo]);
          } catch {}
        }}
      />

      <div className="browse-taskbar">
        <div className="browse-taskbar-breadcrumbs">
          {data?.breadcrumbs && (
            <Breadcrumbs crumbs={data.breadcrumbs} onNavigate={onNavigate} />
          )}
        </div>
        <div className="browse-taskbar-search">
          <SearchBar onSearch={onSearch} onClear={() => {}} isSearching={false} />
        </div>
        <div className="browse-taskbar-actions">
          <select
            className="input"
            style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split('-') as [SortField, SortOrder];
              setSort(s);
              setOrder(o);
            }}
          >
            <option value="filename-asc">Name A-Z</option>
            <option value="filename-desc">Name Z-A</option>
            <option value="date-asc">Date oldest</option>
            <option value="date-desc">Date newest</option>
            <option value="timeline-asc">Timeline</option>
            <option value="annotation-asc">Needs annotation</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', padding: 24 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>
            Failed to load folder contents.
            <button className="btn btn-ghost" onClick={() => refetch()} style={{ marginLeft: 8 }}>Retry</button>
          </div>
        )}

        {data && (
          <>
            {/* On This Day — only at Library root */}
            {!folderPath && <OnThisDayBanner />}

            {/* Subfolders */}
            {visibleSubfolders.length > 0 && (
              <section style={{ marginBottom: data.photos.length > 0 ? 18 : 0 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                  Folders ({visibleSubfolders.length})
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}>
                  {visibleSubfolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} onClick={() => onNavigate(folder.path)} />
                  ))}
                </div>
              </section>
            )}

            {/* Photos */}
            {visibleSubfolders.length > 0 && data.photos.length > 0 && (
              <div
                aria-hidden="true"
                style={{
                  borderTop: '1px solid var(--border-color)',
                  margin: '0 0 18px',
                }}
              />
            )}
            <section style={{ minWidth: 0 }}>
              {data.photos.length > 0 && (
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                  Photos ({data.totalPhotos})
                </h2>
              )}
              <ThumbnailGrid
                photos={data.photos}
                onPhotoClick={handlePhotoClick}
                scrollContainerRef={scrollContainerRef}
                timeline={sort === 'timeline'}
              />
            </section>

            {visibleSubfolders.length === 0 && data.photos.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: 12 }}>This folder is empty.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
