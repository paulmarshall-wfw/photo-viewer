import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Photo } from '@photo-viewer/shared';

interface OrientedThumbnailImageProps {
  photo: Photo;
  alt?: string;
  loading?: 'eager' | 'lazy';
  fit?: 'cover' | 'contain';
  version?: string;
  style?: CSSProperties;
}

export function OrientedThumbnailImage({
  photo,
  alt,
  loading = 'lazy',
  fit = 'cover',
  version = photo.fileModifiedAt,
  style,
}: OrientedThumbnailImageProps) {
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
    const widthScale = containerSize.width / effectiveWidth;
    const heightScale = containerSize.height / effectiveHeight;
    const scale = fit === 'cover' ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);

    return {
      width: Math.max(1, Math.round(naturalSize.width * scale)),
      height: Math.max(1, Math.round(naturalSize.height * scale)),
    };
  }, [containerSize.height, containerSize.width, fit, naturalSize.height, naturalSize.width, rotatedQuarterTurn]);

  const params = version ? `?v=${encodeURIComponent(version)}` : '';

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        src={`/api/photos/${photo.id}/thumbnail${params}`}
        alt={alt ?? photo.title ?? photo.filename}
        loading={loading}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: imageSize?.width ?? '100%',
          height: imageSize?.height ?? '100%',
          objectFit: fit,
          transform: `translate(-50%, -50%) rotate(${orientationDeg}deg)`,
          transformOrigin: 'center center',
          boxShadow: 'var(--image-glow)',
        }}
      />
    </div>
  );
}
