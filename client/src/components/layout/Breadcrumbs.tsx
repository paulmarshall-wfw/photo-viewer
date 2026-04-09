import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  crumbs: { name: string; path: string }[];
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ crumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '8px 0',
      fontSize: 13,
      color: 'var(--text-secondary)',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-body)',
    }}>
      <button
        onClick={() => onNavigate('')}
        style={{
          background: 'none',
          border: 'none',
          color: crumbs.length > 0 ? 'var(--accent)' : 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 4px',
          borderRadius: 'var(--radius)',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        <Home size={14} /> Photos
      </button>

      {crumbs.map((crumb, i) => (
        <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          {i < crumbs.length - 1 ? (
            <button
              onClick={() => onNavigate(crumb.path)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                padding: '2px 4px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {crumb.name}
            </button>
          ) : (
            <span style={{ color: 'var(--text-primary)', fontWeight: 500, padding: '2px 4px' }}>
              {crumb.name}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
