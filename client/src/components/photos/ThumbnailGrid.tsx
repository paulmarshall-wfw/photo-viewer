import { useRef, useState, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Photo } from '@photo-viewer/shared';
import { PhotoCard } from './PhotoCard.js';

interface ThumbnailGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

const ITEM_MIN_WIDTH = 160;
const GAP = 14;
// PhotoCard has 75% aspect ratio image + ~48px label area + gap
const ROW_HEIGHT = 180;

export function ThumbnailGrid({ photos, onPhotoClick, scrollContainerRef }: ThumbnailGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);

  const updateColumns = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    // Match CSS: repeat(auto-fill, minmax(160px, 1fr))
    const cols = Math.max(1, Math.floor((width + GAP) / (ITEM_MIN_WIDTH + GAP)));
    setColumnCount(cols);
  }, []);

  useEffect(() => {
    updateColumns();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateColumns);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateColumns]);

  const rowCount = Math.ceil(photos.length / columnCount);

  const parentElement = scrollContainerRef?.current ?? null;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  if (photos.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No photos in this folder
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div ref={containerRef}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowPhotos = photos.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: GAP,
                paddingBottom: GAP,
              }}
            >
              {rowPhotos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
