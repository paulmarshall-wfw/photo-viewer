import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useCurrentUser, useLogout } from '../hooks/useAuth.js';
import { useTriggerIndex } from '../hooks/useFolders.js';
import { AlertTriangle, BookOpen, Database, LogOut, UserPlus, Trash2, RefreshCw, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppChrome } from '../components/layout/AppChrome.js';

export function AdminPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const triggerIndex = useTriggerIndex();

  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [indexProgress, setIndexProgress] = useState<{ phase: string; scannedFolders: number; scannedFiles: number; indexedFiles: number; totalFiles: number; previewsTotal: number; previewsDone: number; error?: string } | null>(null);
  const [indexActionError, setIndexActionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.getUsers,
    enabled: user.data?.role === 'admin',
  });

  const inviteMutation = useMutation({
    mutationFn: api.inviteUser,
    onSuccess: (data) => {
      setInviteEmail('');
      setCopiedLink(data.inviteUrl);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const reinviteMutation = useMutation({
    mutationFn: api.reinviteUser,
    onSuccess: (data) => {
      setCopiedLink(data.inviteUrl);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const clearIndexMutation = useMutation({
    mutationFn: api.clearIndex,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const clearAndReindexMutation = useMutation({
    mutationFn: api.clearAndReindex,
    onSuccess: () => {
      queryClient.invalidateQueries();
      startPolling();
    },
    onError: (error) => {
      setIndexProgress(null);
      setIndexActionError(error instanceof Error ? error.message : 'Could not clear and re-index.');
    },
  });

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/index/progress', { credentials: 'include' });
        const progress = await res.json();
        setIndexProgress(progress);
        if (progress.phase === 'complete' || progress.phase === 'error') {
          clearInterval(pollRef.current);
          pollRef.current = undefined;
          if (progress.phase === 'complete') {
            queryClient.invalidateQueries();
          } else {
            setIndexActionError(progress.error || 'Indexing failed.');
          }
        }
      } catch {
        setIndexActionError('Could not check indexing progress.');
      }
    }, 500);
  }, [queryClient]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleIndex = (includeSubfolders = false) => {
    setIndexActionError(null);
    setIndexProgress({ phase: 'scanning', scannedFolders: 0, scannedFiles: 0, indexedFiles: 0, totalFiles: 0, previewsTotal: 0, previewsDone: 0 });
    triggerIndex.mutate({ includeSubfolders }, {
      onSuccess: () => startPolling(),
      onError: (error) => {
        setIndexProgress(null);
        setIndexActionError(error instanceof Error ? error.message : 'Could not start indexing.');
      },
    });
  };

  const handleClearAndReindex = () => {
    const confirmed = confirm(
      'Clear the full photo index and re-index the library folder and all child folders? Original photo files and album contents for files/folders that still exist will be preserved.'
    );
    if (!confirmed) return;

    setIndexActionError(null);
    setIndexProgress({ phase: 'scanning', scannedFolders: 0, scannedFiles: 0, indexedFiles: 0, totalFiles: 0, previewsTotal: 0, previewsDone: 0 });
    clearAndReindexMutation.mutate();
  };

  const clearIndex = () => {
    const confirmed = confirm(
      'Clear the photo index? This removes indexed folders, photo records, search data, cached previews, album contents, and photo-linked annotations. Original photo files will not be changed.'
    );
    if (confirmed) clearIndexMutation.mutate();
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const isAdmin = user.data?.role === 'admin';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppChrome onHome={() => navigate('/')} showSettings={false} />

      <main style={{ flex: 1, overflow: 'auto', padding: '32px 20px 56px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
          </div>

          <section className="settings-app-actions" aria-label="App actions">
            <div>
              <button className="btn btn-primary settings-action-button" onClick={() => navigate('/readme')}>
                <BookOpen size={16} /> Read Me
              </button>
              <button className="btn btn-danger settings-action-button" onClick={() => logout.mutate()} disabled={logout.isPending}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </section>

          {!isAdmin && (
            <section className="card">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Admin settings are only available to administrators.</p>
            </section>
          )}

          {isAdmin && (
            <>
              {/* Invite User */}
              <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          <UserPlus size={18} /> Invite User
        </h2>
        <form
          onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ email: inviteEmail }); }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            className="input"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
          <button className="btn btn-primary" type="submit" disabled={inviteMutation.isPending}>
            Invite
          </button>
        </form>
        {copiedLink && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <strong>Invite link created</strong>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => copyLink(copiedLink)}>
                <Copy size={14} /> Copy
              </button>
            </div>
            <code style={{ wordBreak: 'break-all', color: 'var(--text-secondary)' }}>{copiedLink}</code>
          </div>
        )}
        {inviteMutation.error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }}>
            {inviteMutation.error instanceof Error ? inviteMutation.error.message : 'Failed to invite'}
          </p>
        )}
              </section>

              {/* User List */}
              <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>Users</h2>
        {usersQuery.data?.users.map((u: any) => (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>
                {u.displayName || u.email}
                {u.role === 'admin' && (
                  <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
                    Admin
                  </span>
                )}
                {u.revokedAt && (
                  <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
                    Revoked
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {u.email}
                {u.hasPendingInvite && ' — invite pending'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {u.hasPendingInvite && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  title="Regenerate invite"
                  onClick={() => reinviteMutation.mutate(u.id)}
                >
                  <RefreshCw size={14} />
                </button>
              )}
              {u.id !== user.data?.id && !u.revokedAt && (
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 8px' }}
                  title="Revoke access"
                  onClick={() => { if (confirm(`Revoke access for ${u.displayName || u.email}?`)) revokeMutation.mutate(u.id); }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
              </section>

              {/* Indexing */}
              <section className="card">
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          <Database size={18} /> Indexing
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 14 }}>
          Scan the configured library for new or changed photos, or rebuild the index when the library needs a clean refresh.
        </p>
        <div className="settings-index-actions">
          <button
            className="btn btn-primary"
            onClick={() => handleIndex(false)}
            disabled={triggerIndex.isPending || clearAndReindexMutation.isPending}
          >
            <RefreshCw size={14} /> Index Library
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => handleIndex(true)}
            disabled={triggerIndex.isPending || clearAndReindexMutation.isPending}
          >
            <RefreshCw size={14} /> Include Subfolders
          </button>
          <button
            className="btn btn-danger"
            onClick={handleClearAndReindex}
            disabled={triggerIndex.isPending || clearAndReindexMutation.isPending}
          >
            <AlertTriangle size={14} /> Clear + Re-index
          </button>
          <button
            className="btn btn-ghost"
            onClick={clearIndex}
            disabled={clearIndexMutation.isPending}
          >
            <Trash2 size={14} /> Clear Only
          </button>
        </div>

        {indexProgress && (
          <div className="settings-index-progress" role={indexProgress.phase === 'error' ? 'alert' : 'status'}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <span>
                {indexProgress.phase === 'scanning' && `Scanning folders... ${indexProgress.scannedFolders} folders, ${indexProgress.scannedFiles} files found`}
                {indexProgress.phase === 'indexing' && `Indexing... ${indexProgress.indexedFiles} of ${indexProgress.totalFiles} files`}
                {indexProgress.phase === 'previews' && `Generating previews... ${indexProgress.previewsDone} of ${indexProgress.previewsTotal}`}
                {indexProgress.phase === 'complete' && `Indexing complete - ${indexProgress.totalFiles} files processed`}
                {indexProgress.phase === 'error' && (indexProgress.error || 'Indexing failed.')}
              </span>
              {indexProgress.phase === 'complete' && <strong style={{ color: 'var(--success)' }}>Done</strong>}
              {indexProgress.phase === 'error' && <strong style={{ color: 'var(--danger)' }}>Failed</strong>}
            </div>
            {indexProgress.phase === 'previews' && indexProgress.previewsTotal > 0 && (
              <div className="settings-index-progress-bar">
                <div style={{ width: `${(indexProgress.previewsDone / indexProgress.previewsTotal) * 100}%` }} />
              </div>
            )}
            {indexProgress.phase === 'indexing' && indexProgress.totalFiles > 0 && (
              <div className="settings-index-progress-bar">
                <div style={{ width: `${Math.round((indexProgress.indexedFiles / indexProgress.totalFiles) * 100)}%` }} />
              </div>
            )}
          </div>
        )}
        {indexActionError && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>{indexActionError}</p>
        )}
        {clearIndexMutation.isSuccess && (
          <p style={{ color: 'var(--success)', fontSize: 14, marginTop: 12 }}>Index cleared.</p>
        )}
        {clearIndexMutation.error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 12 }}>
            {clearIndexMutation.error instanceof Error ? clearIndexMutation.error.message : 'Failed to clear index'}
          </p>
        )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
