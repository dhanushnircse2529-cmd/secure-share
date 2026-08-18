import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { AppView } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { MyFilesPage } from './pages/MyFilesPage';
import { SharedLinksPage } from './pages/SharedLinksPage';
import { RecipientAccessPage } from './pages/RecipientAccessPage';
import { AccessLogsPage } from './pages/AccessLogsPage';
import { SecurityDashboardPage } from './pages/SecurityDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { api } from './lib/api';

function MainAppContent() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [recipientToken, setRecipientToken] = useState<string | null>(null);

  // Badge counters
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [threatCount, setThreatCount] = useState(0);

  // Detect URL path or query parameter for /share/:token
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get('share');

      if (path.startsWith('/share/')) {
        const token = path.replace('/share/', '').trim();
        if (token) {
          setRecipientToken(token);
          setCurrentView('recipient');
          return;
        }
      } else if (shareParam) {
        setRecipientToken(shareParam);
        setCurrentView('recipient');
        return;
      }

      // Default view for logged in user vs guest
      if (user && currentView === 'landing') {
        setCurrentView('dashboard');
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, [user]);

  // Load badge stats when authenticated
  useEffect(() => {
    if (user) {
      api.getSecurityStats().then(stats => {
        setActiveSharesCount(stats.activeLinks);
        setThreatCount(stats.suspiciousAttempts);
      }).catch(() => {});
    }
  }, [user, currentView]);

  const handleNavigate = (view: AppView) => {
    // If not authenticated and trying to access private views, redirect to login
    const privateViews: AppView[] = ['dashboard', 'upload', 'files', 'shares', 'logs', 'security', 'profile'];
    if (!user && privateViews.includes(view)) {
      setCurrentView('login');
      return;
    }

    if (view !== 'recipient') {
      // If we're leaving recipient mode, clear token if necessary
      if (window.location.pathname.startsWith('/share/')) {
        window.history.pushState({}, '', '/');
      }
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-400">Initializing SecureShare Vault...</span>
        </div>
      </div>
    );
  }

  // Recipient view bypasses standard dashboard layout
  if (currentView === 'recipient' && recipientToken) {
    return (
      <div className="min-h-screen bg-[#160D2B] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4C1D6F] via-[#160D2B] to-[#0A0515] text-zinc-100 flex flex-col justify-between">
        <Navbar currentView={currentView} onNavigate={handleNavigate} threatCount={0} />
        <main className="flex-1">
          <RecipientAccessPage
            token={recipientToken}
            onBackToApp={() => {
              window.history.pushState({}, '', '/');
              setCurrentView(user ? 'dashboard' : 'landing');
            }}
          />
        </main>
        <footer className="py-6 text-center text-xs text-zinc-400 border-t border-violet-500/10">
          SecureShare AES-256 Vault Architecture • Zero-Knowledge Expiry System
        </footer>
      </div>
    );
  }

  const isAuthenticatedView = user && currentView !== 'landing' && currentView !== 'login' && currentView !== 'register';

  return (
    <div className="min-h-screen bg-[#160D2B] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4C1D6F] via-[#160D2B] to-[#0A0515] text-zinc-100 flex flex-col justify-between selection:bg-pink-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenUpload={() => handleNavigate(user ? 'upload' : 'login')}
        threatCount={threatCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAuthenticatedView ? (
          <div className="flex gap-6 items-start">
            {/* Desktop Left Sidebar */}
            <div className="hidden lg:block">
              <Sidebar
                currentView={currentView}
                onNavigate={handleNavigate}
                activeLinksCount={activeSharesCount}
                threatCount={threatCount}
              />
            </div>

            {/* Main Stage */}
            <main className="flex-1 min-w-0">
              {currentView === 'dashboard' && (
                <DashboardPage
                  onNavigate={handleNavigate}
                  onOpenUpload={() => handleNavigate('upload')}
                />
              )}
              {currentView === 'upload' && (
                <UploadPage onNavigate={handleNavigate} />
              )}
              {currentView === 'files' && (
                <MyFilesPage
                  onNavigate={handleNavigate}
                  onOpenUpload={() => handleNavigate('upload')}
                />
              )}
              {currentView === 'shares' && (
                <SharedLinksPage
                  onNavigate={handleNavigate}
                  onOpenUpload={() => handleNavigate('upload')}
                />
              )}
              {currentView === 'logs' && (
                <AccessLogsPage onNavigate={handleNavigate} />
              )}
              {currentView === 'security' && (
                <SecurityDashboardPage onNavigate={handleNavigate} />
              )}
              {currentView === 'profile' && (
                <ProfilePage onNavigate={handleNavigate} />
              )}
            </main>
          </div>
        ) : (
          /* Public Views (Landing, Login, Register) */
          <main className="w-full">
            {currentView === 'landing' && (
              <LandingPage
                onNavigate={handleNavigate}
                onOpenUpload={() => handleNavigate(user ? 'upload' : 'register')}
              />
            )}
            {currentView === 'login' && (
              <LoginPage onNavigate={handleNavigate} />
            )}
            {currentView === 'register' && (
              <RegisterPage onNavigate={handleNavigate} />
            )}
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-500 border-t border-violet-500/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SecureShare – Military-Grade File Sharing & Real-Time Expiry Links</span>
          <span className="font-mono text-[11px] text-zinc-400">Cipher: AES-256-GCM • SHA-256</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}
