import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Photo } from '@photo-viewer/shared';
import { PhotoCard } from './PhotoCard.js';

interface ThumbnailGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  timeline?: boolean;
}

const ITEM_MIN_WIDTH = 160;
const GAP = 14;
const ROW_HEIGHT = 180;
const MARKER_HEIGHT = 52;

type Row =
  | { type: 'marker'; label: string; key: string }
  | { type: 'photos'; photos: Photo[]; key: string };

function yearOf(p: Photo): number | null {
  if (!p.dateTaken) return null;
  const y = parseInt(p.dateTaken.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

function decadeLabel(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

function buildTimelineRows(photos: Photo[], columnCount: number): Row[] {
  const rows: Row[] = [];

  // Group by year bucket: real year, or "undated"
  const groups = new Map<string, Photo[]>();
  const order: string[] = [];
  for (const p of photos) {
    const y = yearOf(p);
    const key = y == null ? 'undated' : String(y);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(p);
  }

  let lastDecade: string | null = null;
  for (const key of order) {
    if (key !== 'undated') {
      const year = parseInt(key, 10);
      const dec = decadeLabel(year);
      if (dec !== lastDecade) {
        rows.push({ type: 'marker', label: dec, key: `dec-${dec}` });
        lastDecade = dec;
      }
      rows.push({ type: 'marker', label: String(year), key: `year-${year}` });
    } else {
      rows.push({ type: 'marker', label: 'Undated', key: 'marker-undated' });
    }
    const group = groups.get(key)!;
    for (let i = 0; i < group.length; i += columnCount) {
      rows.push({
        type: 'photos',
        photos: group.slice(i, i + columnCount),
        key: `row-${key}-${i}`,
      });
    }
  }

  return rows;
}

export function ThumbnailGrid({ photos, onPhotoClick, scrollContainerRef, timeline = false }: ThumbnailGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);
  const [scrollMargin, setScrollMargin] = useState(0);

  const updateColumns = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const cols = Math.max(1, Math.floor((width + GAP) / (ITEM_MIN_WIDTH + GAP)));
    setColumnCount(cols);

    const parent = scrollContainerRef?.current;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setScrollMargin(elRect.top - parentRect.top + parent.scrollTop);
    } else {
      setScrollMargin(0);
    }
  }, [scrollContainerRef]);

  useEffect(() => {
    updateColumns();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateColumns);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateColumns]);

  const timelineRows: Row[] = useMemo(
    () => (timeline ? buildTimelineRows(photos, columnCount) : []),
    [timeline, photos, columnCount],
  );

  const rowCount = timeline ? timelineRows.length : Math.ceil(photos.length / columnCount);

  const parentElement = scrollContainerRef?.current ?? null;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentElement,
    scrollMargin,
    estimateSize: (index) => {
      if (timeline) {
        const r = timelineRows[index];
        return r?.type === 'marker' ? MARKER_HEIGHT : ROW_HEIGHT;
      }
      return ROW_HEIGHT;
    },
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
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          if (timeline) {
            const row = timelineRows[virtualRow.index];
            if (!row) return null;
            if (row.type === 'marker') {
              const isDecade = row.key.startsWith('dec-');
              return (
                <div
                  key={row.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                    padding: isDecade ? '20px 0 8px' : '10px 0 6px',
                    fontFamily: 'var(--font-display)',
                    fontSize: isDecade ? 22 : 14,
                    fontWeight: isDecade ? 700 : 600,
                    color: isDecade ? 'var(--text-primary)' : 'var(--text-muted)',
                    letterSpacing: isDecade ? '-0.02em' : '0.04em',
                    textTransform: isDecade ? 'none' : 'uppercase',
                  }}
                >
                  {row.label}
                </div>
              );
            }
            return (
              <div
                key={row.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  gap: GAP,
                  paddingBottom: GAP,
                }}
              >
                {row.photos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
                ))}
              </div>
            );
          }

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
                maxWidth: '100%',
                minWidth: 0,
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
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
