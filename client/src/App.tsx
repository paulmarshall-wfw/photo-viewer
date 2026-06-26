import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Photo } from '@photo-viewer/shared';
import { useSetupStatus, useCurrentUser, useLogin } from './hooks/useAuth.js';
import { useTheme } from './hooks/useTheme.js';
import { SetupPage } from './pages/SetupPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { ReadmePage } from './pages/ReadmePage.js';
import { BrowsePage } from './pages/BrowsePage.js';
import { ViewerPage } from './pages/ViewerPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { AlbumsPage } from './pages/AlbumsPage.js';
import { ErrorBoundary } from './components/shared/ErrorBoundary.js';
import { ThemeToggle } from './components/shared/ThemeToggle.js';
import { ToastProvider } from './components/shared/Toast.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

type AppView = 'browse' | 'viewer' | 'search' | 'activity';

function MainApp() {
  const { theme } = useTheme();
  const currentUser = useCurrentUser();
  const [view, setView] = useState<AppView>('browse');
  const [folderPath, setFolderPath] = useState('');
  const [viewerState, setViewerState] = useState<{ photo: Photo; allPhotos: Photo[] } | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = useCallback((path: string) => {
    setFolderPath(path);
    setView('browse');
    setViewerState(null);
  }, []);

  const handlePhotoSelect = useCallback((photo: Photo, allPhotos: Photo[]) => {
    setViewerState({ photo, allPhotos });
    setShowInfo(true);
    setView('viewer');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'viewer' && searchQuery) {
      setView('search');
    } else {
      setView('browse');
    }
    setViewerState(null);
  }, [view, searchQuery]);

  const handlePhotoChange = useCallback((photo: Photo) => {
    setViewerState((prev) => prev ? { ...prev, photo } : null);
  }, []);

  const handleViewerPhotoUpdate = useCallback((photoId: string, updates: Partial<Photo>) => {
    setViewerState((prev) => {
      if (!prev) return null;
      const updatePhoto = (item: Photo) => item.id === photoId ? { ...item, ...updates } : item;
      return {
        photo: updatePhoto(prev.photo),
        allPhotos: prev.allPhotos.map(updatePhoto),
      };
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView('search');
  }, []);

  const handleSearchBack = useCallback(() => {
    setSearchQuery('');
    setView('browse');
  }, []);

  const getParentFolderPath = useCallback((path: string) => {
    const parts = path.split('/').filter(Boolean);
    return parts.slice(0, -1).join('/');
  }, []);

  const handleHome = useCallback(() => {
    setFolderPath((currentPath) => getParentFolderPath(currentPath));
    setViewerState(null);
    setView('browse');
  }, [getParentFolderPath]);

  const handleViewerHome = useCallback(() => {
    const parentFolderPath = viewerState?.photo.folderPath
      ? getParentFolderPath(viewerState.photo.folderPath)
      : '';
    setFolderPath(parentFolderPath);
    setViewerState(null);
    setView('browse');
  }, [getParentFolderPath, viewerState?.photo.folderPath]);

  if (view === 'viewer' && viewerState) {
    return (
      <ViewerPage
        photo={viewerState.photo}
        allPhotos={viewerState.allPhotos}
        theme={theme}
        currentUser={currentUser.data!}
        onBack={handleBack}
        onPhotoChange={handlePhotoChange}
        onPhotoUpdate={handleViewerPhotoUpdate}
        onToggleInfo={() => setShowInfo((visible) => !visible)}
        showInfo={showInfo}
        onHome={handleViewerHome}
      />
    );
  }

  if (view === 'search') {
    return (
      <SearchPage
        initialQuery={searchQuery}
        onBack={handleSearchBack}
        onHome={handleHome}
        onSearch={handleSearch}
        onPhotoSelect={handlePhotoSelect}
      />
    );
  }

  if (view === 'activity') {
    return <ActivityPage onBack={() => setView('browse')} onHome={handleHome} />;
  }

  return (
    <BrowsePage
      folderPath={folderPath}
      onNavigate={handleNavigate}
      onPhotoSelect={handlePhotoSelect}
      onSearch={handleSearch}
      onHome={handleHome}
      onShowActivity={() => setView('activity')}
    />
  );
}

function EmailLoginPage() {
  const [email, setEmail] = useState('');
  const login = useLogin();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(email);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>Login</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>Sign in with your email address</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />

          {login.error && (
            <p style={{ color: 'var(--danger)', fontSize: 14 }}>
              {login.error instanceof Error ? login.error.message : 'Login failed'}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Don't have an account? Ask the admin for an invite link.
        </p>
      </div>
    </div>
  );
}

function ActivityRoutePage() {
  const navigate = useNavigate();
  return <ActivityPage onBack={() => navigate('/')} onHome={() => navigate('/')} />;
}

function AppRoutes() {
  const setupStatus = useSetupStatus();
  const currentUser = useCurrentUser();

  if (setupStatus.isLoading || currentUser.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (setupStatus.data?.needsSetup) {
    return <Routes><Route path="*" element={<SetupPage />} /></Routes>;
  }

  if (!currentUser.data) {
    return (
      <Routes>
        <Route path="/invite/:token" element={<LoginPage />} />
        <Route path="*" element={<EmailLoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/readme" element={<ReadmePage />} />
      <Route path="/activity" element={<ActivityRoutePage />} />
      <Route path="/albums" element={<AlbumsPage />} />
      <Route path="/albums/:albumId" element={<AlbumsPage />} />
      <Route path="/invite/:token" element={<Navigate to="/" replace />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
