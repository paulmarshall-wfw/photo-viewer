import type { ReactNode } from 'react';
import { Activity, Home, Images, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../shared/ThemeToggle.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useCurrentUser } from '../../hooks/useAuth.js';
import { NotificationBell } from '../shared/NotificationBell.js';
import clientPackage from '../../../package.json';

const APP_VERSION = clientPackage.version;

interface AppChromeProps {
  homeTitle?: string;
  onHome?: () => void;
  onActivity?: () => void;
  onNavigateToPhoto?: (photoId: string) => void;
  rightActions?: ReactNode;
  showSettings?: boolean;
}

export function AppChrome({
  homeTitle = 'Home',
  onHome,
  onActivity,
  onNavigateToPhoto,
  rightActions,
  showSettings = true,
}: AppChromeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const user = useCurrentUser();

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    navigate('/');
  };

  const handleActivity = () => {
    if (onActivity) {
      onActivity();
      return;
    }
    navigate('/activity');
  };

  const navButtonClass = (active: boolean) => `btn btn-ghost app-chrome-nav-button${active ? ' app-chrome-nav-button-active' : ''}`;

  return (
    <header className="app-chrome">
      <div className="app-chrome-identity">
        <span className="app-chrome-name">Photo Viewer</span>
        <span className="app-chrome-version">v{APP_VERSION}</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <nav className="app-chrome-nav" aria-label="Primary">
        <button className={navButtonClass(location.pathname === '/')} onClick={handleHome} title={homeTitle}>
          <Home size={15} /> Home
        </button>
        <button className={navButtonClass(location.pathname === '/activity')} onClick={handleActivity} title="Activity">
          <Activity size={15} /> Activity
        </button>
        <button className={navButtonClass(location.pathname.startsWith('/albums'))} onClick={() => navigate('/albums')} title="Albums">
          <Images size={15} /> Albums
        </button>
        <NotificationBell onNavigateToPhoto={onNavigateToPhoto} />
      </nav>

      <div className="app-chrome-actions">
        {rightActions}
        <span className="username-label">{user.data?.displayName}</span>
        {showSettings && (
          <button className="btn btn-ghost app-chrome-icon-button" onClick={() => navigate('/admin')} title="Settings">
            <Settings size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
