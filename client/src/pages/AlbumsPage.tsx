import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Images, Plus, RefreshCw } from 'lucide-react';
import type { AlbumSummary, AlbumVisibility } from '@photo-viewer/shared';
import { useAlbums, useCreateAlbum } from '../hooks/useAlbums.js';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

function VisibilityBadge({ visibility }: { visibility: AlbumVisibility }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      background: visibility === 'shared' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
      color: visibility === 'shared' ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {visibility}
    </span>
  );
}

function AlbumRow({ album, onOpen }: { album: AlbumSummary; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        alignItems: 'center',
        padding: '14px 16px',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        textAlign: 'left',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Images size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{
            fontWeight: 700,
            fontSize: 15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {album.name}
          </span>
          <VisibilityBadge visibility={album.visibility} />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          Owner: {album.ownerDisplayName}
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 12,
        color: 'var(--text-secondary)',
        fontSize: 12,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}>
        <span>{album.folderCount} folder{album.folderCount !== 1 ? 's' : ''}</span>
        <span>{album.explicitPhotoCount} photo{album.explicitPhotoCount !== 1 ? 's' : ''}</span>
        <span>{album.resolvedPhotoCount} shown</span>
      </div>
    </button>
  );
}

export function AlbumsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const albums = useAlbums();
  const createAlbum = useCreateAlbum();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<AlbumVisibility>('private');

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createAlbum.mutate({ name, visibility }, {
      onSuccess: (album) => {
        setCreating(false);
        setName('');
        setVisibility('private');
        navigate(`/albums/${album.id}`);
      },
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
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '4px 8px' }}>
            <ArrowLeft size={16} /> Library
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Albums
          </h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> Create Album
        </button>
      </header>

      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {albums.isLoading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading albums...</div>
          )}

          {albums.error && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
              Failed to load albums.
              <button className="btn btn-ghost" onClick={() => albums.refetch()} style={{ marginLeft: 8 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {albums.data?.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: 14 }}>No albums yet.</p>
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus size={14} /> Create Album
              </button>
            </div>
          )}

          {albums.data && albums.data.length > 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              {albums.data.map((album) => (
                <AlbumRow key={album.id} album={album} onOpen={() => navigate(`/albums/${album.id}`)} />
              ))}
            </div>
          )}
        </div>
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
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                required
                maxLength={120}
              />
            </label>
            <fieldset style={{ border: 'none', marginBottom: 18 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Visibility</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['private', 'shared'] as AlbumVisibility[]).map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-pill)',
                      background: visibility === option ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: visibility === option ? '#fff' : 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="radio"
                      name="album-visibility"
                      checked={visibility === option}
                      onChange={() => setVisibility(option)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {option === 'private' ? 'Private' : 'Shared'}
                  </label>
                ))}
              </div>
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
