import { useMemo, useState } from 'react';
import { Check, Images, Plus, Search, X } from 'lucide-react';
import type { AlbumVisibility } from '@photo-viewer/shared';
import {
  useAlbumMembership,
  useCreateAlbum,
  useSetFolderAlbumMembership,
  useSetPhotoAlbumMembership,
} from '../../hooks/useAlbums.js';

interface AlbumPickerButtonProps {
  photoId?: string;
  folderPath?: string;
  label?: string;
  rootClassName?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  iconSize?: number;
}

export function AlbumPickerButton({
  photoId,
  folderPath,
  label = 'Add to album',
  rootClassName,
  buttonClassName,
  buttonStyle,
  iconSize = 14,
}: AlbumPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const createAlbum = useCreateAlbum();
  const photoMembership = useSetPhotoAlbumMembership(photoId ?? '');
  const folderMembership = useSetFolderAlbumMembership(folderPath ?? '');
  const item = useMemo(() => ({ photoId, folderPath }), [photoId, folderPath]);
  const membership = useAlbumMembership(item, open);

  const filteredAlbums = (membership.data ?? []).filter(({ album }) =>
    album.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const setMembership = (albumId: string, checked: boolean) => {
    if (photoId) {
      photoMembership.mutate({ albumId, checked });
    } else if (folderPath) {
      folderMembership.mutate({ albumId, checked });
    }
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    createAlbum.mutate({ name, visibility: 'private' as AlbumVisibility }, {
      onSuccess: (album) => {
        setNewName('');
        setMembership(album.id, true);
      },
    });
  };

  const mutationError = photoMembership.error || folderMembership.error || createAlbum.error;

  return (
    <div
      className={rootClassName}
      style={{ position: 'relative', display: 'inline-flex' }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={buttonClassName ? `btn btn-ghost ${buttonClassName}` : 'btn btn-ghost'}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        style={{
          ...(buttonClassName ? {} : {
            padding: 6,
            background: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--glass-border)',
          }),
          ...buttonStyle,
        }}
      >
        <Images size={iconSize} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose albums"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 300,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 12,
            zIndex: 400,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Add to album</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
              aria-label="Close album picker"
              style={{ padding: 4 }}
            >
              <X size={14} />
            </button>
          </div>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Search albums
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                style={{ paddingLeft: 30, fontSize: 13 }}
              />
            </span>
          </label>

          <div style={{ maxHeight: 190, overflow: 'auto', display: 'grid', gap: 4, marginBottom: 10 }}>
            {membership.isLoading && (
              <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>Loading albums...</div>
            )}
            {membership.error && (
              <div style={{ padding: 12, color: 'var(--danger)', fontSize: 13 }}>
                Failed to load albums.
                <button className="btn btn-ghost" onClick={() => membership.refetch()} style={{ marginLeft: 4, padding: '2px 6px' }}>
                  Retry
                </button>
              </div>
            )}
            {!membership.isLoading && !membership.error && filteredAlbums.length === 0 && (
              <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                No editable albums match.
              </div>
            )}
            {filteredAlbums.map(({ album, checked }) => (
              <label
                key={album.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 6px',
                  borderRadius: 'var(--radius)',
                  background: checked ? 'var(--accent-glow)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={photoMembership.isPending || folderMembership.isPending}
                  onChange={(event) => setMembership(album.id, event.target.checked)}
                />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {album.name}
                </span>
                {checked && <Check size={13} style={{ color: 'var(--accent)' }} />}
              </label>
            ))}
          </div>

          <form onSubmit={handleCreate} style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              Create album
              <input
                className="input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Album name"
                maxLength={120}
                style={{ fontSize: 13 }}
              />
            </label>
            {mutationError && (
              <p style={{ color: 'var(--danger)', fontSize: 12 }}>
                {mutationError instanceof Error ? mutationError.message : 'Album update failed'}
              </p>
            )}
            <button className="btn btn-primary" type="submit" disabled={createAlbum.isPending || !newName.trim()}>
              <Plus size={13} /> {createAlbum.isPending ? 'Creating...' : 'Create private album'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
