import { Heart, MessageCircle } from 'lucide-react';
import type { Photo } from '@photo-viewer/shared';
import { AlbumPickerButton } from '../albums/AlbumPickerButton.js';
import { OrientedThumbnailImage } from './OrientedThumbnailImage.js';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const displayName = photo.filename;

  return (
    <div
      className="album-card-shell"
      style={{
        position: 'relative',
      }}
    >
      <button
        className="focus-card photo-card-button"
        onClick={onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'visible',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          position: 'relative',
          width: '100%',
        }}
      >
      <div style={{
        width: '100%',
        paddingTop: '75%',
        position: 'relative',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        overflow: 'hidden',
      }}>
        <OrientedThumbnailImage
          photo={photo}
          alt={photo.title || photo.filename}
          style={{ position: 'absolute', inset: 0 }}
        />
      </div>
      <div style={{ padding: '8px 10px', minHeight: 40, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-secondary)', width: '100%' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {displayName}
        </div>
        {photo.caption && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}>
            {photo.caption}
          </div>
        )}
        {((photo.reactionCount ?? 0) > 0 || (photo.commentCount ?? 0) > 0) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            {(photo.reactionCount ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Heart size={11} /> {photo.reactionCount}
              </span>
            )}
            {(photo.commentCount ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MessageCircle size={11} /> {photo.commentCount}
              </span>
            )}
          </div>
        )}
      </div>

      </button>
      <div className="album-card-action" style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
        <AlbumPickerButton photoId={photo.id} />
      </div>
    </div>
  );
}
