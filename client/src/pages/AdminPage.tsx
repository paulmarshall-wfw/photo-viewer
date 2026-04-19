import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useCurrentUser } from '../hooks/useAuth.js';
import { UserPlus, Trash2, RefreshCw, Copy, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FolderPicker } from '../components/shared/FolderPicker.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.js';
import { useTheme } from '../hooks/useTheme.js';

export function AdminPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [photosPath, setPhotosPath] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.getUsers,
    enabled: user.data?.role === 'admin',
  });

  const configQuery = useQuery({
    queryKey: ['admin-config'],
    queryFn: api.getConfig,
    enabled: user.data?.role === 'admin',
  });

  if (configQuery.data && !configLoaded) {
    setPhotosPath(configQuery.data.photosPath || '');
    setConfigLoaded(true);
  }

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

  const updateConfigMutation = useMutation({
    mutationFn: api.updateConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-config'] }),
  });

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  if (user.data?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Admin access required.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 14, fontWeight: 500 }}
          >
            <ArrowLeft size={18} /> Back to Library
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

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

      {/* Storage Config */}
      <section className="card">
        <h2 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          <Settings size={18} /> Storage Location
        </h2>
        <form
          onSubmit={(e) => { e.preventDefault(); updateConfigMutation.mutate({ photosPath }); }}
        >
          <div style={{ marginBottom: 12 }}>
            <FolderPicker value={photosPath} onChange={setPhotosPath} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={updateConfigMutation.isPending}>
            Update
          </button>
        </form>
        {updateConfigMutation.isSuccess && (
          <p style={{ color: 'var(--success)', fontSize: 14, marginTop: 8 }}>Storage location updated.</p>
        )}
        {updateConfigMutation.error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }}>
            {updateConfigMutation.error instanceof Error ? updateConfigMutation.error.message : 'Failed to update'}
          </p>
        )}
      </section>
    </div>
  );
}
