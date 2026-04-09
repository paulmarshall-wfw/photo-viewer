import { Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '@photo-viewer/shared';

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {folder.firstPhotoId ? (
        <img
          src={`/api/photos/${folder.firstPhotoId}/thumbnail?v=${encodeURIComponent(folder.indexedAt)}`}
          alt=""
          style={{
            width: 52,
            height: 52,
            objectFit: 'cover',
            borderRadius: 8,
            flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 52,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          flexShrink: 0,
        }}>
          <FolderIcon size={24} style={{ color: 'var(--text-muted)' }} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: 14,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          {folder.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {folder.photoCount} photo{folder.photoCount !== 1 ? 's' : ''}
        </div>
      </div>
    </button>
  );
}
