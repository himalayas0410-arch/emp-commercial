import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Building2, Users, AlertTriangle, ShieldCheck, QrCode, UserPlus,
  FileSpreadsheet, PhoneCall, CheckCircle, Clock, Search, Filter, Save, Download
} from 'lucide-react';

interface CompanyDashboardProps {
  onOpenPublicScan?: (token: string) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ onOpenPublicScan }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'incidents' | 'settings'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);

  // Search & filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  // Form drafts
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invDept, setInvDept] = useState('Engineering');
  const [invEmpId, setInvEmpId] = useState('');
  const [invPhone, setInvPhone] = useState('');

  const [csvContent, setCsvContent] = useState('');
  const [csvResult, setCsvResult] = useState<any | null>(null);

  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const [dash, empList, incList, sett] = await Promise.all([
        api.get('/company/dashboard'),
        api.get('/company/employees'),
        api.get('/company/incidents'),
        api.get('/company/settings')
      ]);
      setDashboardData(dash);
      setEmployees(empList.employees || []);
      setIncidents(incList.incidents || []);
      setSettings(sett.organization);
    } catch (err) {
      console.error('Failed to load company dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/company/employees/invite', {
        full_name: invName,
        email: invEmail,
        department: invDept,
        employee_id_number: invEmpId,
        phone: invPhone
      });
      alert('Invitation dispatched successfully!');
      setShowInviteModal(false);
      setInvName('');
      setInvEmail('');
      loadCompanyData();
    } catch (err: any) {
      alert('Failed to invite employee: ' + err.message);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/company/employees/csv-import', { csv_content: csvContent });
      setCsvResult(res.results);
      loadCompanyData();
    } catch (err: any) {
      alert('CSV import failed: ' + err.message);
    }
  };

  const handleAcknowledge = async (incidentId: string) => {
    try {
      await api.post(`/company/incidents/${incidentId}/acknowledge`);
      loadCompanyData();
    } catch (err: any) {
      alert('Failed to acknowledge incident: ' + err.message);
    }
  };

  const handleResolve = async (incidentId: string) => {
    try {
      await api.post(`/company/incidents/${incidentId}/resolve`, { resolution_notes: resolveNotes });
      setShowResolveModal(null);
      setResolveNotes('');
      loadCompanyData();
    } catch (err: any) {
      alert('Failed to resolve incident: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/company/settings', settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const downloadSampleCsv = () => {
    const sample = `name,email,department,employee_id\nPriya Patel,priya.patel@acmecorp.com,Engineering,APX-ENG-108\nVikram Malhotra,vikram.m@acmecorp.com,Operations,APX-OPS-204\nNeha Gupta,neha.gupta@acmecorp.com,Marketing,APX-MKT-301`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EMP_Employee_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--navy-900)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Organization Command Center...</p>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {};
  const org = dashboardData?.organization || {};

  const filteredEmployees = employees.filter(e => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="emp-container" style={{ marginTop: '1.5rem', marginBottom: '3rem' }}>
      {/* Top Organization Header */}
      <div className="emp-card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', background: 'var(--navy-900)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--navy-900)' }}>{org.name}</h1>
                <span className="emp-badge emp-badge-active">Enterprise Tier</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Company Emergency Response Hotline: <strong>{org.emergency_phone || 'Not Configured'}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowInviteModal(true)} className="emp-btn emp-btn-teal emp-btn-sm">
              <UserPlus size={15} />
              <span>Invite Employee</span>
            </button>
            <button onClick={() => setShowCsvModal(true)} className="emp-btn emp-btn-secondary emp-btn-sm">
              <FileSpreadsheet size={15} />
              <span>CSV Bulk Import</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button className={`emp-nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Building2 size={16} /> Overview KPIs
          </button>
          <button className={`emp-nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
            <Users size={16} /> Employee Directory ({employees.length})
          </button>
          <button className={`emp-nav-link ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
            <AlertTriangle size={16} />
            <span>Emergency Incidents</span>
            {metrics.unacknowledged_incidents > 0 && (
              <span className="emp-badge emp-badge-revoked" style={{ marginLeft: '4px', fontSize: '0.6875rem' }}>
                {metrics.unacknowledged_incidents}
              </span>
            )}
          </button>
          <button className={`emp-nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <PhoneCall size={16} /> Emergency Hotline Config
          </button>
        </div>
      </div>

      {/* 1. OVERVIEW KPIS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="emp-grid-4">
            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Employees</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--navy-900)', marginTop: '4px' }}>{metrics.total_enrolled}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--emerald-600)', fontWeight: 600, marginTop: '4px' }}>Active Accounts: {metrics.active_accounts}</div>
            </div>

            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active QR Codes</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--emerald-600)', marginTop: '4px' }}>{metrics.active_qrs}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Suspended: {metrics.suspended_qrs}</div>
            </div>

            <div className="emp-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profiles Completed (≥80%)</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--teal-600)', marginTop: '4px' }}>{metrics.profiles_complete}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--amber-600)', marginTop: '4px' }}>Incomplete: {metrics.profiles_incomplete}</div>
            </div>

            <div className="emp-card" style={{ borderLeft: metrics.unacknowledged_incidents > 0 ? '4px solid var(--red-600)' : 'none' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency Incidents</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: metrics.unacknowledged_incidents > 0 ? 'var(--red-600)' : 'var(--navy-900)', marginTop: '4px' }}>
                {metrics.total_incidents}
              </div>
              <div style={{ fontSize: '0.75rem', color: metrics.unacknowledged_incidents > 0 ? 'var(--red-600)' : 'var(--emerald-600)', fontWeight: 700, marginTop: '4px' }}>
                {metrics.unacknowledged_incidents > 0 ? `${metrics.unacknowledged_incidents} Unacknowledged!` : 'All Incidents Resolved'}
              </div>
            </div>
          </div>

          {/* Privacy Notice Banner for HR Admin */}
          <div style={{ background: 'var(--navy-50)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={22} style={{ color: 'var(--teal-600)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8125rem', color: 'var(--navy-800)', lineHeight: 1.5 }}>
              <strong>Duty of Care & Medical Privacy Isolation:</strong> Company administrators have authorized visibility into employee enrollment, QR generation status, and emergency alert incidents. Private medical histories remain confidential to the employee and designated emergency responders.
            </div>
          </div>
        </div>
      )}

      {/* 2. EMPLOYEE DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="emp-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="emp-input"
                style={{ fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="emp-select"
                style={{ width: '180px', fontSize: '0.875rem' }}
              >
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Operations">Operations</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Employee</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Emp ID / Dept</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Profile Health</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>QR Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Account</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <div>{emp.department}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employee_id_number}</div>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700 }}>{emp.profile_completion_pct}%</span>
                        <div style={{ width: '60px', height: '5px', background: 'var(--bg-subtle)', borderRadius: '99px' }}>
                          <div style={{ width: `${emp.profile_completion_pct}%`, height: '100%', background: emp.profile_completion_pct >= 80 ? 'var(--emerald-500)' : 'var(--amber-500)', borderRadius: '99px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <StatusBadge status={emp.qr_status} size="sm" />
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <span className="emp-badge emp-badge-active" style={{ fontSize: '0.6875rem' }}>{emp.account_status}</span>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right' }}>
                      {emp.public_token && onOpenPublicScan && (
                        <button
                          onClick={() => onOpenPublicScan(emp.public_token)}
                          className="emp-btn emp-btn-outline emp-btn-sm"
                        >
                          <QrCode size={13} />
                          <span>QR View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY INCIDENTS DASHBOARD */}
      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incidents.length > 0 ? (
            incidents.map(inc => (
              <div key={inc.id} className="emp-card" style={{ borderLeft: inc.status === 'triggered' ? '4px solid var(--red-600)' : '4px solid var(--emerald-600)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                        {inc.incident_code}
                      </span>
                      <StatusBadge status={inc.status} />
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                      Urgent Emergency Alert for: {inc.affected_name}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <span>Triggered: {new Date(inc.triggered_at).toLocaleString()}</span>
                      {inc.location_address && (
                        <span>Location: <strong>{inc.location_address}</strong></span>
                      )}
                      {inc.acknowledged_by && (
                        <span style={{ color: 'var(--teal-700)', fontWeight: 600 }}>
                          Ack by: {inc.acknowledged_by} ({new Date(inc.acknowledged_at).toLocaleTimeString()})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {inc.status === 'triggered' && (
                      <button onClick={() => handleAcknowledge(inc.id)} className="emp-btn emp-btn-teal emp-btn-sm">
                        <CheckCircle size={15} />
                        <span>Acknowledge Incident</span>
                      </button>
                    )}
                    {inc.status !== 'resolved' && (
                      <button onClick={() => setShowResolveModal(inc.id)} className="emp-btn emp-btn-secondary emp-btn-sm">
                        <span>Mark Resolved</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery Logs for this Incident */}
                {inc.deliveries && inc.deliveries.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Notification Channels Dispatched ({inc.deliveries.length} attempts):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {inc.deliveries.map((del: any) => (
                        <span key={del.id} style={{ background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <strong>{del.channel.toUpperCase()}:</strong> {del.recipient_name} ({del.status})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <ShieldCheck size={48} style={{ color: 'var(--emerald-600)', margin: '0 auto 1rem' }} />
              <h3>No Incidents Reported</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                All employees are safe. Any emergency alerts triggered via physical QR scans will show up here in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. EMERGENCY HOTLINE SETTINGS */}
      {activeTab === 'settings' && settings && (
        <div className="emp-card">
          <div className="emp-card-header">
            <div className="emp-card-title">Official Company Emergency Contact Hotline</div>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="emp-grid-2">
              <div className="emp-form-group">
                <label className="emp-label">Emergency Phone Number (with Country Code) *</label>
                <input
                  type="tel"
                  required
                  value={settings.emergency_phone || ''}
                  onChange={e => setSettings({ ...settings, emergency_phone: e.target.value })}
                  className="emp-input"
                  placeholder="+91 98765 43210"
                />
                <div className="emp-help-text">This number is directly dialed when responders tap "Call Company Emergency Desk".</div>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Contact Desk / Response Team Name *</label>
                <input
                  type="text"
                  required
                  value={settings.emergency_contact_name || ''}
                  onChange={e => setSettings({ ...settings, emergency_contact_name: e.target.value })}
                  className="emp-input"
                  placeholder="e.g. Apex 24/7 Medical Response Desk"
                />
              </div>
            </div>

            <div className="emp-form-group">
              <label className="emp-label">Special Emergency Instructions for First Responders</label>
              <textarea
                value={settings.emergency_instructions || ''}
                onChange={e => setSettings({ ...settings, emergency_instructions: e.target.value })}
                className="emp-textarea"
                placeholder="e.g. For onsite incidents, notify security at Gate 2. Company tie-up hospital is Max Super Speciality..."
              />
            </div>

            <div className="emp-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="showPhoneQr"
                checked={settings.show_company_phone_on_qr}
                onChange={e => setSettings({ ...settings, show_company_phone_on_qr: e.target.checked })}
              />
              <label htmlFor="showPhoneQr" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                Display company emergency contact button on enrolled employees' public QR scan pages
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="emp-btn emp-btn-teal">
                <Save size={16} />
                <span>Save Emergency Settings</span>
              </button>
              {settingsSaved && (
                <span style={{ color: 'var(--emerald-600)', fontWeight: 700, fontSize: '0.875rem' }}>
                  Settings Updated ✓
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Single Employee Invite Modal */}
      {showInviteModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem' }}>Invite Employee</h3>
            <form onSubmit={handleInviteEmployee}>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  className="emp-input"
                  placeholder="e.g. Priya Patel"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Company Email *</label>
                <input
                  type="email"
                  required
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  className="emp-input"
                  placeholder="e.g. priya.patel@apexglobal.com"
                />
              </div>

              <div className="emp-grid-2">
                <div className="emp-form-group">
                  <label className="emp-label">Department</label>
                  <input
                    type="text"
                    value={invDept}
                    onChange={e => setInvDept(e.target.value)}
                    className="emp-input"
                    placeholder="Engineering"
                  />
                </div>

                <div className="emp-form-group">
                  <label className="emp-label">Employee ID</label>
                  <input
                    type="text"
                    value={invEmpId}
                    onChange={e => setInvEmpId(e.target.value)}
                    className="emp-input"
                    placeholder="APX-ENG-108"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="emp-btn emp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="emp-btn emp-btn-teal">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showCsvModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>CSV Bulk Employee Onboarding</h3>
              <button onClick={downloadSampleCsv} className="emp-btn emp-btn-ghost emp-btn-sm" style={{ color: 'var(--teal-600)' }}>
                <Download size={14} /> Download Sample CSV
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Paste comma-separated rows with columns: <code>name, email, department, employee_id</code>
            </p>

            <form onSubmit={handleCsvImport}>
              <textarea
                rows={8}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                className="emp-textarea"
                placeholder="name,email,department,employee_id&#10;Priya Patel,priya.patel@acmecorp.com,Engineering,APX-ENG-108&#10;Vikram Malhotra,vikram.m@acmecorp.com,Operations,APX-OPS-204"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
              />

              {csvResult && (
                <div style={{ background: 'var(--emerald-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--emerald-800)' }}>
                  ✓ Successfully imported {csvResult.imported} employee accounts. (Skipped: {csvResult.skipped})
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setShowCsvModal(false); setCsvResult(null); }} className="emp-btn emp-btn-secondary">
                  Close
                </button>
                <button type="submit" className="emp-btn emp-btn-teal">
                  Import Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {showResolveModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.75rem' }}>Resolve Emergency Incident</h3>
            <textarea
              rows={4}
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              className="emp-textarea"
              placeholder="Enter resolution details (e.g. Employee attended by on-duty medical staff; transferred safely)..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowResolveModal(null)} className="emp-btn emp-btn-secondary">Cancel</button>
              <button onClick={() => handleResolve(showResolveModal)} className="emp-btn emp-btn-teal">Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
