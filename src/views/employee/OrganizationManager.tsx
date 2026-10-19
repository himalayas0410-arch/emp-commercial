import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { Building2, CheckCircle2, Shield, AlertTriangle, ArrowRight, LogOut, PhoneCall } from 'lucide-react';

export const OrganizationManager: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);

  // Join form state
  const [companyCode, setCompanyCode] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchAvailable();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/organization/my-status');
      setStatusData(res);
    } catch (err) {
      console.error('Failed to load org status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailable = async () => {
    try {
      const res = await api.get('/organization/available');
      setAvailableOrgs(res.organizations || []);
    } catch (err) {
      console.error('Failed to list orgs:', err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await api.post('/organization/join', {
        company_code: companyCode.trim(),
        employee_id_number: employeeId.trim() || undefined,
        department: department.trim() || undefined
      });
      setMessage({ type: 'success', text: res.message || 'Successfully joined organization.' });
      await fetchStatus();
      setCompanyCode('');
      setEmployeeId('');
      setDepartment('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to join organization.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this organization? Your personal QR badge, medical records, and family circle will remain 100% active and independent.')) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await api.post('/organization/leave', {});
      setMessage({ type: 'success', text: res.message });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to leave organization.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Organization details...</p>
      </div>
    );
  }

  const isEnrolled = statusData?.is_enrolled && statusData?.organization;
  const org = statusData?.organization;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {message && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? 'var(--emerald-50)' : 'var(--red-50)',
            color: message.type === 'success' ? 'var(--emerald-800)' : 'var(--red-700)',
            border: `1px solid ${message.type === 'success' ? 'var(--emerald-300)' : 'rgba(220, 38, 38, 0.2)'}`,
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          {message.text}
        </div>
      )}

      {/* Current Organization Card */}
      {isEnrolled ? (
        <div className="emp-card" style={{ borderLeft: '4px solid var(--teal-600)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--teal-50)', color: 'var(--teal-800)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <CheckCircle2 size={13} /> Active Workplace Membership
              </div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--navy-900)' }}>
                {org.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
                Corporate Identifier / Slug: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{org.slug}</code>
              </p>
            </div>

            <button
              onClick={handleLeave}
              disabled={submitting}
              className="emp-btn emp-btn-outline emp-btn-sm"
              style={{ color: 'var(--red-600)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
            >
              <LogOut size={14} />
              <span>Leave Company</span>
            </button>
          </div>

          {/* 24/7 Corporate Medical Desk info */}
          <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '1.25rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Corporate Emergency Medical Desk
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy-900)', fontWeight: 700, fontSize: '0.9375rem' }}>
              <PhoneCall size={16} style={{ color: 'var(--teal-600)' }} />
              <span>{org.emergency_phone || 'Hotline configured in HR portal'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                ({org.emergency_contact_name || 'Emergency Dispatch'})
              </span>
            </div>
            {org.emergency_instructions && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                "{org.emergency_instructions}"
              </p>
            )}
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🛡️ <strong>Privacy Protection:</strong> Your company only receives alerts during acute emergencies and has zero access to your private consultations or unapproved medical history.
          </div>
        </div>
      ) : (
        <div className="emp-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--navy-700)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--navy-50)', color: 'var(--navy-900)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <Shield size={13} /> Independent Account Status
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--navy-900)' }}>
            You are currently an Independent Individual
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', lineHeight: 1.5 }}>
            No company affiliation is required to use EMP Commercial. Your emergency QR code, personal medical disclosures, and family network operate 100% autonomously.
          </p>
        </div>
      )}

      {/* Join an Organization Form */}
      <div className="emp-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} style={{ color: 'var(--teal-600)' }} />
          <span>Join a Company or Institution</span>
        </h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          If your employer or university uses EMP Commercial for duty-of-care, enter your company code or select from registered organizations below.
        </p>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="emp-form-group">
            <label className="emp-label">Company Code / Organization Name *</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                required
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value)}
                placeholder="e.g. apex-global or enter Company Code"
                className="emp-input"
                style={{ flex: 1, minWidth: '220px' }}
              />
              {availableOrgs.length > 0 && (
                <select
                  onChange={e => {
                    if (e.target.value) setCompanyCode(e.target.value);
                  }}
                  className="emp-select"
                  style={{ width: 'auto' }}
                  defaultValue=""
                >
                  <option value="" disabled>Select from Directory...</option>
                  {availableOrgs.map(o => (
                    <option key={o.id} value={o.slug}>{o.name} ({o.slug})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="emp-form-group">
              <label className="emp-label">Employee / Student ID (Optional)</label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. APX-9821"
                className="emp-input"
              />
            </div>
            <div className="emp-form-group">
              <label className="emp-label">Department / Unit (Optional)</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Sales"
                className="emp-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !companyCode.trim()}
            className="emp-btn emp-btn-teal"
            style={{ alignSelf: 'flex-start' }}
          >
            <span>{submitting ? 'Connecting...' : 'Connect to Organization'}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
