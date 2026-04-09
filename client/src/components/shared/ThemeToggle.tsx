import { Sun, Moon } from 'lucide-react';
import type { Theme } from '@photo-viewer/shared';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onToggle}
      style={{ padding: '4px 8px' }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
