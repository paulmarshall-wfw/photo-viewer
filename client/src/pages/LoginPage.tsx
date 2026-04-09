import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAcceptInvite } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';

export function LoginPage() {
  const { token } = useParams<{ token: string }>();
  const [displayName, setDisplayName] = useState('');
  const acceptInvite = useAcceptInvite();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    acceptInvite.mutate({ token, displayName });
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
        <div className="card" style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}>Invalid Invite</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This invite link is not valid. Please ask the admin for a new one.</p>
        </div>
      </div>
    );
  }

  if (acceptInvite.isSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>You're all set. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <h1 style={{ marginBottom: 4, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>Login</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>You've been invited to view photos</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Name</label>
            <input
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we show your name?"
              required
            />
          </div>

          {acceptInvite.error && (
            <p style={{ color: 'var(--danger)', fontSize: 14 }}>
              {acceptInvite.error instanceof Error ? acceptInvite.error.message : 'Failed to accept invite'}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={acceptInvite.isPending}>
            {acceptInvite.isPending ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
