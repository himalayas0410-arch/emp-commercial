import React, { useState } from 'react';
import { EmergencyContact } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { Plus, Trash2, Phone, Mail, Bell, Shield, ArrowUp, ArrowDown } from 'lucide-react';

interface EmergencyContactsManagerProps {
  contacts: EmergencyContact[];
  onContactsUpdated: (contacts: EmergencyContact[]) => void;
}

export const EmergencyContactsManager: React.FC<EmergencyContactsManagerProps> = ({ contacts, onContactsUpdated }) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form draft
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse / Partner');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isAlertRecipient, setIsAlertRecipient] = useState(true);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name and phone number are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/profiles/contacts', {
        name,
        relationship,
        phone,
        email: email.trim() || null,
        priority_order: contacts.length + 1,
        is_alert_recipient: isAlertRecipient
      });

      onContactsUpdated([...contacts, res.contact]);
      setShowAddModal(false);
      setName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      alert('Failed to add contact: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await api.delete(`/profiles/contacts/${id}`);
      onContactsUpdated(contacts.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Failed to delete contact: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Emergency Contacts</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            These individuals are displayed on your public emergency page and will receive digital emergency alerts.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="emp-btn emp-btn-teal">
          <Plus size={16} />
          <span>Add Contact</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {contacts.length > 0 ? (
          contacts.map((contact, idx) => (
            <div key={contact.id} className="emp-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: idx === 0 ? 'var(--red-50)' : 'var(--navy-50)', color: idx === 0 ? 'var(--red-600)' : 'var(--navy-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9375rem', border: '1px solid var(--border-color)' }}>
                  #{idx + 1}
                </div>

                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{contact.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>({contact.relationship})</span>
                    {idx === 0 && (
                      <span className="emp-badge emp-badge-revoked" style={{ fontSize: '0.6875rem' }}>Primary</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '4px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} style={{ color: 'var(--teal-600)' }} /> {contact.phone}
                    </span>
                    {contact.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {contact.email}
                      </span>
                    )}
                    {contact.is_alert_recipient && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--emerald-600)', fontWeight: 600 }}>
                        <Bell size={13} /> Receives Digital Alerts
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <button onClick={() => handleDelete(contact.id)} className="emp-btn emp-btn-ghost emp-btn-sm" title="Delete Contact">
                  <Trash2 size={16} style={{ color: 'var(--red-600)' }} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="emp-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              No emergency contacts added yet. Please add at least 1 primary contact to ensure responders can reach your family.
            </p>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.25rem' }}>Add Emergency Contact</h3>
            <form onSubmit={handleAddContact}>
              <div className="emp-form-group">
                <label className="emp-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Relationship *</label>
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="emp-select"
                >
                  <option value="Spouse / Partner">Spouse / Partner</option>
                  <option value="Parent / Mother">Parent / Mother</option>
                  <option value="Parent / Father">Parent / Father</option>
                  <option value="Sibling / Brother">Sibling / Brother</option>
                  <option value="Sibling / Sister">Sibling / Sister</option>
                  <option value="Child / Son">Child / Son</option>
                  <option value="Child / Daughter">Child / Daughter</option>
                  <option value="Personal Physician">Personal Physician</option>
                  <option value="Close Friend">Close Friend</option>
                  <option value="Colleague">Colleague</option>
                </select>
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Phone Number (with Country Code) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 00001"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-label">Email Address (Optional for alert dispatch)</label>
                <input
                  type="email"
                  placeholder="e.g. pooja@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="emp-input"
                />
              </div>

              <div className="emp-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="alertRecipient"
                  checked={isAlertRecipient}
                  onChange={e => setIsAlertRecipient(e.target.checked)}
                />
                <label htmlFor="alertRecipient" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Send instant SMS & Push notifications to this contact during an emergency alert
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {submitting ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
