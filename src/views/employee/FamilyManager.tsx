import React, { useState, useEffect } from 'react';
import { FamilyMemberItem } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { UserPlus, Send, QrCode, Trash2, Heart, Shield, ExternalLink } from 'lucide-react';

interface FamilyManagerProps {
  onOpenPublicScan?: (token: string) => void;
}

export const FamilyManager: React.FC<FamilyManagerProps> = ({ onOpenPublicScan }) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [showDependentModal, setShowDependentModal] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const res = await api.get('/family');
      setFamilyMembers(res.family_members || []);
    } catch (err: any) {
      console.error('Failed to fetch family:', err);
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

      await fetchFamily();
      setShowDependentModal(false);
      setDepName('');
      setDepNotes('');
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

      await fetchFamily();
      setShowInviteModal(false);
      setInvName('');
      setInvEmail('');
      setInvPhone('');
    } catch (err: any) {
      alert('Error sending invite: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Remove this family association? Their personal account/data will not be destroyed.')) return;
    try {
      await api.delete(`/family/${relId}`);
      setFamilyMembers(prev => prev.filter(m => m.relationship_id !== relId));
    } catch (err: any) {
      alert('Failed to remove relationship: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner with Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={20} style={{ color: 'var(--red-600)' }} />
            <span>Family & Dependents Hub</span>
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Every family member receives an independent, unique QR code. A dependent does NOT inherit your QR code.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowDependentModal(true)} className="emp-btn emp-btn-teal">
            <UserPlus size={16} />
            <span>Add Dependent</span>
          </button>
          <button onClick={() => setShowInviteModal(true)} className="emp-btn emp-btn-outline">
            <Send size={16} />
            <span>Invite Adult Member</span>
          </button>
        </div>
      </div>

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
                  <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{member.full_name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      • {member.relationship_type}
                    </span>
                    <span className={`emp-badge ${member.is_dependent ? 'emp-badge-active' : 'emp-badge-pending'}`} style={{ fontSize: '0.6875rem' }}>
                      {member.is_dependent ? 'Dependent Profile' : 'Independent Account'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>
                      Unique QR: <strong style={{ fontFamily: 'var(--font-mono)' }}>{member.public_token || 'Generated'}</strong>
                    </span>
                    {member.invite_email && (
                      <span>Email: {member.invite_email}</span>
                    )}
                    <StatusBadge status={member.qr_status} size="sm" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {member.public_token && onOpenPublicScan && (
                  <button
                    onClick={() => onOpenPublicScan(member.public_token!)}
                    className="emp-btn emp-btn-outline emp-btn-sm"
                  >
                    <ExternalLink size={14} />
                    <span>View QR Profile</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteRelationship(member.relationship_id)}
                  className="emp-btn emp-btn-ghost emp-btn-sm"
                  title="Remove family association"
                >
                  <Trash2 size={16} style={{ color: 'var(--red-600)' }} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              No family members added yet. Add a child/elderly dependent or invite an adult family member.
            </p>
          </div>
        )}
      </div>

      {/* Add Dependent Profile Modal */}
      {showDependentModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Add Dependent Profile</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              For children or dependents under your guardianship. Creates an independent medical profile and separate QR code.
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

              <div className="emp-grid-2">
                <div className="emp-form-group">
                  <label className="emp-label">Relationship *</label>
                  <select
                    value={depRelationship}
                    onChange={e => setDepRelationship(e.target.value)}
                    className="emp-select"
                  >
                    <option value="Son (Dependent Child)">Son (Dependent Child)</option>
                    <option value="Daughter (Dependent Child)">Daughter (Dependent Child)</option>
                    <option value="Elderly Parent (Dependent)">Elderly Parent (Dependent)</option>
                    <option value="Dependent Spouse">Dependent Spouse</option>
                    <option value="Ward under Legal Guardianship">Ward under Legal Guardianship</option>
                  </select>
                </div>

                <div className="emp-form-group">
                  <label className="emp-label">Blood Group</label>
                  <select
                    value={depBlood}
                    onChange={e => setDepBlood(e.target.value)}
                    className="emp-select"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Date of Birth</label>
                <input
                  type="date"
                  value={depDob}
                  onChange={e => setDepDob(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Emergency Instructions / School Notes</label>
                <textarea
                  placeholder="Any critical notes (e.g. In school transit emergencies, call father immediately)..."
                  value={depNotes}
                  onChange={e => setDepNotes(e.target.value)}
                  className="emp-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDependentModal(false)}
                  className="emp-btn emp-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-btn emp-btn-teal"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Dependent Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Adult Member Modal */}
      {showInviteModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Invite Independent Family Member</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              The family member receives an invitation to establish their own account on their device, retaining full ownership of their medical records.
            </p>

            <form onSubmit={handleSendInvite}>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
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
                  <option value="Sister">Sister</option>
                  <option value="Brother">Brother</option>
                  <option value="Adult Child">Adult Child</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya@example.com"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98111 99900"
                  value={invPhone}
                  onChange={e => setInvPhone(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="emp-btn emp-btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-btn emp-btn-teal"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
