import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Settings, Activity } from 'lucide-react';
import type { Photo, SortField, SortOrder } from '@photo-viewer/shared';
import { useCurrentUser, useLogout } from '../hooks/useAuth.js';
import { useFolderContents, useTriggerIndex } from '../hooks/useFolders.js';
import { useTheme } from '../hooks/useTheme.js';
import { Breadcrumbs } from '../components/layout/Breadcrumbs.js';
import { FolderCard } from '../components/photos/FolderCard.js';
import { ThumbnailGrid } from '../components/photos/ThumbnailGrid.js';
import { SearchBar } from '../components/search/SearchBar.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

interface BrowsePageProps {
  folderPath: string;
  onNavigate: (path: string) => void;
  onPhotoSelect: (photo: Photo, allPhotos: Photo[]) => void;
  onSearch: (query: string) => void;
  onShowActivity: () => void;
}

export function BrowsePage({ folderPath, onNavigate, onPhotoSelect, onSearch, onShowActivity }: BrowsePageProps) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const logout = useLogout();
  const triggerIndex = useTriggerIndex();
  const { theme, toggleTheme } = useTheme();
  const [sort, setSort] = useState<SortField>('filename');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [indexProgress, setIndexProgress] = useState<{ phase: string; scannedFolders: number; scannedFiles: number; indexedFiles: number; totalFiles: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useFolderContents(folderPath, sort, order);

  const handlePhotoClick = useCallback((photo: Photo) => {
    if (data?.photos) {
      onPhotoSelect(photo, data.photos);
    }
  }, [data?.photos, onPhotoSelect]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/index/progress', { credentials: 'include' });
        const progress = await res.json();
        setIndexProgress(progress);
        if (progress.phase === 'complete') {
          clearInterval(pollRef.current);
          pollRef.current = undefined;
          refetch();
          setTimeout(() => setIndexProgress(null), 3000);
        }
      } catch {}
    }, 500);
  }, [refetch]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleIndex = () => {
    setIndexProgress({ phase: 'scanning', scannedFolders: 0, scannedFiles: 0, indexedFiles: 0, totalFiles: 0 });
    triggerIndex.mutate(folderPath || undefined, {
      onSuccess: () => startPolling(),
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '10px 24px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{folderPath ? 'Gallery' : 'Library'}</h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {data?.breadcrumbs && (
            <Breadcrumbs crumbs={data.breadcrumbs} onNavigate={onNavigate} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 200 }}>
            <SearchBar onSearch={onSearch} onClear={() => {}} isSearching={false} />
          </div>
          <button className="btn btn-ghost" onClick={handleIndex} disabled={triggerIndex.isPending}
            style={{ padding: '4px 8px', fontSize: 13 }}>
            <RefreshCw size={14} className={triggerIndex.isPending ? 'spinning' : ''} /> Index
          </button>
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
            <option value="annotation-asc">Needs annotation</option>
          </select>
          <button className="btn btn-ghost" onClick={onShowActivity} style={{ padding: '4px 8px' }} title="Activity">
            <Activity size={14} />
          </button>
          {user.data?.role === 'admin' && (
            <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ padding: '4px 8px' }}>
              <Settings size={14} />
            </button>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.data?.displayName}</span>
          <button className="btn btn-ghost" onClick={() => logout.mutate()} style={{ padding: '4px 8px', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </header>

      {/* Index Progress */}
      {indexProgress && (
        <div style={{
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {indexProgress.phase === 'scanning' && `Scanning folders... ${indexProgress.scannedFolders} folders, ${indexProgress.scannedFiles} files found`}
              {indexProgress.phase === 'indexing' && `Indexing... ${indexProgress.indexedFiles} of ${indexProgress.totalFiles} files`}
              {indexProgress.phase === 'complete' && `Indexing complete — ${indexProgress.totalFiles} files processed`}
            </span>
            {indexProgress.phase === 'complete' && (
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>Done</span>
            )}
          </div>
          {indexProgress.phase === 'indexing' && indexProgress.totalFiles > 0 && (
            <div style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--bg-tertiary)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.round((indexProgress.indexedFiles / indexProgress.totalFiles) * 100)}%`,
                background: 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflow: 'auto', padding: 24 }}>
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
            {/* Subfolders */}
            {data.subfolders.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                  Folders ({data.subfolders.length})
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}>
                  {data.subfolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} onClick={() => onNavigate(folder.path)} />
                  ))}
                </div>
              </section>
            )}

            {/* Photos */}
            <section>
              {data.photos.length > 0 && (
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                  Photos ({data.totalPhotos})
                </h2>
              )}
              <ThumbnailGrid photos={data.photos} onPhotoClick={handlePhotoClick} scrollContainerRef={scrollContainerRef} />
            </section>

            {data.subfolders.length === 0 && data.photos.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: 12 }}>This folder is empty.</p>
                <button className="btn btn-primary" onClick={handleIndex}>
                  <RefreshCw size={14} /> Run Indexer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
