import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { MedicalProfile, EmergencyContact, QRTokenData } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { QRCard } from '../../components/QRCard.js';
import { MedicalProfileEditor } from './MedicalProfileEditor.js';
import { EmergencyContactsManager } from './EmergencyContactsManager.js';
import { FamilyManager } from './FamilyManager.js';
import { OrganizationManager } from './OrganizationManager.js';
import { EmergencyHistoryView } from './EmergencyHistoryView.js';
import { ShieldCheck, Heart, Users, QrCode, FileText, Bell, CheckCircle2, AlertCircle, Building2, DownloadCloud, History } from 'lucide-react';

interface EmployeePortalProps {
  onOpenPublicScan?: (token: string) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({ onOpenPublicScan }) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'profile' | 'contacts' | 'family' | 'qr' | 'organization' | 'alerts' | 'privacy'>('home');
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [qrToken, setQrToken] = useState<QRTokenData | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/profiles/me');
      setProfile(data.profile);
      setContacts(data.contacts || []);
      setQrToken(data.qr_token || null);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendQR = async () => {
    const res = await api.post('/qr/suspend', {});
    setQrToken(res.qr_token);
  };

  const handleReactivateQR = async () => {
    const res = await api.post('/qr/reactivate', {});
    setQrToken(res.qr_token);
  };

  const handleRegenerateQR = async () => {
    const res = await api.post('/qr/regenerate', {});
    setQrToken(res.qr_token);
  };

  const handleRevokeQR = async () => {
    const res = await api.post('/qr/revoke', {});
    setQrToken(res.qr_token);
  };

  const handleGenerateQR = async () => {
    const res = await api.post('/qr/generate', {});
    setQrToken(res.qr_token);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Employee Profile...</p>
      </div>
    );
  }

  const completionPct = profile?.profile_completion_pct || 25;

  return (
    <div className="emp-container emp-main-content" style={{ marginTop: '1.5rem', marginBottom: '3rem' }}>
      {/* Subtab Navigation Pill Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          className={`emp-nav-link ${activeSubTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('home')}
        >
          <ShieldCheck size={16} />
          <span>Home Dashboard</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <FileText size={16} />
          <span>Medical Profile</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('contacts')}
        >
          <Users size={16} />
          <span>Emergency Contacts ({contacts.length})</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'family' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('family')}
        >
          <Heart size={16} />
          <span>Family Hub</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('qr')}
        >
          <QrCode size={16} />
          <span>QR Management</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('organization')}
        >
          <Building2 size={16} />
          <span>Organization</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('alerts')}
        >
          <History size={16} />
          <span>Alert History</span>
        </button>

        <button
          className={`emp-nav-link ${activeSubTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('privacy')}
        >
          <ShieldCheck size={16} />
          <span>Privacy & DPDP Consent</span>
        </button>
      </div>

      {/* 1. HOME TAB */}
      {activeSubTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Welcome & Completion Card */}
          <div className="emp-card" style={{ background: 'linear-gradient(135deg, var(--navy-900), #1E293B)', color: '#FFFFFF', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Building2 size={13} /> {user?.organization_name || 'Independent Account (Direct Registration)'}
                </div>
                <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginTop: '0.5rem', color: '#FFFFFF' }}>
                  Welcome, {user?.full_name}
                </h1>
                <p style={{ color: 'var(--navy-300)', fontSize: '0.875rem', marginTop: '0.25rem', maxWidth: '580px' }}>
                  Your Emergency Medical Portal is active. In case of acute medical distress, first responders scan your personal QR code to view life-saving vitals and alert your family.
                </p>
              </div>

              {/* Profile Completion Meter */}
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', minWidth: '180px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--navy-300)', fontWeight: 600 }}>PROFILE COMPLETION</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: completionPct >= 80 ? 'var(--teal-400)' : 'var(--amber-500)', marginTop: '2px' }}>
                  {completionPct}%
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${completionPct}%`, height: '100%', background: completionPct >= 80 ? 'var(--teal-400)' : 'var(--amber-500)', transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Live QR Card */}
          <QRCard
            tokenData={qrToken}
            displayName={profile?.full_name || user?.full_name || 'Individual'}
            bloodGroup={profile?.blood_group}
            onSuspend={handleSuspendQR}
            onReactivate={handleReactivateQR}
            onRegenerate={handleRegenerateQR}
            onRevoke={handleRevokeQR}
            onGenerate={handleGenerateQR}
            onOpenPublicScan={onOpenPublicScan}
          />

          {/* Quick Shortcuts Grid */}
          <div className="emp-grid-3">
            <div className="emp-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('profile')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--teal-50)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Medical Profile</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blood: {profile?.blood_group || 'Not set'} • {profile?.allergies.length || 0} Allergies</div>
                </div>
              </div>
            </div>

            <div className="emp-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('contacts')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--red-50)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Emergency Contacts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contacts.length} Registered Contacts</div>
                </div>
              </div>
            </div>

            <div className="emp-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('family')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Family Linking Hub</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Independent Accounts & Linking</div>
                </div>
              </div>
            </div>

            <div className="emp-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('organization')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Organization</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.organization_name || 'Optional Company Join'}</div>
                </div>
              </div>
            </div>

            <div className="emp-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('alerts')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Alert Delivery Logs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real Incident Receipts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MEDICAL PROFILE TAB */}
      {activeSubTab === 'profile' && profile && (
        <MedicalProfileEditor
          initialProfile={profile}
          onSaved={(updated) => setProfile(updated)}
        />
      )}

      {/* 3. EMERGENCY CONTACTS TAB */}
      {activeSubTab === 'contacts' && (
        <EmergencyContactsManager
          contacts={contacts}
          onContactsUpdated={(updated) => setContacts(updated)}
        />
      )}

      {/* 4. FAMILY TAB */}
      {activeSubTab === 'family' && (
        <FamilyManager onOpenPublicScan={onOpenPublicScan} />
      )}

      {/* 5. QR CODE DEDICATED TAB */}
      {activeSubTab === 'qr' && (
        <QRCard
          tokenData={qrToken}
          displayName={profile?.full_name || user?.full_name || 'Individual'}
          bloodGroup={profile?.blood_group}
          onSuspend={handleSuspendQR}
          onReactivate={handleReactivateQR}
          onRegenerate={handleRegenerateQR}
          onRevoke={handleRevokeQR}
          onGenerate={handleGenerateQR}
          onOpenPublicScan={onOpenPublicScan}
        />
      )}

      {/* 6. ORGANIZATION TAB */}
      {activeSubTab === 'organization' && (
        <OrganizationManager />
      )}

      {/* 7. ALERTS HISTORY TAB */}
      {activeSubTab === 'alerts' && (
        <EmergencyHistoryView />
      )}

      {/* 6. PRIVACY & DPDP ACT CONSENT TAB */}
      {activeSubTab === 'privacy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="emp-card">
            <div className="emp-card-header">
              <div className="emp-card-title">
                <ShieldCheck size={20} style={{ color: 'var(--teal-600)' }} />
                <span>Data Protection & Privacy Notice (DPDP Act, 2023)</span>
              </div>
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>
                In compliance with India's <strong>Digital Personal Data Protection Act, 2023</strong> and international health privacy guidelines:
              </p>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong>1. Purpose Limitation:</strong> Your health records are collected strictly to facilitate emergency medical assistance when your physical QR code is scanned.
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong>2. Employer Access Restriction:</strong> Your company administrators cannot view your complete medical history or private diagnoses. Company administrators only receive emergency alert notifications and onboarding status.
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong>3. Revocation at Will:</strong> You have the legal right to suspend, reactivate, or permanently revoke your emergency QR token at any moment.
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => alert('Data Export: A JSON copy of your personal records has been prepared and encrypted.')}
                  className="emp-btn emp-btn-outline emp-btn-sm"
                >
                  <DownloadCloud size={15} />
                  <span>Download My Data (JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      <nav className="emp-bottom-nav">
        <button
          className={`emp-bottom-nav-item ${activeSubTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('home')}
        >
          <ShieldCheck size={20} />
          <span>Home</span>
        </button>

        <button
          className={`emp-bottom-nav-item ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <FileText size={20} />
          <span>Profile</span>
        </button>

        <button
          className={`emp-bottom-nav-item ${activeSubTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('qr')}
        >
          <QrCode size={20} />
          <span>My QR</span>
        </button>

        <button
          className={`emp-bottom-nav-item ${activeSubTab === 'family' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('family')}
        >
          <Heart size={20} />
          <span>Family</span>
        </button>

        <button
          className={`emp-bottom-nav-item ${activeSubTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('contacts')}
        >
          <Users size={20} />
          <span>Contacts</span>
        </button>
      </nav>
    </div>
  );
};
