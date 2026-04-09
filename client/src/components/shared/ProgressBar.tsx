interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
}

export function ProgressBar({ label, value, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value} / {total} ({pct}%)</span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--bg-tertiary)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? 'var(--success)' : 'var(--accent)',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}
