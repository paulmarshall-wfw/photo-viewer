import type { Photo } from '@photo-viewer/shared';
import { PhotoCard } from './PhotoCard.js';

interface ThumbnailGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}

export function ThumbnailGrid({ photos, onPhotoClick }: ThumbnailGridProps) {
  if (photos.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No photos in this folder
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 14,
    }}>
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
      ))}
    </div>
  );
}
