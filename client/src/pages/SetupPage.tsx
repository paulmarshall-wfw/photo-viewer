import { useState } from 'react';
import { useSetup, useSetupStatus } from '../hooks/useAuth.js';
import { FolderPicker } from '../components/shared/FolderPicker.js';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

export function SetupPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photosPath, setPhotosPath] = useState('');
  const setup = useSetup();
  const status = useSetupStatus();
  const { theme, toggleTheme } = useTheme();

  // When the server is launched with SETUP_LIBRARY_PATH set (typically by
  // AppLauncher with a host bind-mount), the host folder has already been
  // chosen — we hide the in-app picker and let the server use its env value.
  const presetLibraryPath = status.data?.setupLibraryPath ?? null;
  const pickerHidden = !!presetLibraryPath;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setup.mutate({
      email,
      displayName,
      // Omit photosPath when the server has a preset; server will fill it in.
      ...(pickerHidden ? {} : { photosPath }),
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <h1 style={{ marginBottom: 4, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>Setup</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>Set up your photo collection</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Name</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Paul"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {pickerHidden ? (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photo Library</label>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                Your photo folder was chosen when this app was launched and is mounted automatically. No further action needed.
              </p>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photos Location</label>
              <FolderPicker value={photosPath} onChange={setPhotosPath} />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                Browse to or type the full path to your photos folder
              </p>
            </div>
          )}

          {setup.error && (
            <p style={{ color: 'var(--danger)', fontSize: 14 }}>
              {setup.error instanceof Error ? setup.error.message : 'Setup failed'}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={setup.isPending}>
            {setup.isPending ? 'Setting up...' : 'Start Using Photo Viewer'}
          </button>
        </form>
      </div>
    </div>
  );
}
