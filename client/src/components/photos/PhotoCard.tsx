import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import type { Photo } from '@photo-viewer/shared';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
}

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [hovered, setHovered] = useState(false);
  const displayName = photo.filename;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        overflow: 'visible',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        setHovered(true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
        setHovered(false);
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
        <img
          src={`/api/photos/${photo.id}/thumbnail?v=${encodeURIComponent(photo.fileModifiedAt)}`}
          alt={photo.title || photo.filename}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            boxShadow: 'var(--image-glow)',
          }}
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

      {/* Full filename tooltip on hover */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% - 2px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontWeight: 500,
          padding: '5px 10px',
          borderRadius: 'var(--radius)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--glass-border)',
          maxWidth: 280,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: 0.95,
        }}>
          {displayName}
        </div>
      )}
    </button>
  );
}
