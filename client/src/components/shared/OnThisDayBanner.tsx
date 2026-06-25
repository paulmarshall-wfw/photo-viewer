import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnThisDay, useDismissOnThisDay } from '../../hooks/useOnThisDay.js';
import { OrientedThumbnailImage } from '../photos/OrientedThumbnailImage.js';

export function OnThisDayBanner() {
  const { data } = useOnThisDay();
  const dismissMut = useDismissOnThisDay();
  const navigate = useNavigate();

  if (!data || data.dismissed || data.photos.length === 0) return null;

  const today = new Date();
  const todayLabel = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      marginBottom: 20,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          On this day · {todayLabel}
        </h3>
        <button
          onClick={() => dismissMut.mutate()}
          aria-label="Dismiss"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, display: 'inline-flex',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {data.photos.map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/viewer/${p.id}`)}
            style={{
              flex: '0 0 auto',
              width: 140,
              background: 'var(--bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            <div style={{ width: '100%', paddingTop: '75%', position: 'relative', background: 'var(--bg-tertiary)' }}>
              <OrientedThumbnailImage
                photo={p}
                alt={p.title || p.filename}
                style={{ position: 'absolute', inset: 0 }}
              />
            </div>
            <div style={{ padding: '6px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{p.year}</div>
              {p.title && (
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.title}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
