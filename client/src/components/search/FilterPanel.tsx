interface FilterPanelProps {
  dateFrom: string;
  dateTo: string;
  needsTitle: boolean;
  needsCaption: boolean;
  needsStory: boolean;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onNeedsTitleChange: (v: boolean) => void;
  onNeedsCaptionChange: (v: boolean) => void;
  onNeedsStoryChange: (v: boolean) => void;
}

export function FilterPanel({
  dateFrom, dateTo,
  needsTitle, needsCaption, needsStory,
  onDateFromChange, onDateToChange,
  onNeedsTitleChange, onNeedsCaptionChange, onNeedsStoryChange,
}: FilterPanelProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '8px 0',
      fontSize: 13,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</label>
        <input
          className="input"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={{ width: 140, padding: '2px 6px', fontSize: 12, height: 28 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</label>
        <input
          className="input"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          style={{ width: 140, padding: '2px 6px', fontSize: 12, height: 28 }}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input type="checkbox" checked={needsTitle} onChange={(e) => onNeedsTitleChange(e.target.checked)} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Needs title</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input type="checkbox" checked={needsCaption} onChange={(e) => onNeedsCaptionChange(e.target.checked)} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Needs caption</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input type="checkbox" checked={needsStory} onChange={(e) => onNeedsStoryChange(e.target.checked)} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Needs story</span>
      </label>
    </div>
  );
}
