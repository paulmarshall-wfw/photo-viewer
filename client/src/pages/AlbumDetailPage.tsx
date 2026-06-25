import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Folder, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { AlbumVisibility, Photo } from '@photo-viewer/shared';
import { api } from '../api/client.js';
import { useAlbum, useDeleteAlbum, useUpdateAlbum } from '../hooks/useAlbums.js';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

function PhotoTile({ photo, onRemove, canRemove }: { photo: Photo; onRemove?: () => void; canRemove?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--glass-border)',
      position: 'relative',
      minWidth: 0,
    }}>
      <div style={{ position: 'relative', paddingTop: '75%', background: 'var(--bg-tertiary)' }}>
        <img
          src={`/api/photos/${photo.id}/thumbnail?v=${encodeURIComponent(photo.fileModifiedAt)}`}
          alt={photo.title || photo.filename}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: '8px 10px', minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {photo.filename}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {photo.folderPath}
        </div>
      </div>
      {canRemove && (
        <button
          className="btn btn-ghost"
          onClick={onRemove}
          aria-label={`Remove ${photo.filename} from album`}
          title="Remove from album"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 6,
            background: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export function AlbumDetailPage() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const album = useAlbum(albumId);
  const updateAlbum = useUpdateAlbum(albumId ?? '');
  const deleteAlbum = useDeleteAlbum();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<AlbumVisibility>('private');

  useEffect(() => {
    if (album.data) {
      setName(album.data.name);
      setVisibility(album.data.visibility);
    }
  }, [album.data]);

  const removeFolder = useMutation({
    mutationFn: (folderPath: string) => api.removeFolderFromAlbum(albumId!, folderPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });

  const removePhoto = useMutation({
    mutationFn: (photoId: string) => api.removePhotoFromAlbum(albumId!, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });

  const saveAlbum = () => {
    updateAlbum.mutate({ name, visibility });
  };

  const handleDelete = () => {
    if (!albumId || !window.confirm('Delete this album? Photos and folders will stay in the library.')) return;
    deleteAlbum.mutate(albumId, {
      onSuccess: () => navigate('/albums'),
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '10px 24px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/albums')} style={{ padding: '4px 8px' }}>
            <ArrowLeft size={16} /> Albums
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Album Detail
          </h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {album.isLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading album...</div>
        )}

        {album.error && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
            Failed to load album.
            <button className="btn btn-ghost" onClick={() => album.refetch()} style={{ marginLeft: 8 }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {album.data && (
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
            <section className="card" style={{ display: 'grid', gap: 14 }}>
              {album.data.canEdit ? (
                <>
                  <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                    Name
                    <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
                  </label>
                  <fieldset style={{ border: 'none' }}>
                    <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Visibility</legend>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['private', 'shared'] as AlbumVisibility[]).map((option) => (
                        <label
                          key={option}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-pill)',
                            background: visibility === option ? 'var(--accent)' : 'var(--bg-tertiary)',
                            color: visibility === option ? '#fff' : 'var(--text-primary)',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          <input
                            type="radio"
                            checked={visibility === option}
                            onChange={() => setVisibility(option)}
                          />
                          {option === 'private' ? 'Private' : 'Shared'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {updateAlbum.error && (
                    <p style={{ color: 'var(--danger)', fontSize: 13 }}>
                      {updateAlbum.error instanceof Error ? updateAlbum.error.message : 'Failed to save album'}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={deleteAlbum.isPending}>
                      <Trash2 size={14} /> Delete Album
                    </button>
                    <button className="btn btn-primary" onClick={saveAlbum} disabled={updateAlbum.isPending}>
                      <Save size={14} /> {updateAlbum.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>{album.data.name}</h2>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, textTransform: 'capitalize' }}>
                      {album.data.visibility}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Owner: {album.data.ownerDisplayName}</p>
                </>
              )}
            </section>

            <section>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                Folders in this album ({album.data.folders.length})
              </h2>
              {album.data.folders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No folders have been added.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {album.data.folders.map((folder) => (
                    <div key={folder.folderPath} style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                    }}>
                      <Folder size={18} style={{ color: 'var(--text-secondary)' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folder.folderName || folder.folderPath}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {folder.photoCount} photo{folder.photoCount !== 1 ? 's' : ''} now in this folder
                        </div>
                      </div>
                      {album.data.canEdit && (
                        <button
                          className="btn btn-ghost"
                          onClick={() => removeFolder.mutate(folder.folderPath)}
                          disabled={removeFolder.isPending}
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                Photos in this album ({album.data.explicitPhotos.length})
              </h2>
              {album.data.explicitPhotos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No individual photos have been added.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  {album.data.explicitPhotos.map((photo) => (
                    <PhotoTile
                      key={photo.id}
                      photo={photo}
                      canRemove={album.data?.canEdit}
                      onRemove={() => removePhoto.mutate(photo.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                Resolved album photos ({album.data.photos.length})
              </h2>
              {album.data.photos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This album does not show any photos yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  {album.data.photos.map((photo) => (
                    <PhotoTile key={photo.id} photo={photo} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
