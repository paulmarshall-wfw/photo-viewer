import { Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '@photo-viewer/shared';
import { AlbumPickerButton } from '../albums/AlbumPickerButton.js';

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <div className="album-card-shell" style={{ position: 'relative' }}>
      <button
        className="focus-card folder-card-button"
        onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
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
      <div className="album-card-action" style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
        <AlbumPickerButton folderPath={folder.path} />
      </div>
    </div>
  );
}
