import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, ChevronUp, Check, X, HardDrive, Home } from 'lucide-react';
import { api } from '../../api/client.js';

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
}

const dirButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--glass-border)',
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--text-primary)',
  textAlign: 'left',
};

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['browse-directories', browsePath],
    queryFn: () => api.browseDirectories(browsePath),
    enabled: open,
    retry: false,
  });

  // If the requested path fails, fall back to home directory
  useEffect(() => {
    if (error && browsePath !== undefined) {
      setBrowsePath(undefined);
    }
  }, [error, browsePath]);

  const handleSelect = () => {
    if (data?.currentPath) {
      onChange(data.currentPath);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/path/to/your/photos"
          required
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (value) setBrowsePath(value);
            setOpen(true);
          }}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Folder size={14} /> Browse
        </button>
      </div>
    );
  }

  const volumes = data?.volumes;
  const hasVolumes = volumes && volumes.length > 0;

  return (
    <div style={{
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
          {data?.currentPath || 'Loading...'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={handleSelect}
            disabled={!data?.currentPath}
          >
            <Check size={12} /> Select
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => setOpen(false)}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', maxHeight: 320 }}>
        {/* Volumes sidebar */}
        {hasVolumes && (
          <div style={{
            width: 160,
            flexShrink: 0,
            borderRight: '1px solid var(--glass-border)',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Drives
            </div>
            {volumes.map((vol) => (
              <button
                type="button"
                key={vol.path}
                onClick={() => setBrowsePath(vol.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '6px 10px',
                  background: data?.currentPath?.startsWith(vol.path) ? 'var(--bg-tertiary)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => { if (!data?.currentPath?.startsWith(vol.path)) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { if (!data?.currentPath?.startsWith(vol.path)) e.currentTarget.style.background = 'none'; }}
                title={vol.path}
              >
                <HardDrive size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vol.name}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: 4, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setBrowsePath(undefined)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <Home size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                Home
              </button>
            </div>
          </div>
        )}

        {/* Directory list */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {isLoading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          )}

          {error && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>
              Cannot read this directory
            </div>
          )}

          {data && (
            <>
              {data.parentPath && (
                <button
                  type="button"
                  onClick={() => setBrowsePath(data.parentPath!)}
                  style={{ ...dirButtonStyle, color: 'var(--text-secondary)' }}
                >
                  <ChevronUp size={14} /> Parent folder
                </button>
              )}

              {data.directories.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No subfolders
                </div>
              )}

              {data.directories.map((dir) => (
                <button
                  type="button"
                  key={dir.path}
                  onClick={() => setBrowsePath(dir.path)}
                  style={dirButtonStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Folder size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  {dir.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
