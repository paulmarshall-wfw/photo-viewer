import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import type { Notification } from '@photo-viewer/shared';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications.js';

interface NotificationBellProps {
  onNavigateToPhoto?: (photoId: string) => void;
}

function actionSentence(n: Notification): string {
  const who = n.actorDisplayName;
  switch (n.actionType) {
    case 'reaction': return `${who} reacted ${n.detail || ''}`.trim();
    case 'comment': return `${who} commented`;
    case 'reply': return `${who} replied to a comment`;
    case 'people_tag': return `${who} tagged ${n.detail || 'someone'}`;
    case 'set_title': return `${who} updated the title`;
    case 'set_caption': return `${who} updated the caption`;
    case 'add_story': return `${who} added a story`;
    case 'edit_story': return `${who} edited the story`;
    case 'set_location': return `${who} updated the location`;
    default: return `${who} made a change`;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

export function NotificationBell({ onNavigateToPhoto }: NotificationBellProps = {}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    onNavigateToPhoto?.(n.photoId);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          color: 'var(--text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 'var(--radius)',
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            background: '#ef4444',
            color: 'white',
            borderRadius: 9999,
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: 340,
          maxHeight: 480,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    width: '100%',
                    padding: '10px 16px',
                    background: n.read ? 'transparent' : 'var(--bg-tertiary)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={`/api/photos/${n.photoId}/thumbnail`}
                    alt=""
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {actionSentence(n)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {n.photoFilename} · {formatTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#6366f1', flexShrink: 0 }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
