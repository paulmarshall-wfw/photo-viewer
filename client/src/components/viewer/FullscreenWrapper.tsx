import { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface FullscreenWrapperProps {
  children: React.ReactNode;
}

export function FullscreenWrapper({ children }: FullscreenWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isFullscreen) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      {children}

      <button
        onClick={toggleFullscreen}
        className="btn btn-ghost"
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px',
          opacity: showControls ? 0.8 : 0,
          transition: 'opacity 0.3s',
          zIndex: 10,
        }}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
    </div>
  );
}
