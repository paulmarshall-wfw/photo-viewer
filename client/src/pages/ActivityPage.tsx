import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import type { ActivityEntry, AnnotationProgress } from '@photo-viewer/shared';
import { AppChrome } from '../components/layout/AppChrome.js';
import { ProgressBar } from '../components/shared/ProgressBar.js';

interface ActivityPageProps {
  onBack: () => void;
  onHome: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  set_title: 'set the title on',
  set_caption: 'set the caption on',
  set_date: 'updated the date for',
  add_story: 'added a story to',
  edit_story: 'edited a story on',
  delete_story: 'deleted a story from',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ActivityPage({ onBack, onHome }: ActivityPageProps) {
  const activityQuery = useQuery<{ entries: ActivityEntry[]; total: number }>({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity?limit=100', { credentials: 'include' });
      return res.json();
    },
  });

  const statsQuery = useQuery<{ global: AnnotationProgress }>({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats', { credentials: 'include' });
      return res.json();
    },
  });

  const stats = statsQuery.data?.global;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppChrome onHome={onHome} />

      <div className="screen-taskbar">
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="screen-taskbar-title">Activity</h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 700, margin: '0 auto', width: '100%' }}>
        {/* Progress stats */}
        {stats && stats.totalPhotos > 0 && (
          <section className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>Annotation Progress</h2>
            <ProgressBar label="Titles" value={stats.withTitle} total={stats.totalPhotos} />
            <ProgressBar label="Captions" value={stats.withCaption} total={stats.totalPhotos} />
            <ProgressBar label="Stories" value={stats.withStory} total={stats.totalPhotos} />
          </section>
        )}

        {/* Activity feed */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>Recent Activity</h2>
          {activityQuery.isLoading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}
          {activityQuery.data?.entries.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>
          )}
          {activityQuery.data?.entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid var(--glass-border)',
                fontSize: 13,
              }}
            >
              <div>
                <strong>{entry.userDisplayName}</strong>
                {' '}
                {ACTION_LABELS[entry.action] || entry.action}
                {' '}
                <span style={{ color: 'var(--accent)' }}>
                  {entry.photoFolderPath ? `${entry.photoFolderPath}/` : ''}{entry.photoFilename}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                {timeAgo(entry.createdAt)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
