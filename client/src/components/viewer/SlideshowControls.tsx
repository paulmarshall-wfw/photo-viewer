import { Play, Pause, Repeat, ArrowRightToLine } from 'lucide-react';
import { SLIDESHOW_INTERVALS } from '@photo-viewer/shared';

interface SlideshowControlsProps {
  isPlaying: boolean;
  interval: number;
  loop: boolean;
  onToggle: () => void;
  onIntervalChange: (seconds: number) => void;
  onLoopChange: (loop: boolean) => void;
}

export function SlideshowControls({ isPlaying, interval, loop, onToggle, onIntervalChange, onLoopChange }: SlideshowControlsProps) {
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
        <>
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
          <button
            className="btn btn-ghost"
            onClick={() => onLoopChange(!loop)}
            style={{ padding: '4px 8px' }}
            title={loop ? 'Continuous: will loop back to start' : 'Stops at last photo'}
          >
            {loop ? <Repeat size={14} /> : <ArrowRightToLine size={14} />}
          </button>
        </>
      )}
    </div>
  );
}
