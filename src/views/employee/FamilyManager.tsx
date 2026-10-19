import React, { useState, useEffect } from 'react';
import { FamilyMemberItem, PendingFamilyRequest } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { UserPlus, Send, QrCode, Trash2, Heart, Shield, ExternalLink, Link2, Check, X, Settings2, Bell } from 'lucide-react';

interface FamilyManagerProps {
  onOpenPublicScan?: (token: string) => void;
}

export const FamilyManager: React.FC<FamilyManagerProps> = ({ onOpenPublicScan }) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFamilyRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [showDependentModal, setShowDependentModal] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<FamilyMemberItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Dependent draft
  const [depName, setDepName] = useState('');
  const [depRelationship, setDepRelationship] = useState('Son (Dependent Child)');
  const [depDob, setDepDob] = useState('');
  const [depBlood, setDepBlood] = useState('Unknown');
  const [depNotes, setDepNotes] = useState('');

  // Invite draft
  const [invName, setInvName] = useState('');
  const [invRelationship, setInvRelationship] = useState('Spouse');
  const [invEmail, setInvEmail] = useState('');
  const [invPhone, setInvPhone] = useState('');

  // Link existing draft
  const [linkEmail, setLinkEmail] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('Spouse');

  // Permissions draft
  const [permAlerts, setPermAlerts] = useState<boolean>(true);
  const [permMedical, setPermMedical] = useState<boolean>(false);
  const [permManageQR, setPermManageQR] = useState<boolean>(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    setLoading(true);
    try {
      const [famRes, reqRes] = await Promise.all([
        api.get('/family'),
        api.get('/family/requests/pending')
      ]);
      setFamilyMembers(famRes.family_members || []);
      setPendingRequests(reqRes.pending_requests || []);
    } catch (err: any) {
      console.error('Failed to fetch family data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depName.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/family/dependent', {
        full_name: depName,
        relationship_type: depRelationship,
        date_of_birth: depDob || null,
        blood_group: depBlood,
        emergency_notes: depNotes || null
      });

      await fetchFamilyData();
      setShowDependentModal(false);
      setDepName('');
      setDepNotes('');
      setActionMessage('Dependent profile and personal QR badge created successfully.');
    } catch (err: any) {
      alert('Error creating dependent: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || (!invEmail.trim() && !invPhone.trim())) {
      alert('Full name and email or phone are required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/family/invite', {
        full_name: invName,
        relationship_type: invRelationship,
        email: invEmail || null,
        phone: invPhone || null
      });

      await fetchFamilyData();
      setShowInviteModal(false);
      setInvName('');
      setInvEmail('');
      setInvPhone('');
      setActionMessage('Family invitation dispatched successfully.');
    } catch (err: any) {
      alert('Error sending invite: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/family/link-request', {
        target_email: linkEmail.trim(),
        relationship_type: linkRelationship
      });

      await fetchFamilyData();
      setShowLinkModal(false);
      setLinkEmail('');
      setActionMessage(res.message || 'Link request submitted.');
    } catch (err: any) {
      alert('Error submitting link request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptRequest = async (relId: string) => {
    try {
      await api.post(`/family/requests/${relId}/accept`, {});
      await fetchFamilyData();
      setActionMessage('Family link accepted. You are now connected in each other’s emergency networks.');
    } catch (err: any) {
      alert('Failed to accept request: ' + err.message);
    }
  };

  const handleDeclineRequest = async (relId: string) => {
    try {
      await api.post(`/family/requests/${relId}/decline`, {});
      await fetchFamilyData();
    } catch (err: any) {
      alert('Failed to decline request: ' + err.message);
    }
  };

  const openPermissionsModal = (member: FamilyMemberItem) => {
    setShowPermissionsModal(member);
    setPermAlerts(member.permissions?.receive_alerts ?? true);
    setPermMedical(member.permissions?.can_view_medical ?? false);
    setPermManageQR(member.permissions?.can_manage_qr ?? member.is_dependent);
  };

  const handleSavePermissions = async () => {
    if (!showPermissionsModal) return;
    try {
      await api.put(`/family/${showPermissionsModal.relationship_id}/permissions`, {
        receive_alerts: permAlerts,
        can_view_medical: permMedical,
        can_manage_qr: permManageQR
      });
      await fetchFamilyData();
      setShowPermissionsModal(null);
      setActionMessage('Family emergency permissions updated.');
    } catch (err: any) {
      alert('Failed to update permissions: ' + err.message);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Unlink this family member? Their personal account, QR token, and medical records will NOT be deleted.')) return;
    try {
      await api.delete(`/family/${relId}`);
      setFamilyMembers(prev => prev.filter(m => m.relationship_id !== relId));
      setActionMessage('Family link unlinked successfully.');
    } catch (err: any) {
      alert('Failed to remove relationship: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {actionMessage && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--emerald-50)', color: 'var(--emerald-800)', border: '1px solid var(--emerald-300)', fontSize: '0.875rem', fontWeight: 600 }}>
          {actionMessage}
        </div>
      )}

      {/* Top Banner with Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={20} style={{ color: 'var(--red-600)' }} />
            <span>Family Linking Hub</span>
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Each family member has their own independent account and unique QR code. Links allow mutual emergency alert broadcasting without exposing private medical histories.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowLinkModal(true)} className="emp-btn emp-btn-outline emp-btn-sm">
            <Link2 size={15} />
            <span>Link Existing Account</span>
          </button>
          <button onClick={() => setShowDependentModal(true)} className="emp-btn emp-btn-teal emp-btn-sm">
            <UserPlus size={15} />
            <span>Add Dependent</span>
          </button>
          <button onClick={() => setShowInviteModal(true)} className="emp-btn emp-btn-secondary emp-btn-sm">
            <Send size={15} />
            <span>Invite Adult</span>
          </button>
        </div>
      </div>

      {/* Pending Link Requests Section */}
      {pendingRequests.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
            <Bell size={16} />
            <span>Pending Family Link Requests ({pendingRequests.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingRequests.map(req => (
              <div key={req.relationship_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '0.9375rem' }}>
                    {req.sponsor_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Wishes to link as: <strong>{req.relationship_type}</strong> ({req.sponsor_email})
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleAcceptRequest(req.relationship_id)}
                    className="emp-btn emp-btn-sm emp-btn-teal"
                  >
                    <Check size={14} />
                    <span>Accept Link</span>
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.relationship_id)}
                    className="emp-btn emp-btn-sm emp-btn-outline"
                  >
                    <X size={14} />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Roster */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {familyMembers.length > 0 ? (
          familyMembers.map(member => (
            <div key={member.relationship_id} className="emp-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: member.is_dependent ? 'var(--teal-50)' : 'var(--navy-50)', color: member.is_dependent ? 'var(--teal-700)' : 'var(--navy-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '1px solid var(--border-color)' }}>
                  {member.full_name.charAt(0)}
                </div>

                <div>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{member.full_name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      • {member.relationship_type}
                    </span>
                    <span className={`emp-badge ${member.is_dependent ? 'emp-badge-active' : 'emp-badge-pending'}`} style={{ fontSize: '0.6875rem' }}>
                      {member.is_dependent ? 'Dependent Profile' : 'Independent Account'}
                    </span>
                    <StatusBadge status={member.invitation_status === 'active' ? 'active' : 'pending'} size="sm" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>
                      Unique QR Token: <strong style={{ fontFamily: 'var(--font-mono)' }}>{member.public_token || 'Generated'}</strong>
                    </span>
                    <span style={{ color: 'var(--teal-700)', fontWeight: 600 }}>
                      Alerts: {member.permissions?.receive_alerts !== false ? '✓ Enabled' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => openPermissionsModal(member)}
                  className="emp-btn emp-btn-outline emp-btn-sm"
                  title="Configure Sharing Permissions"
                >
                  <Settings2 size={14} />
                  <span>Permissions</span>
                </button>

                {member.public_token && onOpenPublicScan && (
                  <button
                    onClick={() => onOpenPublicScan(member.public_token!)}
                    className="emp-btn emp-btn-secondary emp-btn-sm"
                  >
                    <ExternalLink size={14} />
                    <span>Preview QR</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteRelationship(member.relationship_id)}
                  className="emp-btn emp-btn-ghost emp-btn-sm"
                  title="Unlink family member"
                >
                  <Trash2 size={16} style={{ color: 'var(--red-600)' }} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <Heart size={44} style={{ color: 'var(--red-600)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>No Linked Family Members</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              EMP allows independent family accounts to link together into a unified emergency broadcast network.
            </p>
          </div>
        )}
      </div>

      {/* Modal 1: Link Existing Account */}
      {showLinkModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={18} style={{ color: 'var(--teal-600)' }} />
              <span>Link Existing EMP Account</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Connect with a relative who already uses EMP Commercial. They will receive a link request to approve on their dashboard.
            </p>

            <form onSubmit={handleLinkExisting}>
              <div className="emp-form-group">
                <label className="emp-label">Family Member's Registered Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. pooja.sharma@example.com"
                  value={linkEmail}
                  onChange={e => setLinkEmail(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Relationship *</label>
                <select
                  value={linkRelationship}
                  onChange={e => setLinkRelationship(e.target.value)}
                  className="emp-select"
                >
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Parent">Parent / Guardian</option>
                  <option value="Child (Adult)">Adult Child</option>
                  <option value="Sibling">Brother / Sister</option>
                  <option value="Relative">Other Family Member</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowLinkModal(false)} className="emp-btn emp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="emp-btn emp-btn-teal">
                  <span>{submitting ? 'Sending Request...' : 'Send Link Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Dependent Profile */}
      {showDependentModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Add Dependent Profile</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              For children or dependents under your legal guardianship. Automatically creates their own independent medical profile and separate emergency QR code.
            </p>

            <form onSubmit={handleCreateDependent}>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={depName}
                  onChange={e => setDepName(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="emp-form-group">
                  <label className="emp-label">Relationship *</label>
                  <select
                    value={depRelationship}
                    onChange={e => setDepRelationship(e.target.value)}
                    className="emp-select"
                  >
                    <option value="Son (Dependent Child)">Son (Dependent Child)</option>
                    <option value="Daughter (Dependent Child)">Daughter (Dependent Child)</option>
                    <option value="Elderly Parent">Elderly Parent (Dependent)</option>
                    <option value="Ward">Legal Ward</option>
                  </select>
                </div>

                <div className="emp-form-group">
                  <label className="emp-label">Blood Group</label>
                  <select
                    value={depBlood}
                    onChange={e => setDepBlood(e.target.value)}
                    className="emp-select"
                  >
                    {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Emergency Medical Notes</label>
                <textarea
                  rows={2}
                  value={depNotes}
                  onChange={e => setDepNotes(e.target.value)}
                  className="emp-textarea"
                  placeholder="e.g. Severe peanut allergy. Carries EpiPen Jr."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowDependentModal(false)} className="emp-btn emp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="emp-btn emp-btn-teal">
                  <span>{submitting ? 'Creating...' : 'Enroll & Generate QR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Invite Adult Member */}
      {showInviteModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Invite Adult Family Member</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Invite an adult relative to create their own independent EMP account.
            </p>

            <form onSubmit={handleSendInvite}>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Relationship *</label>
                <select
                  value={invRelationship}
                  onChange={e => setInvRelationship(e.target.value)}
                  className="emp-select"
                >
                  <option value="Spouse">Spouse / Wife</option>
                  <option value="Husband">Husband</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Adult Child">Adult Child</option>
                </select>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Email Address</label>
                <input
                  type="email"
                  placeholder="pooja.sharma@example.com"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98111 55566"
                  value={invPhone}
                  onChange={e => setInvPhone(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="emp-btn emp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="emp-btn emp-btn-teal">
                  <span>{submitting ? 'Sending...' : 'Dispatch Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Configure Permissions */}
      {showPermissionsModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: 'var(--teal-600)' }} />
              <span>Family Sharing Permissions</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Granular consent controls for <strong>{showPermissionsModal.full_name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permAlerts}
                  onChange={e => setPermAlerts(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                    Receive Urgent Emergency Alerts
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Notify this member immediately via SMS and Push when my emergency QR is scanned.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permMedical}
                  onChange={e => setPermMedical(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                    View Approved Medical Details
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allow viewing approved emergency health summary from their personal Family Hub.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permManageQR}
                  onChange={e => setPermManageQR(e.target.checked)}
                  disabled={!showPermissionsModal.is_dependent}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                    Manage Dependent QR Badge (Guardianship)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allow suspending, reactivating, and printing this member's QR code (applicable to minor dependents).
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowPermissionsModal(null)} className="emp-btn emp-btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSavePermissions} className="emp-btn emp-btn-teal">
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
