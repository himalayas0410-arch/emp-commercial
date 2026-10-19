import React, { useState, useEffect } from 'react';
import { PublicEmergencyProfile } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { ShieldAlert, PhoneCall, AlertOctagon, MapPin, CheckCircle, Clock, HeartHandshake, AlertTriangle, ShieldX, MessageCircle, MessageSquare } from 'lucide-react';

interface PublicEmergencyScanViewProps {
  token: string;
  onBackToApp?: () => void;
}

export const PublicEmergencyScanView: React.FC<PublicEmergencyScanViewProps> = ({ token, onBackToApp }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<PublicEmergencyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Alert Trigger State
  const [alertSubmitting, setAlertSubmitting] = useState<boolean>(false);
  const [alertResult, setAlertResult] = useState<any | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [locationCoords, setLocationCoords] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);

  useEffect(() => {
    fetchEmergencyProfile();
  }, [token]);

  const fetchEmergencyProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/emergency/${token}`);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load emergency profile.');
    } finally {
      setLoading(false);
    }
  };

  // Optional 1-tap location detection
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location not supported by device browser.');
      return;
    }
    setLocationStatus('Acquiring GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        });
        setLocationStatus('Location attached: GPS coordinates acquired.');
      },
      (err) => {
        console.warn('Geolocation permission rejected or unavailable:', err);
        setLocationStatus('GPS permission not granted. Emergency alert will proceed without location.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSendAlert = async () => {
    setAlertSubmitting(true);
    try {
      const payload: any = {};
      if (locationCoords) {
        payload.location_lat = locationCoords.lat;
        payload.location_lng = locationCoords.lng;
        payload.location_address = locationCoords.address;
      }
      const res = await api.post(`/emergency/${token}/alert`, payload);
      setAlertResult(res);
    } catch (err: any) {
      alert('Alert dispatch issue: ' + (err.message || 'Please call the emergency phone number directly.'));
    } finally {
      setAlertSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="emp-emergency-scan-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Retrieving Emergency Medical Data...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Verifying secure token signature</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Handle Suspended QR Status
  if (profile?.status === 'suspended') {
    return (
      <div className="emp-emergency-scan-container">
        <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderTop: '4px solid var(--amber-500)' }}>
          <AlertTriangle size={56} style={{ color: 'var(--amber-500)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>Profile Temporarily Suspended</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
            {profile.message || 'This emergency profile has been temporarily suspended by the account owner. No private medical data can be disclosed at this time.'}
          </p>
          {onBackToApp && (
            <button onClick={onBackToApp} className="emp-btn emp-btn-outline" style={{ marginTop: '1.5rem' }}>
              Back to Employee Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handle Revoked QR Status or Invalid Token
  if (profile?.status === 'revoked' || error) {
    return (
      <div className="emp-emergency-scan-container">
        <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderTop: '4px solid var(--red-600)' }}>
          <ShieldX size={56} style={{ color: 'var(--red-600)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>Emergency QR Code Invalid</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
            {error || profile?.message || 'This emergency QR code has been permanently revoked or does not exist.'}
          </p>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            If this is a critical medical situation, please dial <strong>112</strong> / <strong>911</strong> immediately.
          </div>
          {onBackToApp && (
            <button onClick={onBackToApp} className="emp-btn emp-btn-outline" style={{ marginTop: '1.5rem' }}>
              Back to Employee Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  const severeAllergies = profile?.allergies?.filter(a => a.severity === 'severe' || a.severity === 'life_threatening') || [];
  const otherAllergies = profile?.allergies?.filter(a => a.severity !== 'severe' && a.severity !== 'life_threatening') || [];
  const criticalMeds = profile?.medications?.filter(m => m.is_critical) || [];
  const otherMeds = profile?.medications?.filter(m => !m.is_critical) || [];

  return (
    <div className="emp-emergency-scan-container">
      {onBackToApp && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={onBackToApp} className="emp-btn emp-btn-ghost emp-btn-sm">
            ← Return to EMP Portal
          </button>
        </div>
      )}

      {/* Emergency Header with Blood Group Hero */}
      <div className="emp-emergency-header">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <ShieldAlert size={14} /> EMP Emergency Medical Profile
        </div>

        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginTop: '0.75rem', color: '#FFFFFF' }}>
          {profile?.display_name}
        </h1>

        {profile?.blood_group && (
          <div className="emp-blood-group-hero">
            <span className="emp-blood-group-label">Blood Group</span>
            <span>{profile.blood_group}</span>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Life-Threatening Allergies Warning Banner */}
        {severeAllergies.length > 0 && (
          <div style={{ background: 'var(--red-50)', border: '2px solid var(--red-600)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--red-700)', fontWeight: 800, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
              <AlertOctagon size={20} />
              <span>CRITICAL ALLERGIES / ANAPHYLAXIS RISK</span>
            </div>
            {severeAllergies.map(a => (
              <div key={a.id} style={{ fontSize: '0.875rem', color: 'var(--navy-900)', fontWeight: 600, marginTop: '0.25rem' }}>
                • <strong>{a.allergen}</strong>: {a.reaction} ({a.severity.replace('_', ' ')})
              </div>
            ))}
          </div>
        )}

        {/* Immediate Emergency Phone Dialers */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Emergency Phone Contacts (Tap to Call)
          </div>

          {profile?.emergency_contacts && profile.emergency_contacts.length > 0 ? (
            profile.emergency_contacts.map((c, idx) => {
              const rawDigits = c.phone.replace(/[^0-9]/g, '');
              const cleanPhone = c.phone.replace(/\s+/g, '');
              const emergencyText = encodeURIComponent(
                `🚨 EMERGENCY ALERT: I scanned ${profile?.display_name || 'the employee'}'s Emergency Medical QR badge. Please respond urgently. Emergency profile: ${typeof window !== 'undefined' ? window.location.href : ''}`
              );
              const waUrl = `https://wa.me/${rawDigits}?text=${emergencyText}`;
              const smsUrl = `sms:${cleanPhone}?body=${emergencyText}`;

              return (
                <div
                  key={c.id}
                  className="emp-card"
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    border: idx === 0 ? '2px solid var(--emerald-500)' : '1px solid var(--border-color)',
                    background: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--navy-900)' }}>{c.name}</span>
                        {idx === 0 && (
                          <span style={{ background: 'var(--emerald-50)', color: 'var(--emerald-700)', border: '1px solid var(--emerald-300)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase' }}>
                            Primary Contact
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                        {c.relationship} • {c.phone}
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Direct Channels (Zero Server SMS dependency - uses bystander device) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="emp-btn emp-btn-sm"
                      style={{ background: 'var(--emerald-600)', color: '#FFFFFF', justifyContent: 'center', padding: '0.5rem 0.25rem', fontSize: '0.8125rem' }}
                    >
                      <PhoneCall size={14} />
                      <span>Call</span>
                    </a>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="emp-btn emp-btn-sm"
                      style={{ background: '#25D366', color: '#FFFFFF', justifyContent: 'center', padding: '0.5rem 0.25rem', fontSize: '0.8125rem' }}
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={smsUrl}
                      className="emp-btn emp-btn-sm"
                      style={{ background: 'var(--navy-800)', color: '#FFFFFF', justifyContent: 'center', padding: '0.5rem 0.25rem', fontSize: '0.8125rem' }}
                    >
                      <MessageSquare size={14} />
                      <span>SMS</span>
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              No private family contacts registered for public view.
            </div>
          )}

          {/* Company Emergency Hotline Button */}
          {profile?.company_emergency_contact && (
            <div className="emp-card" style={{ padding: '1rem', border: '2px solid var(--teal-500)', background: 'var(--teal-50)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-900)' }}>
                    {profile.company_emergency_contact.organization_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--teal-800)', fontWeight: 600 }}>
                    {profile.company_emergency_contact.contact_name || '24/7 Corporate Emergency Desk'}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--teal-900)' }}>
                  {profile.company_emergency_contact.phone}
                </div>
              </div>
              {profile.company_emergency_contact.instructions && (
                <div style={{ fontSize: '0.75rem', color: 'var(--teal-900)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                  "{profile.company_emergency_contact.instructions}"
                </div>
              )}
              <a
                href={`tel:${profile.company_emergency_contact.phone.replace(/\s+/g, '')}`}
                className="emp-btn emp-btn-teal emp-btn-full emp-btn-sm"
                style={{ justifyContent: 'center' }}
              >
                <PhoneCall size={15} />
                <span>Call Emergency Hotline ({profile.company_emergency_contact.phone})</span>
              </a>
            </div>
          )}
        </div>

        {/* SEND EMERGENCY ALERT SECTION */}
        <div style={{ background: 'var(--navy-50)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: '0.25rem' }}>
            Trigger Digital Emergency Alert
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Automatically notifies registered family contacts & company emergency responders via SMS, Email, and Push notifications.
          </div>

          {!alertResult ? (
            <div>
              {/* Optional Geolocation */}
              <div style={{ marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="emp-btn emp-btn-secondary emp-btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MapPin size={14} />
                  <span>{locationCoords ? 'Location Attached ✓' : 'Attach GPS Location (Optional)'}</span>
                </button>
                {locationStatus && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--teal-700)', marginTop: '4px' }}>
                    {locationStatus}
                  </div>
                )}
              </div>

              <button
                onClick={handleSendAlert}
                disabled={alertSubmitting}
                className="emp-btn emp-btn-emergency emp-btn-full emp-btn-lg"
              >
                <AlertOctagon size={22} />
                <span>{alertSubmitting ? 'DISPATCHING EMERGENCY ALERT...' : 'SEND EMERGENCY ALERT'}</span>
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--emerald-50)', border: '1px solid var(--emerald-500)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--emerald-700)', fontWeight: 800, fontSize: '1rem' }}>
                <CheckCircle size={20} />
                <span>Emergency Alert Dispatched Successfully</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                • <strong>Incident Code:</strong> {alertResult.incident_code}<br />
                • <strong>Recipients Notified:</strong> {alertResult.recipients_notified} contacts reached<br />
                • <strong>Channels:</strong> In-App live log, SMS & Push alerts queued.
              </div>
            </div>
          )}
        </div>

        {/* Structured Medical Information (Data-Minimized) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Critical Medications */}
          {criticalMeds.length > 0 && (
            <div style={{ background: 'var(--bg-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Critical Medications
              </div>
              {criticalMeds.map(m => (
                <div key={m.id} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  • <strong>{m.name}</strong> ({m.dosage}) - {m.frequency}
                </div>
              ))}
            </div>
          )}

          {/* Implanted Devices */}
          {profile?.devices && profile.devices.length > 0 && (
            <div style={{ background: 'var(--bg-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Implanted Medical Devices
              </div>
              {profile.devices.map(d => (
                <div key={d.id} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  • <strong>{d.device_name}</strong> {d.details ? `(${d.details})` : ''}
                </div>
              ))}
            </div>
          )}

          {/* Parametric Emergency Notes */}
          {profile?.emergency_notes && (
            <div style={{ background: 'var(--bg-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Paramedic & First Responder Instructions
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {profile.emergency_notes}
              </p>
            </div>
          )}
        </div>

        {/* Medical Disclaimer */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4, textAlign: 'center' }}>
          EMP Medical Disclaimer: Information on this page is self-reported by the individual and provided solely to assist first responders in an emergency. It does not replace professional medical diagnosis or paramedic triage.
        </div>
      </div>
    </div>
  );
};
