import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photo, Theme } from '@photo-viewer/shared';

interface ImageDisplayProps {
  photo: Photo;
  theme: Theme;
}

export function ImageDisplay({ photo }: ImageDisplayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({
    width: photo.width ?? 0,
    height: photo.height ?? 0,
  });
  const orientationDeg = photo.orientationDeg ?? 0;
  const rotatedQuarterTurn = orientationDeg === 90 || orientationDeg === 270;

  useEffect(() => {
    setNaturalSize({ width: photo.width ?? 0, height: photo.height ?? 0 });
  }, [photo.id, photo.width, photo.height]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const resize = () => {
      const rect = node.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const imageSize = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !naturalSize.width || !naturalSize.height) {
      return null;
    }

    const effectiveWidth = rotatedQuarterTurn ? naturalSize.height : naturalSize.width;
    const effectiveHeight = rotatedQuarterTurn ? naturalSize.width : naturalSize.height;
    const scale = Math.min(containerSize.width / effectiveWidth, containerSize.height / effectiveHeight, 1);

    return {
      width: Math.max(1, Math.round(naturalSize.width * scale)),
      height: Math.max(1, Math.round(naturalSize.height * scale)),
    };
  }, [containerSize.height, containerSize.width, naturalSize.height, naturalSize.width, rotatedQuarterTurn]);

  return (
    <div ref={wrapRef} style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      minHeight: 0,
      overflow: 'hidden',
    }}>
      <img
        src={`/api/photos/${photo.id}/preview?v=${encodeURIComponent(photo.indexedAt)}`}
        alt={photo.title || photo.filename}
        onLoad={(event) => {
          const img = event.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          }
        }}
        style={{
          width: imageSize?.width,
          height: imageSize?.height,
          maxWidth: imageSize ? undefined : '100%',
          maxHeight: imageSize ? undefined : '100%',
          objectFit: 'contain',
          display: 'block',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-ambient)',
          transform: `rotate(${orientationDeg}deg)`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
}
