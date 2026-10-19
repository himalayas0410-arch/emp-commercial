import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QRTokenData, QRStatus } from '../types/index.js';
import { StatusBadge } from './StatusBadge.js';
import { downloadQRPng, downloadQRPdf, triggerPrint } from '../utils/qrExport.js';
import { Download, Printer, Copy, Check, RefreshCw, PauseCircle, PlayCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

interface QRCardProps {
  tokenData: QRTokenData | null;
  displayName: string;
  bloodGroup?: string;
  onSuspend: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onOpenPublicScan?: (token: string) => void;
}

export const QRCard: React.FC<QRCardProps> = ({
  tokenData,
  displayName,
  bloodGroup,
  onSuspend,
  onReactivate,
  onRegenerate,
  onOpenPublicScan
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showRegenModal, setShowRegenModal] = useState<boolean>(false);

  const publicToken = tokenData?.public_token || '';
  const status: QRStatus = tokenData?.status || 'not_generated';
  const emergencyUrl = typeof window !== 'undefined' ? `${window.location.origin}/e/${publicToken}` : `/e/${publicToken}`;

  useEffect(() => {
    if (publicToken) {
      QRCode.toDataURL(emergencyUrl, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [publicToken, emergencyUrl]);

  const copyUrl = () => {
    navigator.clipboard.writeText(emergencyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuspendToggle = async () => {
    setIsProcessing(true);
    try {
      if (status === 'suspended') {
        await onReactivate();
      } else {
        await onSuspend();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmRegenerate = async () => {
    setIsProcessing(true);
    try {
      await onRegenerate();
      setShowRegenModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="emp-card emp-print-area" style={{ position: 'relative' }}>
      <div className="emp-card-header">
        <div>
          <div className="emp-card-title">
            <ShieldAlert size={20} style={{ color: 'var(--teal-600)' }} />
            <span>Emergency QR Management</span>
          </div>
          <div className="emp-card-subtitle">
            Scan opens verified emergency data instantly. Full medical record remains private.
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: '1.5rem', alignItems: 'center' }}>
        {/* QR Display Frame */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          {status === 'active' && qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Emergency QR Code"
              style={{ width: '100%', maxWidth: '220px', height: 'auto', borderRadius: '8px', background: '#FFFFFF', padding: '8px', boxShadow: 'var(--shadow-sm)' }}
            />
          ) : status === 'suspended' ? (
            <div style={{ width: '200px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--amber-50)', color: 'var(--amber-700)', borderRadius: '8px', border: '2px dashed var(--amber-500)', padding: '1rem' }}>
              <PauseCircle size={40} style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>QR Suspended</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Public access is disabled.</div>
            </div>
          ) : (
            <div style={{ width: '200px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--red-50)', color: 'var(--red-700)', borderRadius: '8px', border: '2px dashed var(--red-500)', padding: '1rem' }}>
              <AlertTriangle size={40} style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>QR Revoked</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Token permanently invalidated.</div>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {publicToken || 'NO-TOKEN'}
            </span>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Total Scans: {tokenData?.scan_count || 0}
            </div>
          </div>
        </div>

        {/* QR Actions & Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Emergency Public URL
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={emergencyUrl}
                className="emp-input"
                style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-subtle)' }}
              />
              <button onClick={copyUrl} className="emp-btn emp-btn-secondary emp-btn-sm" title="Copy URL">
                {copied ? <Check size={16} style={{ color: 'var(--emerald-600)' }} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => downloadQRPng(publicToken, displayName)}
              disabled={status !== 'active'}
              className="emp-btn emp-btn-secondary emp-btn-sm"
            >
              <Download size={15} />
              <span>Download PNG</span>
            </button>

            <button
              onClick={() => downloadQRPdf(publicToken, displayName, bloodGroup)}
              disabled={status !== 'active'}
              className="emp-btn emp-btn-teal emp-btn-sm"
            >
              <Download size={15} />
              <span>Download ID Card (PDF)</span>
            </button>

            <button
              onClick={triggerPrint}
              disabled={status !== 'active'}
              className="emp-btn emp-btn-outline emp-btn-sm"
            >
              <Printer size={15} />
              <span>Print Badge</span>
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          {/* Lifecycle State Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSuspendToggle}
              disabled={isProcessing || status === 'revoked'}
              className={`emp-btn emp-btn-sm ${status === 'suspended' ? 'emp-btn-teal' : 'emp-btn-outline'}`}
            >
              {status === 'suspended' ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
              <span>{status === 'suspended' ? 'Reactivate QR' : 'Suspend QR'}</span>
            </button>

            <button
              onClick={() => setShowRegenModal(true)}
              disabled={isProcessing}
              className="emp-btn emp-btn-danger-outline emp-btn-sm"
            >
              <RefreshCw size={15} />
              <span>Regenerate QR</span>
            </button>

            {onOpenPublicScan && (
              <button
                onClick={() => onOpenPublicScan(publicToken)}
                className="emp-btn emp-btn-ghost emp-btn-sm"
                style={{ color: 'var(--teal-600)', fontWeight: 700 }}
              >
                Preview Public Scan →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Regeneration */}
      {showRegenModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--red-600)', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Regenerate Emergency QR?</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Regenerating your QR code will <strong>permanently revoke your existing QR token</strong> ({publicToken}). 
              Any physical badges, printouts, or stickers with the previous QR code will immediately stop working. 
              A new unpredictable token will be created atomically.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowRegenModal(false)}
                className="emp-btn emp-btn-secondary"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={confirmRegenerate}
                className="emp-btn emp-btn-emergency"
                disabled={isProcessing}
              >
                {isProcessing ? 'Regenerating...' : 'Yes, Revoke Old & Mint New'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
