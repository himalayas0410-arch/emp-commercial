import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ExternalLink, Wifi, Server, ShieldCheck } from 'lucide-react';

interface ExpoGoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpoGoModal: React.FC<ExpoGoModalProps> = ({ isOpen, onClose }) => {
  const [ipAddress, setIpAddress] = useState('192.168.29.174');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [metroStatus, setMetroStatus] = useState<'checking' | 'online' | 'offline'>('online');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('online');

  const expoUrl = `exp://${ipAddress}:8081`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(expoUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate Expo QR:', err));

    // Health checks
    fetch(`http://${ipAddress}:8081/status`)
      .then(res => setMetroStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setMetroStatus('offline'));

    fetch(`http://${ipAddress}:5000/api/health`)
      .then(res => setApiStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, [isOpen, ipAddress, expoUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(expoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          color: 'var(--text-primary, #0F172A)',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color, #E2E8F0)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Smartphone size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                Test in Expo Go App
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                Run native EMP Mobile on your physical phone (Android / iOS)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Status Badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: metroStatus === 'online' ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${metroStatus === 'online' ? '#A7F3D0' : '#FECACA'}`,
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}
            >
              <Wifi size={14} color={metroStatus === 'online' ? '#059669' : '#DC2626'} />
              <div>
                <div style={{ fontWeight: 700, color: metroStatus === 'online' ? '#065F46' : '#991B1B' }}>
                  Metro Bundler: {metroStatus === 'online' ? 'Online (:8081)' : 'Offline'}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: apiStatus === 'online' ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${apiStatus === 'online' ? '#A7F3D0' : '#FECACA'}`,
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}
            >
              <Server size={14} color={apiStatus === 'online' ? '#059669' : '#DC2626'} />
              <div>
                <div style={{ fontWeight: 700, color: apiStatus === 'online' ? '#065F46' : '#991B1B' }}>
                  Backend API: {apiStatus === 'online' ? 'Online (:5000)' : 'Offline'}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--bg-subtle, #F8FAFC)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid var(--border-color, #E2E8F0)',
              marginBottom: '1.25rem'
            }}
          >
            {qrDataUrl ? (
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E2E8F0'
                }}
              >
                <img
                  src={qrDataUrl}
                  alt="Expo Go QR Code"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading QR code...
              </div>
            )}

            {/* URL Display with Copy */}
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                width: '100%',
                maxWidth: '380px'
              }}
            >
              <code style={{ flex: 1, fontSize: '0.8125rem', color: '#0F172A', fontWeight: 600 }}>
                {expoUrl}
              </code>
              <button
                onClick={handleCopy}
                className="emp-btn emp-btn-teal emp-btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              How to Open on your Phone:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-subtle, #F8FAFC)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--teal-600)', marginBottom: '4px' }}>
                  🤖 Android Phone
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
                  <li>Open <strong>Expo Go</strong> app</li>
                  <li>Tap <strong>Scan QR code</strong> and scan the code above</li>
                  <li>Or tap <em>Enter URL manually</em> and paste the copied URL</li>
                </ol>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-subtle, #F8FAFC)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--teal-600)', marginBottom: '4px' }}>
                  🍎 iPhone (iOS)
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
                  <li>Open default <strong>Camera</strong> app</li>
                  <li>Point at the QR code above</li>
                  <li>Tap the yellow <strong>Open in Expo Go</strong> banner</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Demo Login Credentials */}
          <div
            style={{
              padding: '10px 14px',
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#134E4A'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#0D9488" />
              Preloaded Demo Accounts (1-Tap inside app):
            </div>
            <div>
              <strong>Employee:</strong> <code>rahul.sharma@apexglobal.com</code> / <code>Emp@123</code>
            </div>
            <div>
              <strong>HR Admin:</strong> <code>hr@apexglobal.com</code> / <code>Emp@123</code>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--bg-subtle, #F8FAFC)',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button onClick={onClose} className="emp-btn emp-btn-outline emp-btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
