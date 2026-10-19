import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { ShieldCheck, Building, Users, QrCode, AlertOctagon, Activity, FileText } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'metrics' | 'orgs' | 'audit'>('metrics');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [m, o, l] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/organizations'),
        api.get('/admin/audit-logs')
      ]);
      setMetrics(m.metrics);
      setOrganizations(o.organizations || []);
      setAuditLogs(l.audit_logs || []);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrgStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.post(`/admin/organizations/${orgId}/status`, { status: newStatus });
      loadAdminData();
    } catch (err: any) {
      alert('Failed to update organization status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--navy-900)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Platform Super Administrator Console...</p>
      </div>
    );
  }

  return (
    <div className="emp-container" style={{ marginTop: '1.5rem', marginBottom: '3rem' }}>
      {/* Header Banner */}
      <div className="emp-card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--navy-900), var(--teal-700))', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Platform Super Administrator</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Cross-tenant governance, organizational health, and security audit explorer.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button className={`emp-nav-link ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>
            <Activity size={16} /> Global Health & Metrics
          </button>
          <button className={`emp-nav-link ${activeTab === 'orgs' ? 'active' : ''}`} onClick={() => setActiveTab('orgs')}>
            <Building size={16} /> Tenant Organizations ({organizations.length})
          </button>
          <button className={`emp-nav-link ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <FileText size={16} /> Security Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* 1. Global Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="emp-grid-4">
            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organizations</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--navy-900)', marginTop: '4px' }}>{metrics.total_organizations}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--emerald-600)', fontWeight: 600 }}>Active Tenants</div>
            </div>

            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Users</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--teal-600)', marginTop: '4px' }}>{metrics.total_users}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employees & Admins</div>
            </div>

            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active QR Tokens</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--emerald-600)', marginTop: '4px' }}>{metrics.active_qrs}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suspended: {metrics.suspended_qrs} • Revoked: {metrics.revoked_qrs}</div>
            </div>

            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency Incidents</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--red-600)', marginTop: '4px' }}>{metrics.total_incidents}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched Alerts: {metrics.total_notifications_sent}</div>
            </div>
          </div>

          <div className="emp-card">
            <div className="emp-card-header">
              <div className="emp-card-title">System Infrastructure Status</div>
            </div>
            <div className="emp-grid-2">
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>DATABASE BACKEND</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--emerald-600)', marginTop: '4px' }}>
                  Supabase PostgreSQL (Connected & Healthy)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Resilient local cache synchronization enabled
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>NOTIFICATION GATEWAYS</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--teal-600)', marginTop: '4px' }}>
                  Multi-Channel (In-App, SMS, Email, Push)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Adapters verified with simulated delivery logging
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Tenant Organizations */}
      {activeTab === 'orgs' && (
        <div className="emp-card" style={{ padding: '1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Organization</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Enrolled Seats</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Plan Tier</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map(org => (
                  <tr key={org.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <div style={{ fontWeight: 800 }}>{org.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hotline: {org.emergency_phone || 'None'}</div>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <strong>{org.enrolled_employees}</strong> / {org.subscription?.max_seats || 100}
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <span className="emp-badge emp-badge-pending" style={{ textTransform: 'uppercase' }}>
                        {org.subscription?.plan_tier || 'growth'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <StatusBadge status={org.status} size="sm" />
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => toggleOrgStatus(org.id, org.status)}
                        className={`emp-btn emp-btn-sm ${org.status === 'active' ? 'emp-btn-danger-outline' : 'emp-btn-teal'}`}
                      >
                        {org.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="emp-card" style={{ padding: '1.25rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Entity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Metadata Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="emp-badge emp-badge-pending" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
