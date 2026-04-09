import { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Maximize, Minimize } from 'lucide-react';

const FullscreenContext = createContext<{
  isFullscreen: boolean;
  toggle: () => void;
}>({ isFullscreen: false, toggle: () => {} });

interface FullscreenWrapperProps {
  children: React.ReactNode;
}

export function FullscreenWrapper({ children }: FullscreenWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toggle = useCallback(async () => {
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
    <FullscreenContext.Provider value={{ isFullscreen, toggle }}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--bg-primary)',
        }}
      >
        {children}
      </div>
    </FullscreenContext.Provider>
  );
}

export function FullscreenButton() {
  const { isFullscreen, toggle } = useContext(FullscreenContext);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', flexShrink: 0 }}>
      <button
        onClick={toggle}
        className="btn btn-ghost"
        style={{ padding: '4px 8px', opacity: 0.7 }}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}
