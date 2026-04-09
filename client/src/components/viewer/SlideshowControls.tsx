import { Play, Pause } from 'lucide-react';
import { SLIDESHOW_INTERVALS } from '@photo-viewer/shared';

interface SlideshowControlsProps {
  isPlaying: boolean;
  interval: number;
  onToggle: () => void;
  onIntervalChange: (seconds: number) => void;
}

export function SlideshowControls({ isPlaying, interval, onToggle, onIntervalChange }: SlideshowControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        className="btn btn-ghost"
        onClick={onToggle}
        style={{ padding: '4px 8px' }}
        title={isPlaying ? 'Pause slideshow' : 'Start slideshow'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      {isPlaying && (
        <select
          className="input"
          style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }}
          value={interval}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
        >
          {SLIDESHOW_INTERVALS.map((s) => (
            <option key={s} value={s}>{s}s</option>
          ))}
        </select>
      )}
    </div>
  );
}
