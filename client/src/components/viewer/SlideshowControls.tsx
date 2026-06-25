import { Play, Pause, Repeat, ArrowRightToLine } from 'lucide-react';
import { SLIDESHOW_INTERVALS } from '@photo-viewer/shared';

interface SlideshowControlsProps {
  isPlaying: boolean;
  interval: number;
  loop: boolean;
  onToggle: () => void;
  onIntervalChange: (seconds: number) => void;
  onLoopChange: (loop: boolean) => void;
  buttonClassName?: string;
  iconSize?: number;
}

export function SlideshowControls({
  isPlaying,
  interval,
  loop,
  onToggle,
  onIntervalChange,
  onLoopChange,
  buttonClassName,
  iconSize = 16,
}: SlideshowControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        className={buttonClassName ? `btn btn-ghost ${buttonClassName}` : 'btn btn-ghost'}
        onClick={onToggle}
        style={buttonClassName ? undefined : { padding: '4px 8px' }}
        title={isPlaying ? 'Pause slideshow' : 'Start slideshow'}
      >
        {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} />}
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
            className={buttonClassName ? `btn btn-ghost ${buttonClassName}` : 'btn btn-ghost'}
            onClick={() => onLoopChange(!loop)}
            style={buttonClassName ? undefined : { padding: '4px 8px' }}
            title={loop ? 'Continuous: will loop back to start' : 'Stops at last photo'}
          >
            {loop ? <Repeat size={iconSize - 2} /> : <ArrowRightToLine size={iconSize - 2} />}
          </button>
        </>
      )}
    </div>
  );
}
