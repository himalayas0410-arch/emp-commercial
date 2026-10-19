import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldAlert, ArrowRight, UserCheck, Building, KeyRound, QrCode } from 'lucide-react';

interface AuthViewProps {
  onOpenPublicScan: (token: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onOpenPublicScan }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('rahul.sharma@apexglobal.com');
  const [password, setPassword] = useState<string>('Emp@123');
  const [fullName, setFullName] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<'employee' | 'company_admin'>('employee');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          phone,
          role,
          organization_name: role === 'company_admin' ? orgName : undefined
        });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoCredentials = (demoType: 'employee' | 'hr' | 'admin') => {
    setIsRegister(false);
    setError(null);
    if (demoType === 'employee') {
      setEmail('rahul.sharma@apexglobal.com');
      setPassword('Emp@123');
    } else if (demoType === 'hr') {
      setEmail('hr@apexglobal.com');
      setPassword('Emp@123');
    } else {
      setEmail('superadmin@emp.com');
      setPassword('Admin@123');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'radial-gradient(circle at top right, #1E293B, #0F172A)' }}>
      <div className="emp-card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--red-600), var(--navy-900))', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)', marginBottom: '0.75rem' }}>
            <ShieldAlert size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.02em' }}>
            EMP Commercial
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Emergency Medical Portal & Corporate Duty-of-Care Platform
          </p>
        </div>

        {/* 1-Click Demo Accounts Quick Selector */}
        <div style={{ background: 'var(--bg-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Instant Evaluation Demo Accounts:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
            <button
              type="button"
              onClick={() => setDemoCredentials('employee')}
              className="emp-btn emp-btn-outline emp-btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px' }}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('hr')}
              className="emp-btn emp-btn-outline emp-btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px' }}
            >
              HR Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('admin')}
              className="emp-btn emp-btn-outline emp-btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px' }}
            >
              Super Admin
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--red-50)', color: 'var(--red-700)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', marginBottom: '1.25rem', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="emp-input"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Account Role *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="emp-select"
                >
                  <option value="employee">Enrolled Employee</option>
                  <option value="company_admin">Company HR Administrator</option>
                </select>
              </div>

              {role === 'company_admin' && (
                <div className="emp-form-group">
                  <label className="emp-label">Organization / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="emp-input"
                    placeholder="e.g. Apex Global Technologies"
                  />
                </div>
              )}

              <div className="emp-form-group">
                <label className="emp-label">Mobile Phone (with country code)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="emp-input"
                  placeholder="+91 98765 43210"
                />
              </div>
            </>
          )}

          <div className="emp-form-group">
            <label className="emp-label">Work Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="emp-input"
              placeholder="name@company.com"
            />
          </div>

          <div className="emp-form-group">
            <label className="emp-label">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="emp-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="emp-btn emp-btn-primary emp-btn-full"
            style={{ marginTop: '0.5rem', padding: '0.75rem' }}
          >
            <span>{submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In Securely'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle sign in / register */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: 'var(--teal-600)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a new enterprise account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: 'var(--teal-600)', fontWeight: 700, cursor: 'pointer' }}
              >
                Register Here
              </button>
            </span>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0 1rem' }} />

        {/* Live Public Emergency QR Direct Preview */}
        <button
          type="button"
          onClick={() => onOpenPublicScan('EMP-RAHUL-789X')}
          className="emp-btn emp-btn-outline emp-btn-full emp-btn-sm"
          style={{ borderColor: 'rgba(220, 38, 38, 0.3)', color: 'var(--red-600)' }}
        >
          <QrCode size={15} />
          <span>Simulate Public QR Scan (No Login Needed)</span>
        </button>
      </div>
    </div>
  );
};
