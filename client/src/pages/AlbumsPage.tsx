import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Home, Images, Plus, RefreshCw, Save, Settings, Trash2 } from 'lucide-react';
import type { AlbumSummary, AlbumVisibility, Photo } from '@photo-viewer/shared';
import { useAlbum, useAlbums, useCreateAlbum, useDeleteAlbum, useRemoveAlbumPhoto, useUpdateAlbum } from '../hooks/useAlbums.js';
import { useCurrentUser, useLogout } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';
import { AlbumPickerButton } from '../components/albums/AlbumPickerButton.js';
import { OrientedThumbnailImage } from '../components/photos/OrientedThumbnailImage.js';
import { ViewerPage } from './ViewerPage.js';
import clientPackage from '../../package.json';

const APP_VERSION = clientPackage.version;

function VisibilityBadge({ visibility }: { visibility: AlbumVisibility }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        background: visibility === 'shared' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
        color: visibility === 'shared' ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {visibility}
    </span>
  );
}

function AlbumRow({ album, selected, onOpen }: { album: AlbumSummary; selected: boolean; onOpen: () => void }) {
  return (
    <button
      className="focus-card album-list-row"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      style={{
        width: '100%',
        display: 'grid',
        gap: 8,
        padding: '12px 14px',
        border: selected ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        background: selected ? 'var(--accent-glow)' : 'var(--bg-secondary)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Images size={16} style={{ color: selected ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }} />
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {album.name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {album.resolvedPhotoCount} photo{album.resolvedPhotoCount !== 1 ? 's' : ''}
        </span>
        <VisibilityBadge visibility={album.visibility} />
      </div>
    </button>
  );
}

function VisibilityButtons({
  value,
  onChange,
  disabled,
}: {
  value: AlbumVisibility;
  onChange: (visibility: AlbumVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Album visibility" style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {(['private', 'shared'] as AlbumVisibility[]).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={value === option ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => onChange(option)}
          disabled={disabled}
          style={{
            padding: '7px 12px',
            background: value === option ? undefined : 'var(--bg-tertiary)',
            textTransform: 'capitalize',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function AlbumPhotoTile({
  photo,
  canRemove,
  isRemoving,
  onOpen,
  onRemove,
}: {
  photo: Photo;
  canRemove: boolean;
  isRemoving: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="album-card-shell album-photo-tile" style={{ position: 'relative', minWidth: 0 }}>
      <button
        className="focus-card album-photo-tile-button"
        onClick={onOpen}
        style={{
          width: '100%',
          display: 'block',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          minWidth: 0,
          padding: 0,
          textAlign: 'left',
        }}
      >
        <div style={{ position: 'relative', paddingTop: '75%', background: 'var(--bg-tertiary)' }}>
          <OrientedThumbnailImage
            photo={photo}
            alt={photo.title || photo.filename}
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>
        <div style={{ padding: '8px 10px', minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {photo.filename}
          </div>
          {photo.caption && (
            <div style={{ color: 'var(--text-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {photo.caption}
            </div>
          )}
        </div>
      </button>
      {canRemove && (
        <div className="album-card-action album-photo-actions" style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
          <AlbumPickerButton photoId={photo.id} label={`Add ${photo.filename} to another album`} />
          <button
            className="btn btn-danger"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Remove ${photo.filename} from album`}
            title="Remove from album"
            style={{
              padding: 7,
              boxShadow: 'var(--shadow)',
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </article>
  );
}

export function AlbumsPage() {
  const navigate = useNavigate();
  const { albumId } = useParams();
  const user = useCurrentUser();
  const logout = useLogout();
  const { theme, toggleTheme } = useTheme();
  const albums = useAlbums();
  const album = useAlbum(albumId);
  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum(albumId ?? '');
  const deleteAlbum = useDeleteAlbum();
  const removeAlbumPhoto = useRemoveAlbumPhoto(albumId ?? '');
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createVisibility, setCreateVisibility] = useState<AlbumVisibility>('private');
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<AlbumVisibility>('private');
  const [viewerState, setViewerState] = useState<{ photo: Photo; allPhotos: Photo[] } | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  const selectedSummary = albums.data?.find((item) => item.id === albumId);

  useEffect(() => {
    if (album.data) {
      setName(album.data.name);
      setVisibility(album.data.visibility);
    } else if (!albumId) {
      setName('');
      setVisibility('private');
    }
  }, [album.data, albumId]);

  useEffect(() => {
    setViewerState(null);
    setShowInfo(true);
  }, [albumId]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createAlbum.mutate({ name: createName, visibility: createVisibility }, {
      onSuccess: (createdAlbum) => {
        setCreating(false);
        setCreateName('');
        setCreateVisibility('private');
        navigate(`/albums/${createdAlbum.id}`);
      },
    });
  };

  const saveAlbum = () => {
    if (!albumId) return;
    updateAlbum.mutate({ name, visibility });
  };

  const handleDelete = () => {
    if (!albumId || !window.confirm('Delete this album? Photos and folders will stay in the library.')) return;
    deleteAlbum.mutate(albumId, {
      onSuccess: () => navigate('/albums'),
    });
  };

  const handlePhotoOpen = (photo: Photo) => {
    if (!album.data) return;
    setViewerState({ photo, allPhotos: album.data.photos });
    setShowInfo(true);
  };

  const handlePhotoChange = (photo: Photo) => {
    setViewerState((prev) => prev ? { ...prev, photo } : null);
  };

  const handleViewerPhotoUpdate = (photoId: string, updates: Partial<Photo>) => {
    setViewerState((prev) => {
      if (!prev) return null;
      const updatePhoto = (item: Photo) => item.id === photoId ? { ...item, ...updates } : item;
      return {
        photo: updatePhoto(prev.photo),
        allPhotos: prev.allPhotos.map(updatePhoto),
      };
    });
  };

  const handleRemovePhoto = (photo: Photo) => {
    if (!albumId) return;
    removeAlbumPhoto.mutate(photo.id, {
      onSuccess: () => {
        if (viewerState?.photo.id === photo.id) setViewerState(null);
      },
    });
  };

  if (viewerState && user.data) {
    return (
      <ViewerPage
        photo={viewerState.photo}
        allPhotos={viewerState.allPhotos}
        theme={theme}
        currentUser={user.data}
        onBack={() => setViewerState(null)}
        onPhotoChange={handlePhotoChange}
        onPhotoUpdate={handleViewerPhotoUpdate}
        onToggleInfo={() => setShowInfo((visible) => !visible)}
        showInfo={showInfo}
      />
    );
  }

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
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div className="app-identity" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
            Photo Viewer
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            v{APP_VERSION}
          </span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <h1 style={{
          fontSize: 17,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.02em',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          margin: 0,
          pointerEvents: 'none',
        }}>
          Albums
        </h1>
        <div className="browse-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '4px 8px', fontSize: 13 }}>
            <Home size={14} /> Library
          </button>
          {user.data?.role === 'admin' && (
            <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ padding: '4px 8px' }} title="Admin">
              <Settings size={14} />
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/readme')} style={{ padding: '4px 8px', fontSize: 13 }}>
            <BookOpen size={14} /> Read Me
          </button>
          <span className="username-label" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.data?.displayName}</span>
          <button className="btn btn-ghost" onClick={() => logout.mutate()} style={{ padding: '4px 8px', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </header>

      <main className="albums-workspace">
        <aside className="albums-sidebar" aria-label="Albums">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '0 0 14px',
            flexShrink: 0,
          }}>
            <button className="btn btn-primary" onClick={() => {
              setCreateName('');
              setCreateVisibility('private');
              setCreating(true);
            }} style={{ padding: '7px 10px', marginLeft: 'auto' }}>
              <Plus size={14} /> New Album
            </button>
          </div>

          {albums.isLoading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading albums...</div>
          )}

          {albums.error && (
            <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>
              Failed to load albums.
              <button className="btn btn-ghost" onClick={() => albums.refetch()} style={{ marginTop: 8, padding: '4px 8px' }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {albums.data?.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <p style={{ marginBottom: 14 }}>No albums yet.</p>
              <button className="btn btn-primary" onClick={() => {
                setCreateName('');
                setCreateVisibility('private');
                setCreating(true);
              }}>
                <Plus size={14} /> Create Album
              </button>
            </div>
          )}

          {albums.data && albums.data.length > 0 && (
            <div style={{ display: 'grid', gap: 8, overflow: 'auto', paddingRight: 2 }}>
              {albums.data.map((item) => (
                <AlbumRow
                  key={item.id}
                  album={item}
                  selected={item.id === albumId}
                  onOpen={() => navigate(`/albums/${item.id}`)}
                />
              ))}
            </div>
          )}
        </aside>

        <section className="album-detail-panel" aria-label="Album detail">
          {!albumId && (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              <div>
                <Images size={28} style={{ marginBottom: 12 }} />
                <p>Select an album to view its photos.</p>
              </div>
            </div>
          )}

          {albumId && album.isLoading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading album...</div>
          )}

          {albumId && album.error && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
              Failed to load album.
              <button className="btn btn-ghost" onClick={() => album.refetch()} style={{ marginLeft: 8 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {albumId && album.data && (
            <>
              <div className="album-detail-header">
                {album.data.canEdit ? (
                  <>
                    <input
                      className="input album-name-input"
                      aria-label="Album name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={120}
                    />
                    <div className="album-detail-actions">
                      <VisibilityButtons value={visibility} onChange={setVisibility} disabled={updateAlbum.isPending} />
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
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{
                        fontSize: 20,
                        fontFamily: 'var(--font-display)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {album.data.name}
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Owner: {album.data.ownerDisplayName}</p>
                    </div>
                    <VisibilityBadge visibility={album.data.visibility} />
                  </>
                )}
                {updateAlbum.error && (
                  <p style={{ color: 'var(--danger)', fontSize: 13, gridColumn: '1 / -1' }}>
                    {updateAlbum.error instanceof Error ? updateAlbum.error.message : 'Failed to save album'}
                  </p>
                )}
              </div>

              <div className="album-photos-region">
                <h2 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 14,
                  fontFamily: 'var(--font-display)',
                }}>
                  Photos
                </h2>
                {album.data.photos.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>This album does not show any photos yet.</p>
                ) : (
                  <div className="album-photo-grid">
                    {album.data.photos.map((photo) => (
                      <AlbumPhotoTile
                        key={photo.id}
                        photo={photo}
                        canRemove={album.data?.canEdit ?? false}
                        isRemoving={removeAlbumPhoto.isPending}
                        onOpen={() => handlePhotoOpen(photo)}
                        onRemove={() => handleRemovePhoto(photo)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {albumId && !album.isLoading && !album.data && !album.error && selectedSummary && (
            <div style={{ padding: 40, color: 'var(--text-muted)' }}>Select another album or retry loading this one.</div>
          )}
        </section>
      </main>

      {creating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-album-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <form className="card" onSubmit={handleCreate} style={{ width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            <h2 id="create-album-title" style={{ fontSize: 20, fontFamily: 'var(--font-display)', marginBottom: 18 }}>
              Create album
            </h2>
            <label style={{ display: 'grid', gap: 6, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
              Name
              <input
                className="input"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                autoFocus
                required
                maxLength={120}
              />
            </label>
            <fieldset style={{ border: 'none', marginBottom: 18 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Visibility</legend>
              <VisibilityButtons value={createVisibility} onChange={setCreateVisibility} />
            </fieldset>
            {createAlbum.error && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
                {createAlbum.error instanceof Error ? createAlbum.error.message : 'Failed to create album'}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createAlbum.isPending}>
                {createAlbum.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
