import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Photo } from '@photo-viewer/shared';
import { useSetupStatus, useCurrentUser, useLogin } from './hooks/useAuth.js';
import { useTheme } from './hooks/useTheme.js';
import { SetupPage } from './pages/SetupPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { BrowsePage } from './pages/BrowsePage.js';
import { ViewerPage } from './pages/ViewerPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { ErrorBoundary } from './components/shared/ErrorBoundary.js';

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
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = useCallback((path: string) => {
    setFolderPath(path);
    setView('browse');
    setViewerState(null);
  }, []);

  const handlePhotoSelect = useCallback((photo: Photo, allPhotos: Photo[]) => {
    setViewerState({ photo, allPhotos });
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView('search');
  }, []);

  const handleSearchBack = useCallback(() => {
    setSearchQuery('');
    setView('browse');
  }, []);

  if (view === 'viewer' && viewerState) {
    return (
      <ViewerPage
        photo={viewerState.photo}
        allPhotos={viewerState.allPhotos}
        theme={theme}
        currentUser={currentUser.data!}
        onBack={handleBack}
        onPhotoChange={handlePhotoChange}
        onToggleInfo={() => setShowInfo(!showInfo)}
        showInfo={showInfo}
      />
    );
  }

  if (view === 'search') {
    return (
      <SearchPage
        initialQuery={searchQuery}
        onBack={handleSearchBack}
        onPhotoSelect={handlePhotoSelect}
      />
    );
  }

  if (view === 'activity') {
    return <ActivityPage onBack={() => setView('browse')} />;
  }

  return (
    <BrowsePage
      folderPath={folderPath}
      onNavigate={handleNavigate}
      onPhotoSelect={handlePhotoSelect}
      onSearch={handleSearch}
      onShowActivity={() => setView('activity')}
    />
  );
}

function EmailLoginPage() {
  const [email, setEmail] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(email);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <Route path="/invite/:token" element={<Navigate to="/" replace />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
