import { useState, useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ArrowLeft, Download, BookOpen, Settings, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Photo, Theme, User } from '@photo-viewer/shared';
import { ImageDisplay } from '../components/viewer/ImageDisplay.js';
import { ThumbnailStrip } from '../components/photos/ThumbnailStrip.js';
import { SlideshowControls } from '../components/viewer/SlideshowControls.js';
import { FullscreenWrapper, FullscreenButton } from '../components/viewer/FullscreenWrapper.js';
import { InfoPanel } from '../components/viewer/InfoPanel.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';
import { NotificationBell } from '../components/shared/NotificationBell.js';
import { useTheme } from '../hooks/useTheme.js';
import { useLogout } from '../hooks/useAuth.js';

interface ViewerPageProps {
  photo: Photo;
  allPhotos: Photo[];
  theme: Theme;
  currentUser: User;
  onBack: () => void;
  onPhotoChange: (photo: Photo) => void;
  onToggleInfo: () => void;
  showInfo: boolean;
}

export function ViewerPage({
  photo,
  allPhotos,
  theme,
  currentUser,
  onBack,
  onPhotoChange,
  onToggleInfo,
  showInfo,
}: ViewerPageProps) {
  const navigate = useNavigate();
  const { theme: currentTheme, toggleTheme } = useTheme();
  const logout = useLogout();
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(5);
  const [slideshowLoop, setSlideshowLoop] = useState(true);
  const [localPhoto, setLocalPhoto] = useState(photo);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

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
  useHotkeys('escape', onBack, [onBack]);
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

  const handlePhotoUpdate = (updates: Partial<Photo>) => {
    setLocalPhoto((prev) => ({ ...prev, ...updates }));
  };


  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <FullscreenWrapper>
          {/* Top bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
                <ArrowLeft size={16} /> Gallery
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {currentIndex + 1} of {allPhotos.length}
              </span>
            </div>

            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              pointerEvents: 'none',
            }}>
              Viewer
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NotificationBell
                onNavigateToPhoto={async (photoId) => {
                  try {
                    const res = await fetch(`/api/photos/${photoId}`, { credentials: 'include' });
                    if (!res.ok) return;
                    const body = await res.json();
                    if (body?.photo) onPhotoChange(body.photo);
                  } catch {}
                }}
              />
              <ThemeToggle theme={currentTheme} onToggle={toggleTheme} />
              {currentUser.role === 'admin' && (
                <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ padding: '4px 8px' }}>
                  <Settings size={14} />
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => navigate('/readme')} style={{ padding: '4px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookOpen size={14} /> Read Me
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{currentUser.displayName}</span>
              <button className="btn btn-ghost" onClick={() => logout.mutate()} style={{ padding: '4px 8px', fontSize: 13 }}>
                Logout
              </button>
            </div>
          </div>

          {/* Title row: folder (left) + photo title (center) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 20px 4px',
            flexShrink: 0,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Folder size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {localPhoto.folderPath || 'Library'}
              </span>
            </div>
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: localPhoto.title ? 'var(--text-primary)' : 'var(--text-muted)',
              maxWidth: '60%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textAlign: 'center',
            }}>
              {localPhoto.title || localPhoto.filename}
            </div>
            <div style={{ flex: 1 }} />
          </div>

          {/* Centred toolbar: slideshow, download, info */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            padding: '4px 0 8px',
            flexShrink: 0,
          }}>
            <SlideshowControls
              isPlaying={slideshowPlaying}
              interval={slideshowInterval}
              loop={slideshowLoop}
              onToggle={() => setSlideshowPlaying(!slideshowPlaying)}
              onIntervalChange={setSlideshowInterval}
              onLoopChange={setSlideshowLoop}
            />
            <button className="btn btn-ghost" onClick={handleDownload} style={{ padding: '4px 8px' }} title="Download original">
              <Download size={16} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={onToggleInfo}
              style={{
                padding: '4px 10px',
                fontSize: 16,
                fontWeight: 600,
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                background: 'var(--accent)',
                color: '#fff',
              }}
              title="Photo information"
            >
              i
            </button>
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
