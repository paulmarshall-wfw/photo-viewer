import type { Photo, Theme } from '@photo-viewer/shared';

interface ImageDisplayProps {
  photo: Photo;
  theme: Theme;
}

export function ImageDisplay({ photo }: ImageDisplayProps) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      minHeight: 0,
    }}>
      <div style={{
        lineHeight: 0,
        maxWidth: '100%',
        maxHeight: '100%',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-ambient)',
      }}>
        <img
          src={`/api/photos/${photo.id}/preview`}
          alt={photo.title || photo.filename}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
