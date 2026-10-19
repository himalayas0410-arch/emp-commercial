import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ShieldAlert, User, Building, ShieldCheck, QrCode, LogOut, Sun, Moon, ArrowRightLeft } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openPublicScanToken?: string;
  onOpenPublicScan?: (token: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openPublicScanToken,
  onOpenPublicScan
}) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <header className="emp-header">
      <div className="emp-container">
        <div className="emp-header-inner">
          {/* Logo */}
          <div className="emp-logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>
            <div className="emp-logo-icon">
              <ShieldAlert size={20} />
            </div>
            <div>
              <span>EMP</span>
              <span style={{ color: 'var(--teal-600)', marginLeft: '4px', fontSize: '0.85em', fontWeight: 600 }}>Commercial</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="emp-nav-links" style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              className={`emp-nav-link ${currentTab === 'home' || currentTab === 'profile' || currentTab === 'qr' || currentTab === 'family' ? 'active' : ''}`}
              onClick={() => setCurrentTab('home')}
            >
              <User size={16} />
              <span>Employee Portal</span>
            </button>

            {(user?.role === 'company_admin' || user?.role === 'super_admin') && (
              <button
                className={`emp-nav-link ${currentTab === 'company' ? 'active' : ''}`}
                onClick={() => setCurrentTab('company')}
              >
                <Building size={16} />
                <span>Company HR</span>
              </button>
            )}

            {user?.role === 'super_admin' && (
              <button
                className={`emp-nav-link ${currentTab === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentTab('admin')}
              >
                <ShieldCheck size={16} />
                <span>Super Admin</span>
              </button>
            )}

            <button
              className={`emp-nav-link ${currentTab === 'public_scan' ? 'active' : ''}`}
              onClick={() => {
                if (onOpenPublicScan) {
                  onOpenPublicScan(openPublicScanToken || 'EMP-RAHUL-789X');
                } else {
                  setCurrentTab('public_scan');
                }
              }}
              style={{ color: 'var(--red-600)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
            >
              <QrCode size={16} />
              <span>Live Emergency QR Page</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
            {/* Quick Role Switcher for seamless pair-programming test inspection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-subtle)', padding: '2px 4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', padding: '0 4px' }}>
                <ArrowRightLeft size={11} /> Switch:
              </span>
              <button
                className="emp-btn emp-btn-ghost emp-btn-sm"
                style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: user?.role === 'employee' ? 700 : 500, color: user?.role === 'employee' ? 'var(--teal-600)' : 'inherit' }}
                onClick={() => quickSwitchRole('employee')}
              >
                Emp
              </button>
              <button
                className="emp-btn emp-btn-ghost emp-btn-sm"
                style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: user?.role === 'company_admin' ? 700 : 500, color: user?.role === 'company_admin' ? 'var(--teal-600)' : 'inherit' }}
                onClick={() => quickSwitchRole('company_admin')}
              >
                HR
              </button>
              <button
                className="emp-btn emp-btn-ghost emp-btn-sm"
                style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: user?.role === 'super_admin' ? 700 : 500, color: user?.role === 'super_admin' ? 'var(--teal-600)' : 'inherit' }}
                onClick={() => quickSwitchRole('super_admin')}
              >
                Admin
              </button>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="emp-btn emp-btn-ghost emp-btn-sm"
              title="Toggle Theme"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* User Details & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ textAlign: 'right', display: 'none', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{user?.full_name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>

              <button
                onClick={logout}
                className="emp-btn emp-btn-outline emp-btn-sm"
                title="Sign out"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
