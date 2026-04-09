import { useRef, useEffect } from 'react';
import type { Photo } from '@photo-viewer/shared';

interface ThumbnailStripProps {
  photos: Photo[];
  currentPhotoId: string;
  onSelect: (photo: Photo) => void;
}

export function ThumbnailStrip({ photos, currentPhotoId, onSelect }: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPhotoId]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        padding: '10px 20px',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        scrollbarWidth: 'thin',
      }}
    >
      {photos.map((photo) => {
        const isActive = photo.id === currentPhotoId;
        return (
          <button
            key={photo.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(photo)}
            style={{
              flexShrink: 0,
              width: 64,
              height: 48,
              padding: 0,
              border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 6,
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
              cursor: 'pointer',
              opacity: isActive ? 1 : 0.7,
              transition: 'opacity 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.opacity = '0.7'; }}
          >
            <img
              src={`/api/photos/${photo.id}/thumbnail?v=${encodeURIComponent(photo.fileModifiedAt)}`}
              alt={photo.filename}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        );
      })}
    </div>
  );
}
