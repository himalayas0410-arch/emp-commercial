import React, { useState } from 'react';
import { MedicalProfile, AllergyItem, MedicationItem, MedicalConditionItem, MedicalDeviceItem } from '../../types/index.js';
import { api } from '../../utils/api.js';
import { Save, Plus, Trash2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface MedicalProfileEditorProps {
  initialProfile: MedicalProfile;
  onSaved: (profile: MedicalProfile) => void;
}

export const MedicalProfileEditor: React.FC<MedicalProfileEditorProps> = ({ initialProfile, onSaved }) => {
  const [profile, setProfile] = useState<MedicalProfile>(initialProfile);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New item draft states
  const [allergenDraft, setAllergenDraft] = useState({ allergen: '', reaction: '', severity: 'moderate' as const });
  const [medDraft, setMedDraft] = useState({ name: '', dosage: '', frequency: '', is_critical: false });
  const [condDraft, setCondDraft] = useState({ condition: '', diagnosed_year: '', notes: '' });
  const [devDraft, setDevDraft] = useState({ device_name: '', details: '' });

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.put('/profiles/me', profile);
      onSaved(res.profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (!allergenDraft.allergen.trim()) return;
    const newItem: AllergyItem = {
      id: 'all_' + Date.now(),
      ...allergenDraft
    };
    setProfile(p => ({ ...p, allergies: [...p.allergies, newItem] }));
    setAllergenDraft({ allergen: '', reaction: '', severity: 'moderate' });
  };

  const removeAllergy = (id: string) => {
    setProfile(p => ({ ...p, allergies: p.allergies.filter(a => a.id !== id) }));
  };

  const addMedication = () => {
    if (!medDraft.name.trim()) return;
    const newItem: MedicationItem = {
      id: 'med_' + Date.now(),
      ...medDraft
    };
    setProfile(p => ({ ...p, medications: [...p.medications, newItem] }));
    setMedDraft({ name: '', dosage: '', frequency: '', is_critical: false });
  };

  const removeMedication = (id: string) => {
    setProfile(p => ({ ...p, medications: p.medications.filter(m => m.id !== id) }));
  };

  const addCondition = () => {
    if (!condDraft.condition.trim()) return;
    const newItem: MedicalConditionItem = {
      id: 'cond_' + Date.now(),
      ...condDraft
    };
    setProfile(p => ({ ...p, conditions: [...p.conditions, newItem] }));
    setCondDraft({ condition: '', diagnosed_year: '', notes: '' });
  };

  const removeCondition = (id: string) => {
    setProfile(p => ({ ...p, conditions: p.conditions.filter(c => c.id !== id) }));
  };

  const addDevice = () => {
    if (!devDraft.device_name.trim()) return;
    const newItem: MedicalDeviceItem = {
      id: 'dev_' + Date.now(),
      ...devDraft
    };
    setProfile(p => ({ ...p, devices: [...p.devices, newItem] }));
    setDevDraft({ device_name: '', details: '' });
  };

  const removeDevice = (id: string) => {
    setProfile(p => ({ ...p, devices: p.devices.filter(d => d.id !== id) }));
  };

  const toggleDisclosure = (field: keyof typeof profile.public_disclosures) => {
    setProfile(p => ({
      ...p,
      public_disclosures: {
        ...p.public_disclosures,
        [field]: !p.public_disclosures[field]
      }
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner with Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xs)' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Medical Profile & Consent Settings</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Configure emergency health details and granular public QR disclosures.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--emerald-600)', fontWeight: 700 }}>
              Changes Saved ✓
            </span>
          )}
          <button onClick={handleSave} disabled={saving} className="emp-btn emp-btn-teal">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* 1. Basic Personal Information */}
      <div className="emp-card">
        <div className="emp-card-header">
          <div className="emp-card-title">1. Essential Personal Information</div>
        </div>
        <div className="emp-grid-2">
          <div className="emp-form-group">
            <label className="emp-label">Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              className="emp-input"
            />
          </div>

          <div className="emp-form-group">
            <label className="emp-label">Preferred / Display Name</label>
            <input
              type="text"
              value={profile.preferred_name || ''}
              onChange={e => setProfile({ ...profile, preferred_name: e.target.value })}
              className="emp-input"
              placeholder="e.g. Rahul"
            />
          </div>

          <div className="emp-form-group">
            <label className="emp-label">Blood Group</label>
            <select
              value={profile.blood_group}
              onChange={e => setProfile({ ...profile, blood_group: e.target.value })}
              className="emp-select"
            >
              <option value="Unknown">Unknown / Unverified</option>
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

          <div className="emp-form-group">
            <label className="emp-label">Date of Birth</label>
            <input
              type="date"
              value={profile.date_of_birth || ''}
              onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })}
              className="emp-input"
            />
          </div>
        </div>
      </div>

      {/* 2. Severe Allergies */}
      <div className="emp-card">
        <div className="emp-card-header">
          <div className="emp-card-title">2. Known Allergies & Anaphylaxis Risk</div>
        </div>

        {profile.allergies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {profile.allergies.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.allergen}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>Reaction: {a.reaction}</span>
                  <span className={`emp-badge ${a.severity === 'life_threatening' || a.severity === 'severe' ? 'emp-badge-revoked' : 'emp-badge-suspended'}`} style={{ marginLeft: '10px' }}>
                    {a.severity.replace('_', ' ')}
                  </span>
                </div>
                <button onClick={() => removeAllergy(a.id)} className="emp-btn emp-btn-ghost emp-btn-sm" title="Remove">
                  <Trash2 size={15} style={{ color: 'var(--red-600)' }} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>No allergies listed.</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px auto', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Allergen (e.g. Penicillin, Peanuts)"
            value={allergenDraft.allergen}
            onChange={e => setAllergenDraft({ ...allergenDraft, allergen: e.target.value })}
            className="emp-input"
          />
          <input
            type="text"
            placeholder="Reaction (e.g. Swelling, Hives)"
            value={allergenDraft.reaction}
            onChange={e => setAllergenDraft({ ...allergenDraft, reaction: e.target.value })}
            className="emp-input"
          />
          <select
            value={allergenDraft.severity}
            onChange={e => setAllergenDraft({ ...allergenDraft, severity: e.target.value as any })}
            className="emp-select"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="life_threatening">Life-Threatening</option>
          </select>
          <button type="button" onClick={addAllergy} className="emp-btn emp-btn-secondary">
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* 3. Current Medications */}
      <div className="emp-card">
        <div className="emp-card-header">
          <div className="emp-card-title">3. Current Medications</div>
        </div>

        {profile.medications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {profile.medications.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{m.name}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({m.dosage}) - {m.frequency}</span>
                  {m.is_critical && (
                    <span className="emp-badge emp-badge-revoked" style={{ marginLeft: '10px' }}>Critical</span>
                  )}
                </div>
                <button onClick={() => removeMedication(m.id)} className="emp-btn emp-btn-ghost emp-btn-sm">
                  <Trash2 size={15} style={{ color: 'var(--red-600)' }} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>No medications listed.</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr auto auto', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Medication name"
            value={medDraft.name}
            onChange={e => setMedDraft({ ...medDraft, name: e.target.value })}
            className="emp-input"
          />
          <input
            type="text"
            placeholder="Dosage (e.g. 100mcg)"
            value={medDraft.dosage}
            onChange={e => setMedDraft({ ...medDraft, dosage: e.target.value })}
            className="emp-input"
          />
          <input
            type="text"
            placeholder="Frequency"
            value={medDraft.frequency}
            onChange={e => setMedDraft({ ...medDraft, frequency: e.target.value })}
            className="emp-input"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={medDraft.is_critical}
              onChange={e => setMedDraft({ ...medDraft, is_critical: e.target.checked })}
            />
            Critical?
          </label>
          <button type="button" onClick={addMedication} className="emp-btn emp-btn-secondary">
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* 4. Chronic Conditions & Devices */}
      <div className="emp-card">
        <div className="emp-card-header">
          <div className="emp-card-title">4. Medical Conditions & Implanted Devices</div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Conditions</div>
          {profile.conditions.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.375rem' }}>
              <span><strong>{c.condition}</strong> {c.notes ? `- ${c.notes}` : ''}</span>
              <button onClick={() => removeCondition(c.id)} className="emp-btn emp-btn-ghost emp-btn-sm">
                <Trash2 size={14} style={{ color: 'var(--red-600)' }} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              placeholder="Condition (e.g. Bronchial Asthma, Diabetes)"
              value={condDraft.condition}
              onChange={e => setCondDraft({ ...condDraft, condition: e.target.value })}
              className="emp-input"
            />
            <input
              type="text"
              placeholder="Notes for first responders"
              value={condDraft.notes}
              onChange={e => setCondDraft({ ...condDraft, notes: e.target.value })}
              className="emp-input"
            />
            <button type="button" onClick={addCondition} className="emp-btn emp-btn-secondary">
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Implanted Medical Devices</div>
          {profile.devices.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.375rem' }}>
              <span><strong>{d.device_name}</strong> {d.details ? `(${d.details})` : ''}</span>
              <button onClick={() => removeDevice(d.id)} className="emp-btn emp-btn-ghost emp-btn-sm">
                <Trash2 size={14} style={{ color: 'var(--red-600)' }} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              placeholder="Device name (e.g. Pacemaker, Cardiac Stent, Insulin Pump)"
              value={devDraft.device_name}
              onChange={e => setDevDraft({ ...devDraft, device_name: e.target.value })}
              className="emp-input"
            />
            <input
              type="text"
              placeholder="Details / Model"
              value={devDraft.details}
              onChange={e => setDevDraft({ ...devDraft, details: e.target.value })}
              className="emp-input"
            />
            <button type="button" onClick={addDevice} className="emp-btn emp-btn-secondary">
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Paramedic Emergency Notes */}
      <div className="emp-card">
        <div className="emp-card-header">
          <div className="emp-card-title">5. Emergency Paramedic & First Responder Notes</div>
        </div>
        <textarea
          value={profile.emergency_notes || ''}
          onChange={e => setProfile({ ...profile, emergency_notes: e.target.value })}
          className="emp-textarea"
          placeholder="Specific actions first responders should take in an acute emergency (e.g. rescue inhaler located in left pocket of work backpack)..."
        />
      </div>

      {/* 6. Granular Public QR Disclosure Controls */}
      <div className="emp-card" style={{ borderLeft: '4px solid var(--teal-600)' }}>
        <div className="emp-card-header">
          <div>
            <div className="emp-card-title">
              <ShieldCheck size={20} style={{ color: 'var(--teal-600)' }} />
              <span>Granular Public QR Disclosure Controls (DPDP 2023)</span>
            </div>
            <div className="emp-card-subtitle">
              You choose exactly what information is made visible when somebody scans your physical emergency QR code.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'blood_group', label: 'Blood Group', desc: 'Display blood group prominently for emergency blood transfusions' },
            { key: 'allergies', label: 'Allergies & Reactions', desc: 'Display life-threatening allergies to prevent fatal drug administration' },
            { key: 'medications', label: 'Current Medications', desc: 'Display critical medications currently being taken' },
            { key: 'conditions', label: 'Chronic Conditions', desc: 'Display pre-existing conditions like Asthma, Diabetes, or Epilepsy' },
            { key: 'devices', label: 'Implanted Devices', desc: 'Display devices like Pacemakers or Stents to warn EMTs' },
            { key: 'emergency_notes', label: 'Emergency First-Responder Instructions', desc: 'Display free-text instructions left for emergency personnel' }
          ].map(item => {
            const isDisclosed = profile.public_disclosures[item.key as keyof typeof profile.public_disclosures];
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isDisclosed ? <Eye size={16} style={{ color: 'var(--teal-600)' }} /> : <EyeOff size={16} style={{ color: 'var(--text-muted)' }} />}
                    <span>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>

                <label className="emp-switch">
                  <input
                    type="checkbox"
                    checked={isDisclosed}
                    onChange={() => toggleDisclosure(item.key as any)}
                  />
                  <span className="emp-slider"></span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
