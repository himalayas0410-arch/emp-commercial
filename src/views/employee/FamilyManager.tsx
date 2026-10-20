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
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<FamilyMemberItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    setPermManageQR(member.permissions?.can_manage_qr ?? false);
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
            Each family member maintains their own personal account and unique QR code. Links enable mutual emergency alert dispatching across your family network.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowLinkModal(true)} className="emp-btn emp-btn-outline emp-btn-sm">
            <Link2 size={15} />
            <span>Link Existing Account</span>
          </button>
          <button onClick={() => setShowInviteModal(true)} className="emp-btn emp-btn-teal emp-btn-sm">
            <Send size={15} />
            <span>Invite Family Member</span>
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
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--navy-50)', color: 'var(--navy-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '1px solid var(--border-color)' }}>
                  {member.full_name.charAt(0)}
                </div>

                <div>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{member.full_name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      • {member.relationship_type}
                    </span>
                    <StatusBadge status={member.invitation_status === 'active' ? 'active' : 'pending'} size="sm" />
                    {member.invitation_status !== 'active' && (
                      <span style={{ fontSize: '0.75rem', color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {member.invitation_status === 'pending_approval' ? '⏳ Awaiting their authorization' : '✉️ Invitation sent (Pending sign-up)'}
                      </span>
                    )}
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
                    className="emp-btn emp-btn-outline emp-btn-sm"
                    title="Simulate Public Scanner Page for this Member"
                  >
                    <QrCode size={14} />
                    <span>View Emergency QR</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteRelationship(member.relationship_id)}
                  className="emp-btn emp-btn-outline emp-btn-sm"
                  style={{ color: 'var(--red-600)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
                  title="Unlink Relationship"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="emp-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--navy-50)', color: 'var(--navy-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Heart size={24} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--navy-900)' }}>No Family Members Linked Yet</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
              EMP allows independent family accounts to link together into a unified emergency broadcast network.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setShowLinkModal(true)} className="emp-btn emp-btn-outline emp-btn-sm">
                <Link2 size={15} />
                <span>Link Existing Account</span>
              </button>
              <button onClick={() => setShowInviteModal(true)} className="emp-btn emp-btn-teal emp-btn-sm">
                <Send size={15} />
                <span>Invite Family Member</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Link Existing Account */}
      {showLinkModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Link Existing EMP Account</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Enter the email address of a family member who already registered on EMP Commercial. They will receive a link authorization request.
            </p>

            <form onSubmit={handleLinkExisting}>
              <div className="emp-form-group">
                <label className="emp-label">Their Registered Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. spouse@example.com"
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
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Partner">Partner</option>
                  <option value="Emergency Contact">Emergency Contact</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowLinkModal(false)} className="emp-btn emp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="emp-btn emp-btn-primary">
                  <span>{submitting ? 'Submitting...' : 'Send Link Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invite Family Member */}
      {showInviteModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Invite Family Member</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Invite a relative to create their own independent EMP account.
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
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Partner">Partner</option>
                  <option value="Emergency Contact">Emergency Contact</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="emp-form-group">
                  <label className="emp-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. pooja@example.com"
                    value={invEmail}
                    onChange={e => setInvEmail(e.target.value)}
                    className="emp-input"
                  />
                </div>

                <div className="emp-form-group">
                  <label className="emp-label">Mobile Phone (SMS)</label>
                  <input
                    type="tel"
                    placeholder="+91 98111 22334"
                    value={invPhone}
                    onChange={e => setInvPhone(e.target.value)}
                    className="emp-input"
                  />
                </div>
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

      {/* Modal 3: Manage Permissions */}
      {showPermissionsModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <Shield size={20} style={{ color: 'var(--teal-600)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                Permissions: {showPermissionsModal.full_name}
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Configure what access and alerts are shared between your accounts:
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
                    Receive Emergency Alerts
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Automatically notify this family member via SMS, WhatsApp, and email whenever your emergency QR is scanned.
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
