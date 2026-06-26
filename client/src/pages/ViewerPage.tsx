import { useState, useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Folder, RotateCcw, RotateCw } from 'lucide-react';
import type { Photo, Theme, User } from '@photo-viewer/shared';
import { AppChrome } from '../components/layout/AppChrome.js';
import { ImageDisplay } from '../components/viewer/ImageDisplay.js';
import { ThumbnailStrip } from '../components/photos/ThumbnailStrip.js';
import { SlideshowControls } from '../components/viewer/SlideshowControls.js';
import { FullscreenWrapper, FullscreenButton } from '../components/viewer/FullscreenWrapper.js';
import { InfoPanel } from '../components/viewer/InfoPanel.js';
import { AlbumPickerButton } from '../components/albums/AlbumPickerButton.js';
import { useToast } from '../components/shared/Toast.js';

interface ViewerPageProps {
  photo: Photo;
  allPhotos: Photo[];
  theme: Theme;
  currentUser: User;
  onBack: () => void;
  onPhotoChange: (photo: Photo) => void;
  onPhotoUpdate: (photoId: string, updates: Partial<Photo>) => void;
  onToggleInfo: () => void;
  showInfo: boolean;
  onHome?: () => void;
}

function updatePhotoArray(items: Photo[] | undefined, photoId: string, updates: Partial<Photo>) {
  if (!items) return items;
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== photoId) return item;
    changed = true;
    return { ...item, ...updates };
  });
  return changed ? next : items;
}

function patchCachedPhotoData(data: unknown, photoId: string, updates: Partial<Photo>): unknown {
  if (!data || typeof data !== 'object') return data;

  const record = data as Record<string, any>;
  let changed = false;
  const next: Record<string, any> = { ...record };

  if (record.photo?.id === photoId) {
    next.photo = { ...record.photo, ...updates };
    changed = true;
  }

  const photos = updatePhotoArray(record.photos, photoId, updates);
  if (photos !== record.photos) {
    next.photos = photos;
    changed = true;
  }

  const results = updatePhotoArray(record.results, photoId, updates);
  if (results !== record.results) {
    next.results = results;
    changed = true;
  }

  if (record.album && typeof record.album === 'object') {
    const album = { ...record.album };
    const albumPhotos = updatePhotoArray(album.photos, photoId, updates);
    const explicitPhotos = updatePhotoArray(album.explicitPhotos, photoId, updates);
    if (albumPhotos !== album.photos) {
      album.photos = albumPhotos;
      changed = true;
    }
    if (explicitPhotos !== album.explicitPhotos) {
      album.explicitPhotos = explicitPhotos;
      changed = true;
    }
    if (changed) next.album = album;
  }

  return changed ? next : data;
}

function updateCachedPhoto(queryClient: QueryClient, photoId: string, updates: Partial<Photo>) {
  queryClient.setQueriesData(
    {
      predicate: (query) => {
        const rootKey = query.queryKey[0];
        return (
          rootKey === 'folder-contents'
          || rootKey === 'search'
          || rootKey === 'album'
          || rootKey === 'photo-detail'
          || rootKey === 'on-this-day'
        );
      },
    },
    (data) => patchCachedPhotoData(data, photoId, updates),
  );
}

function invalidatePhotoCaches(queryClient: QueryClient, photoId: string) {
  queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
  queryClient.invalidateQueries({ queryKey: ['search'] });
  queryClient.invalidateQueries({ queryKey: ['album'] });
  queryClient.invalidateQueries({ queryKey: ['photo-detail', photoId] });
  queryClient.invalidateQueries({ queryKey: ['on-this-day'] });
}

export function ViewerPage({
  photo,
  allPhotos,
  theme,
  currentUser,
  onBack,
  onPhotoChange,
  onPhotoUpdate,
  onToggleInfo,
  showInfo,
  onHome,
}: ViewerPageProps) {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(5);
  const [slideshowLoop, setSlideshowLoop] = useState(true);
  const [localPhoto, setLocalPhoto] = useState(photo);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const orientationSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingOrientationSaveRef = useRef<Promise<void> | null>(null);
  const orientationSaveSeqRef = useRef(0);

  // Sync local photo state with prop
  useEffect(() => {
    setLocalPhoto(photo);
  }, [photo]);

  const currentIndex = allPhotos.findIndex((p) => p.id === localPhoto.id);

  const goNext = useCallback(() => {
    if (currentIndex < allPhotos.length - 1) {
      onPhotoChange(allPhotos[currentIndex + 1]);
    } else if (slideshowPlaying && slideshowLoop) {
      onPhotoChange(allPhotos[0]);
    } else if (slideshowPlaying && !slideshowLoop) {
      setSlideshowPlaying(false);
    }
  }, [currentIndex, allPhotos, onPhotoChange, slideshowPlaying, slideshowLoop]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onPhotoChange(allPhotos[currentIndex - 1]);
    }
  }, [currentIndex, allPhotos, onPhotoChange]);

  useHotkeys('right', goNext, [goNext]);
  useHotkeys('left', goPrev, [goPrev]);
  const handleBack = useCallback(() => {
    const pendingSave = pendingOrientationSaveRef.current;
    if (!pendingSave) {
      onBack();
      return;
    }
    pendingSave.finally(onBack);
  }, [onBack]);

  useHotkeys('escape', handleBack, [handleBack]);
  useHotkeys('i', onToggleInfo, [onToggleInfo]);

  useEffect(() => {
    if (slideshowPlaying) {
      intervalRef.current = setInterval(goNext, slideshowInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slideshowPlaying, slideshowInterval, goNext]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/photos/${localPhoto.id}/original`;
    link.download = localPhoto.filename;
    link.click();
  };

  const applyPhotoUpdate = useCallback((photoId: string, updates: Partial<Photo>) => {
    setLocalPhoto((prev) => prev.id === photoId ? { ...prev, ...updates } : prev);
    onPhotoUpdate(photoId, updates);
    updateCachedPhoto(queryClient, photoId, updates);
  }, [onPhotoUpdate, queryClient]);

  const handlePhotoUpdate = useCallback((updates: Partial<Photo>) => {
    applyPhotoUpdate(localPhoto.id, updates);
  }, [applyPhotoUpdate, localPhoto.id]);

  const handleRotate = useCallback(async (delta: 90 | -90) => {
    const photoId = localPhoto.id;
    const previousOrientation = localPhoto.orientationDeg ?? 0;
    const orientationDeg = ((previousOrientation + delta + 360) % 360) as Photo['orientationDeg'];
    const saveSeq = orientationSaveSeqRef.current + 1;
    orientationSaveSeqRef.current = saveSeq;
    applyPhotoUpdate(photoId, { orientationDeg });

    const savePromise = orientationSaveChainRef.current.catch(() => undefined).then(async () => {
      const res = await fetch(`/api/photos/${photoId}/orientation`, {
        method: 'PATCH',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orientationDeg }),
      });
      if (!res.ok) throw new Error('Request failed');
      invalidatePhotoCaches(queryClient, photoId);
    });

    const trackedPromise = savePromise.catch(() => {
      if (orientationSaveSeqRef.current === saveSeq) {
        applyPhotoUpdate(photoId, { orientationDeg: previousOrientation });
        showError('Failed to save image orientation');
      }
    }).finally(() => {
      if (pendingOrientationSaveRef.current === trackedPromise) {
        pendingOrientationSaveRef.current = null;
      }
    });

    orientationSaveChainRef.current = trackedPromise;
    pendingOrientationSaveRef.current = trackedPromise;

    try {
      await trackedPromise;
    } catch {
      // Save errors are handled in the tracked promise so exit can still await it safely.
    }
  }, [applyPhotoUpdate, localPhoto.id, localPhoto.orientationDeg, queryClient, showError]);


  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <FullscreenWrapper>
          <AppChrome
            homeTitle="Home"
            onHome={onHome}
            onNavigateToPhoto={async (photoId) => {
              try {
                const res = await fetch(`/api/photos/${photoId}`, { credentials: 'include' });
                if (!res.ok) return;
                const body = await res.json();
                if (body?.photo) onPhotoChange(body.photo);
              } catch {}
            }}
          />

          {/* Toolbar: return to gallery, folder context, and photo actions */}
          <div className="viewer-toolbar-row">
            <div className="viewer-context-toolbar" aria-label="Gallery context">
              <button className="btn btn-ghost viewer-gallery-button" onClick={handleBack}>
                <ArrowLeft size={16} /> Gallery
              </button>
              <div className="viewer-folder-label" title={localPhoto.folderPath || 'Library'}>
                <Folder size={15} />
                <span>{localPhoto.folderPath || 'Library'}</span>
              </div>
              <span className="viewer-count-label">
                {currentIndex + 1} of {allPhotos.length}
              </span>
            </div>

            <div className="viewer-action-toolbar" aria-label="Photo actions">
              <SlideshowControls
                isPlaying={slideshowPlaying}
                interval={slideshowInterval}
                loop={slideshowLoop}
                onToggle={() => setSlideshowPlaying(!slideshowPlaying)}
                onIntervalChange={setSlideshowInterval}
                onLoopChange={setSlideshowLoop}
                buttonClassName="viewer-icon-button"
                iconSize={20}
              />
              <button
                className="btn btn-ghost viewer-icon-button"
                onClick={() => handleRotate(-90)}
                title="Rotate counter-clockwise"
                aria-label="Rotate counter-clockwise"
              >
                <RotateCcw size={20} />
              </button>
              <button
                className="btn btn-ghost viewer-icon-button"
                onClick={() => handleRotate(90)}
                title="Rotate clockwise"
                aria-label="Rotate clockwise"
              >
                <RotateCw size={20} />
              </button>
              <button className="btn btn-ghost viewer-icon-button" onClick={handleDownload} title="Download original" aria-label="Download original">
                <Download size={20} />
              </button>
              <AlbumPickerButton
                photoId={localPhoto.id}
                label="Add to album"
                rootClassName="viewer-album-action"
                buttonClassName="viewer-icon-button"
                iconSize={20}
              />
              <button
                className={`btn btn-ghost viewer-icon-button viewer-info-button${showInfo ? ' viewer-icon-button-active' : ''}`}
                onClick={onToggleInfo}
                title={showInfo ? 'Hide photo information' : 'Show photo information'}
                aria-label={showInfo ? 'Hide photo information' : 'Show photo information'}
                aria-pressed={showInfo}
              >
                i
              </button>
            </div>
            <div className="viewer-toolbar-spacer" aria-hidden="true" />
          </div>

          {/* Main image */}
          <ImageDisplay photo={localPhoto} theme={theme} />

          {/* Caption */}
          {localPhoto.caption && (
            <div style={{ textAlign: 'center', padding: '4px 16px 8px', fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {localPhoto.caption}
            </div>
          )}

          {/* Fullscreen button */}
          <FullscreenButton />

          {/* Thumbnail strip */}
          <ThumbnailStrip
            photos={allPhotos}
            currentPhotoId={localPhoto.id}
            onSelect={onPhotoChange}
          />
        </FullscreenWrapper>
      </div>

      {/* Info panel */}
      {showInfo && (
        <InfoPanel
          key={localPhoto.id}
          photo={localPhoto}
          currentUser={currentUser}
          onClose={onToggleInfo}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}
    </div>
  );
}
