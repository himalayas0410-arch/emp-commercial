import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { AuthView } from './views/auth/AuthView.js';
import { EmployeePortal } from './views/employee/EmployeePortal.js';
import { CompanyDashboard } from './views/company/CompanyDashboard.js';
import { SuperAdminDashboard } from './views/superadmin/SuperAdminDashboard.js';
import { PublicEmergencyScanView } from './views/public/PublicEmergencyScanView.js';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [publicScanToken, setPublicScanToken] = useState<string | null>(null);

  // Check URL pathname for direct public emergency scan link (e.g. /e/EMP-RAHUL-789X)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/e\/([A-Za-z0-9_-]+)/);
    if (match) {
      setPublicScanToken(match[1]);
      setCurrentTab('public_scan');
    }
  }, []);

  const handleOpenPublicScan = (token: string) => {
    setPublicScanToken(token);
    setCurrentTab('public_scan');
  };

  // 1. Direct Public Emergency View (Zero Authentication Required)
  if (currentTab === 'public_scan' && publicScanToken) {
    return (
      <div className="emp-app-wrapper" style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '1rem 0 3rem' }}>
        <PublicEmergencyScanView
          token={publicScanToken}
          onBackToApp={() => {
            setPublicScanToken(null);
            setCurrentTab('home');
          }}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', border: '3px solid var(--border-color)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Initializing EMP Commercial...</div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Auth Screen
  if (!user) {
    return <AuthView onOpenPublicScan={handleOpenPublicScan} />;
  }

  // 3. Authenticated Application Shell
  return (
    <div className="emp-app-wrapper">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openPublicScanToken={publicScanToken || 'EMP-RAHUL-789X'}
        onOpenPublicScan={handleOpenPublicScan}
      />

      <main style={{ flex: 1 }}>
        {currentTab === 'home' && <EmployeePortal onOpenPublicScan={handleOpenPublicScan} />}
        {currentTab === 'company' && <CompanyDashboard onOpenPublicScan={handleOpenPublicScan} />}
        {currentTab === 'admin' && <SuperAdminDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
