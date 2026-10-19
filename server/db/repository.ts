import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase.js';

const DATA_FILE = path.join(process.cwd(), 'emp_local_data.json');

// Memory store for high-speed lookups, seamless testing, and offline sync
interface StoreData {
  organizations: any[];
  users: any[];
  organization_memberships: any[];
  medical_profiles: any[];
  emergency_contacts: any[];
  family_relationships: any[];
  qr_tokens: any[];
  emergency_incidents: any[];
  notification_deliveries: any[];
  consent_records: any[];
  audit_logs: any[];
  subscriptions: any[];
}

let store: StoreData = {
  organizations: [],
  users: [],
  organization_memberships: [],
  medical_profiles: [],
  emergency_contacts: [],
  family_relationships: [],
  qr_tokens: [],
  emergency_incidents: [],
  notification_deliveries: [],
  consent_records: [],
  audit_logs: [],
  subscriptions: []
};

// Load saved data if file exists
function loadLocalStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Repository] Could not load local cache, starting clean.');
  }
}

function saveLocalStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Repository] Error saving local store:', e);
  }
}

export function resetStoreForTesting() {
  store = {
    organizations: [],
    users: [],
    organization_memberships: [],
    medical_profiles: [],
    emergency_contacts: [],
    family_relationships: [],
    qr_tokens: [],
    emergency_incidents: [],
    notification_deliveries: [],
    consent_records: [],
    audit_logs: [],
    subscriptions: []
  };
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  } catch (e) {}
}

// Initialize seed data
export async function initSeedData() {
  loadLocalStore();

  if (store.users.length === 0) {
    console.log('[Repository] Seeding production-grade baseline data for EMP Commercial...');

    const salt = bcrypt.genSaltSync(10);
    const superAdminPasswordHash = bcrypt.hashSync('Admin@123', salt);
    const userPasswordHash = bcrypt.hashSync('Emp@123', salt);

    // 1. Super Admin
    const superAdminId = '00000000-0000-0000-0000-000000000001';
    const superAdmin = {
      id: superAdminId,
      email: 'superadmin@emp.com',
      password_hash: superAdminPasswordHash,
      full_name: 'Platform Super Administrator',
      phone: '+91 99999 00000',
      role: 'super_admin',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.users.push(superAdmin);

    // 2. Organization: Apex Global Technologies
    const orgId = '00000000-0000-0000-0000-000000000010';
    const org = {
      id: orgId,
      name: 'Apex Global Technologies',
      slug: 'apex-global',
      logo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
      status: 'active',
      emergency_phone: '+91 98765 43210',
      emergency_contact_name: 'Apex Emergency Medical Desk',
      emergency_instructions: 'For workplace injuries or acute medical emergencies, call our 24/7 medical desk immediately.',
      show_company_phone_on_qr: true,
      settings: {
        escalation_minutes: 15,
        notify_hr_on_alert: true,
        allow_dependent_enrollment: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.organizations.push(org);

    // Subscription
    store.subscriptions.push({
      id: 'sub-001',
      organization_id: orgId,
      plan_tier: 'enterprise',
      max_seats: 500,
      status: 'active',
      renews_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    });

    // 3. Company HR Administrator
    const hrAdminId = '00000000-0000-0000-0000-000000000020';
    const hrAdmin = {
      id: hrAdminId,
      email: 'hr@apexglobal.com',
      password_hash: userPasswordHash,
      full_name: 'Anjali Verma (HR Lead)',
      phone: '+91 98765 43211',
      role: 'company_admin',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.users.push(hrAdmin);
    store.organization_memberships.push({
      id: 'mem-001',
      organization_id: orgId,
      user_id: hrAdminId,
      role: 'company_admin',
      department: 'Human Resources',
      employee_id_number: 'APX-HR-01',
      status: 'active',
      joined_at: new Date().toISOString()
    });

    // 4. Employee: Rahul Sharma
    const employeeId = '00000000-0000-0000-0000-000000000030';
    const employee = {
      id: employeeId,
      email: 'rahul.sharma@apexglobal.com',
      password_hash: userPasswordHash,
      full_name: 'Rahul Sharma',
      phone: '+91 98111 22233',
      role: 'employee',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.users.push(employee);
    store.organization_memberships.push({
      id: 'mem-002',
      organization_id: orgId,
      user_id: employeeId,
      role: 'employee',
      department: 'Engineering',
      employee_id_number: 'APX-ENG-104',
      status: 'active',
      joined_at: new Date().toISOString()
    });

    // Rahul's Medical Profile
    const employeeProfileId = '00000000-0000-0000-0000-000000000040';
    const employeeProfile = {
      id: employeeProfileId,
      user_id: employeeId,
      organization_id: orgId,
      is_dependent: false,
      manager_user_id: null,
      full_name: 'Rahul Sharma',
      preferred_name: 'Rahul',
      date_of_birth: '1989-08-14',
      gender: 'Male',
      blood_group: 'O+',
      allergies: [
        { id: 'all-1', allergen: 'Penicillin', reaction: 'Severe Anaphylaxis / Swelling', severity: 'life_threatening' },
        { id: 'all-2', allergen: 'Peanuts', reaction: 'Hives and breathing difficulty', severity: 'severe' }
      ],
      medications: [
        { id: 'med-1', name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed for asthma symptoms', is_critical: true },
        { id: 'med-2', name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily at bedtime', is_critical: false }
      ],
      conditions: [
        { id: 'con-1', condition: 'Bronchial Asthma', diagnosed_year: '2015', notes: 'Carries rescue inhaler in work bag' },
        { id: 'con-2', condition: 'Hypertension', diagnosed_year: '2021', notes: 'Under regular medication' }
      ],
      surgeries: [
        { id: 'sur-1', procedure: 'Appendectomy', year: '2012' }
      ],
      devices: [
        { id: 'dev-1', device_name: 'Cardiac Stent', details: 'Placed in LAD artery in 2022' }
      ],
      emergency_notes: 'Patient carries emergency asthma inhaler. In case of acute breathing distress, administer inhaler and call wife or ambulance immediately.',
      public_disclosures: {
        blood_group: true,
        allergies: true,
        medications: true,
        conditions: true,
        devices: true,
        emergency_notes: true
      },
      profile_completion_pct: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.medical_profiles.push(employeeProfile);

    // Emergency Contacts for Rahul
    store.emergency_contacts.push(
      {
        id: 'contact-01',
        profile_id: employeeProfileId,
        name: 'Pooja Sharma',
        relationship: 'Spouse / Wife',
        phone: '+91 98111 55566',
        email: 'pooja.sharma@example.com',
        priority_order: 1,
        is_alert_recipient: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'contact-02',
        profile_id: employeeProfileId,
        name: 'Dr. Ramesh Sharma',
        relationship: 'Father / Physician',
        phone: '+91 98111 77788',
        email: 'dr.sharma@example.com',
        priority_order: 2,
        is_alert_recipient: true,
        is_verified: true,
        created_at: new Date().toISOString()
      }
    );

    // Generate Active QR Token for Rahul Sharma
    const employeeQrToken = 'EMP-RAHUL-789X';
    const employeeTokenHash = crypto.createHash('sha256').update(employeeQrToken).digest('hex');
    store.qr_tokens.push({
      id: 'qr-001',
      profile_id: employeeProfileId,
      public_token: employeeQrToken,
      token_hash: employeeTokenHash,
      status: 'active',
      scan_count: 3,
      created_at: new Date().toISOString(),
      suspended_at: null,
      revoked_at: null
    });

    // 5. Dependent Profile: Aarav Sharma (Son, 8 years old)
    const dependentProfileId = '00000000-0000-0000-0000-000000000050';
    const dependentProfile = {
      id: dependentProfileId,
      user_id: null,
      organization_id: orgId,
      is_dependent: true,
      manager_user_id: employeeId,
      full_name: 'Aarav Sharma',
      preferred_name: 'Aarav',
      date_of_birth: '2018-03-22',
      gender: 'Male',
      blood_group: 'O+',
      allergies: [
        { id: 'dep-all-1', allergen: 'Egg White', reaction: 'Skin rash and facial swelling', severity: 'moderate' }
      ],
      medications: [],
      conditions: [
        { id: 'dep-con-1', condition: 'Childhood Allergic Rhinitis', notes: 'Dust allergy' }
      ],
      surgeries: [],
      devices: [],
      emergency_notes: 'Aarav is 8 years old. In any school/transit emergency, contact father Rahul or mother Pooja immediately.',
      public_disclosures: {
        blood_group: true,
        allergies: true,
        medications: true,
        conditions: true,
        devices: true,
        emergency_notes: true
      },
      profile_completion_pct: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.medical_profiles.push(dependentProfile);

    // Aarav's Emergency Contacts
    store.emergency_contacts.push({
      id: 'contact-dep-01',
      profile_id: dependentProfileId,
      name: 'Rahul Sharma',
      relationship: 'Father',
      phone: '+91 98111 22233',
      email: 'rahul.sharma@apexglobal.com',
      priority_order: 1,
      is_alert_recipient: true,
      is_verified: true,
      created_at: new Date().toISOString()
    });

    // Aarav has his OWN independent QR Code
    const aaravQrToken = 'EMP-AARAV-456K';
    store.qr_tokens.push({
      id: 'qr-002',
      profile_id: dependentProfileId,
      public_token: aaravQrToken,
      token_hash: crypto.createHash('sha256').update(aaravQrToken).digest('hex'),
      status: 'active',
      scan_count: 0,
      created_at: new Date().toISOString(),
      suspended_at: null,
      revoked_at: null
    });

    // Family Relationship link
    store.family_relationships.push({
      id: 'fam-rel-01',
      sponsor_user_id: employeeId,
      family_profile_id: dependentProfileId,
      relationship_type: 'Son (Dependent Child)',
      invitation_status: 'active',
      invite_email: null,
      invite_phone: null,
      created_at: new Date().toISOString()
    });

    // 6. Independent Family Member: Ananya Sharma (Adult Sister - Invited)
    const adultFamilyProfileId = '00000000-0000-0000-0000-000000000060';
    const adultFamilyProfile = {
      id: adultFamilyProfileId,
      user_id: null,
      organization_id: null, // Personal, independent of employer!
      is_dependent: false,
      manager_user_id: null,
      full_name: 'Ananya Sharma',
      preferred_name: 'Ananya',
      date_of_birth: '1995-11-10',
      gender: 'Female',
      blood_group: 'B+',
      allergies: [],
      medications: [],
      conditions: [],
      surgeries: [],
      devices: [],
      emergency_notes: 'No chronic conditions known.',
      public_disclosures: {
        blood_group: true,
        allergies: true,
        medications: true,
        conditions: true,
        devices: true,
        emergency_notes: true
      },
      profile_completion_pct: 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.medical_profiles.push(adultFamilyProfile);

    const ananyaQrToken = 'EMP-ANANYA-123M';
    store.qr_tokens.push({
      id: 'qr-003',
      profile_id: adultFamilyProfileId,
      public_token: ananyaQrToken,
      token_hash: crypto.createHash('sha256').update(ananyaQrToken).digest('hex'),
      status: 'active',
      scan_count: 1,
      created_at: new Date().toISOString(),
      suspended_at: null,
      revoked_at: null
    });

    store.family_relationships.push({
      id: 'fam-rel-02',
      sponsor_user_id: employeeId,
      family_profile_id: adultFamilyProfileId,
      relationship_type: 'Sister',
      invitation_status: 'pending_invite',
      invite_email: 'ananya.sharma@example.com',
      invite_phone: '+91 98111 99900',
      created_at: new Date().toISOString()
    });

    saveLocalStore();
    console.log('[Repository] Baseline seed data created successfully.');
  }
}

// =========================================================================
// Repository CRUD Methods
// =========================================================================

export const repository = {
  // Users
  async findUserByEmail(email: string) {
    return store.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id: string) {
    return store.users.find(u => u.id === id) || null;
  },

  async createUser(userData: any) {
    const newUser = {
      id: userData.id || crypto.randomUUID(),
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      full_name: userData.full_name,
      phone: userData.phone || null,
      role: userData.role || 'employee',
      status: userData.status || 'active',
      email_verified: userData.email_verified ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveLocalStore();
    return newUser;
  },

  async updateUser(id: string, updates: any) {
    const user = store.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    saveLocalStore();
    return user;
  },

  // Organizations
  async getOrganizations() {
    return store.organizations;
  },

  async getOrganizationById(id: string) {
    return store.organizations.find(o => o.id === id) || null;
  },

  async updateOrganization(id: string, updates: any) {
    const org = store.organizations.find(o => o.id === id);
    if (!org) return null;
    Object.assign(org, updates, { updated_at: new Date().toISOString() });
    saveLocalStore();
    return org;
  },

  async createOrganization(orgData: any) {
    const newOrg = {
      id: orgData.id || crypto.randomUUID(),
      name: orgData.name,
      slug: orgData.slug || orgData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      logo_url: orgData.logo_url || null,
      status: 'active',
      emergency_phone: orgData.emergency_phone || null,
      emergency_contact_name: orgData.emergency_contact_name || null,
      emergency_instructions: orgData.emergency_instructions || null,
      show_company_phone_on_qr: orgData.show_company_phone_on_qr ?? true,
      settings: orgData.settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.organizations.push(newOrg);
    saveLocalStore();
    return newOrg;
  },

  // Memberships
  async getMembershipsByOrgId(orgId: string) {
    return store.organization_memberships.filter(m => m.organization_id === orgId);
  },

  async getMembershipByUserId(userId: string) {
    return store.organization_memberships.find(m => m.user_id === userId) || null;
  },

  async createMembership(membershipData: any) {
    const newMembership = {
      id: crypto.randomUUID(),
      organization_id: membershipData.organization_id,
      user_id: membershipData.user_id,
      role: membershipData.role || 'employee',
      employee_id_number: membershipData.employee_id_number || null,
      department: membershipData.department || null,
      status: 'active',
      joined_at: new Date().toISOString()
    };
    store.organization_memberships.push(newMembership);
    saveLocalStore();
    return newMembership;
  },

  // Medical Profiles
  async getMedicalProfileByUserId(userId: string) {
    return store.medical_profiles.find(p => p.user_id === userId) || null;
  },

  async getMedicalProfileById(profileId: string) {
    return store.medical_profiles.find(p => p.id === profileId) || null;
  },

  async createMedicalProfile(data: any) {
    const newProfile = {
      id: data.id || crypto.randomUUID(),
      user_id: data.user_id || null,
      organization_id: data.organization_id || null,
      is_dependent: data.is_dependent ?? false,
      manager_user_id: data.manager_user_id || null,
      full_name: data.full_name,
      preferred_name: data.preferred_name || null,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      blood_group: data.blood_group || 'Unknown',
      allergies: data.allergies || [],
      medications: data.medications || [],
      conditions: data.conditions || [],
      surgeries: data.surgeries || [],
      devices: data.devices || [],
      emergency_notes: data.emergency_notes || null,
      public_disclosures: data.public_disclosures || {
        blood_group: true,
        allergies: true,
        medications: true,
        conditions: true,
        devices: true,
        emergency_notes: true
      },
      profile_completion_pct: data.profile_completion_pct || 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.medical_profiles.push(newProfile);
    saveLocalStore();
    return newProfile;
  },

  async updateMedicalProfile(profileId: string, updates: any) {
    const profile = store.medical_profiles.find(p => p.id === profileId);
    if (!profile) return null;
    Object.assign(profile, updates, { updated_at: new Date().toISOString() });

    // recalculate profile completion
    let score = 20;
    if (profile.blood_group && profile.blood_group !== 'Unknown') score += 20;
    if (profile.allergies?.length > 0) score += 15;
    if (profile.medications?.length > 0 || profile.conditions?.length > 0) score += 15;
    const contacts = store.emergency_contacts.filter(c => c.profile_id === profileId);
    if (contacts.length >= 1) score += 15;
    if (contacts.length >= 2) score += 15;
    profile.profile_completion_pct = Math.min(100, score);

    saveLocalStore();
    return profile;
  },

  // Emergency Contacts
  async getContactsByProfileId(profileId: string) {
    return store.emergency_contacts
      .filter(c => c.profile_id === profileId)
      .sort((a, b) => a.priority_order - b.priority_order);
  },

  async createEmergencyContact(data: any) {
    const newContact = {
      id: crypto.randomUUID(),
      profile_id: data.profile_id,
      name: data.name,
      relationship: data.relationship,
      phone: data.phone,
      email: data.email || null,
      priority_order: data.priority_order || 1,
      is_alert_recipient: data.is_alert_recipient ?? true,
      is_verified: false,
      created_at: new Date().toISOString()
    };
    store.emergency_contacts.push(newContact);
    saveLocalStore();
    return newContact;
  },

  async updateEmergencyContact(contactId: string, updates: any) {
    const contact = store.emergency_contacts.find(c => c.id === contactId);
    if (!contact) return null;
    Object.assign(contact, updates);
    saveLocalStore();
    return contact;
  },

  async deleteEmergencyContact(contactId: string) {
    const index = store.emergency_contacts.findIndex(c => c.id === contactId);
    if (index === -1) return false;
    store.emergency_contacts.splice(index, 1);
    saveLocalStore();
    return true;
  },

  // QR Tokens
  async getQRTokenByProfileId(profileId: string) {
    return store.qr_tokens.find(q => q.profile_id === profileId && q.status !== 'revoked') || null;
  },

  async getAllQRTokensByProfileId(profileId: string) {
    return store.qr_tokens.filter(q => q.profile_id === profileId);
  },

  async getQRTokenByPublicToken(publicToken: string) {
    return store.qr_tokens.find(q => q.public_token === publicToken) || null;
  },

  async createQRToken(profileId: string) {
    // Revoke any existing active/suspended tokens for this profile
    store.qr_tokens
      .filter(q => q.profile_id === profileId && q.status !== 'revoked')
      .forEach(q => {
        q.status = 'revoked';
        q.revoked_at = new Date().toISOString();
      });

    // Unpredictable secure token
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    const publicToken = `EMP-${randomHex}`;
    const tokenHash = crypto.createHash('sha256').update(publicToken).digest('hex');

    const newToken = {
      id: crypto.randomUUID(),
      profile_id: profileId,
      public_token: publicToken,
      token_hash: tokenHash,
      status: 'active',
      scan_count: 0,
      created_at: new Date().toISOString(),
      suspended_at: null,
      revoked_at: null
    };

    store.qr_tokens.push(newToken);
    saveLocalStore();
    return newToken;
  },

  async suspendQRToken(tokenId: string) {
    const token = store.qr_tokens.find(q => q.id === tokenId);
    if (!token) return null;
    token.status = 'suspended';
    token.suspended_at = new Date().toISOString();
    saveLocalStore();
    return token;
  },

  async reactivateQRToken(tokenId: string) {
    const token = store.qr_tokens.find(q => q.id === tokenId);
    if (!token || token.status === 'revoked') return null;
    token.status = 'active';
    token.suspended_at = null;
    saveLocalStore();
    return token;
  },

  async revokeQRToken(tokenId: string) {
    const token = store.qr_tokens.find(q => q.id === tokenId);
    if (!token) return null;
    token.status = 'revoked';
    token.revoked_at = new Date().toISOString();
    saveLocalStore();
    return token;
  },

  async incrementQRScan(tokenId: string) {
    const token = store.qr_tokens.find(q => q.id === tokenId);
    if (token) {
      token.scan_count = (token.scan_count || 0) + 1;
      saveLocalStore();
    }
  },

  // Family Members & Dependents
  async getFamilyRelationships(sponsorUserId: string) {
    const rels = store.family_relationships.filter(r => r.sponsor_user_id === sponsorUserId);
    const result = [];
    for (const rel of rels) {
      const profile = store.medical_profiles.find(p => p.id === rel.family_profile_id);
      const qr = store.qr_tokens.find(q => q.profile_id === rel.family_profile_id && q.status !== 'revoked');
      if (profile) {
        result.push({
          relationship_id: rel.id,
          id: profile.id,
          full_name: profile.full_name,
          relationship_type: rel.relationship_type,
          is_dependent: profile.is_dependent,
          invitation_status: rel.invitation_status,
          invite_email: rel.invite_email,
          invite_phone: rel.invite_phone,
          qr_status: qr ? qr.status : 'not_generated',
          public_token: qr ? qr.public_token : null
        });
      }
    }
    return result;
  },

  async createFamilyRelationship(data: any) {
    const rel = {
      id: crypto.randomUUID(),
      sponsor_user_id: data.sponsor_user_id,
      family_profile_id: data.family_profile_id,
      relationship_type: data.relationship_type,
      invitation_status: data.invitation_status || 'active',
      invite_email: data.invite_email || null,
      invite_phone: data.invite_phone || null,
      created_at: new Date().toISOString()
    };
    store.family_relationships.push(rel);
    saveLocalStore();
    return rel;
  },

  async deleteFamilyRelationship(relId: string) {
    const index = store.family_relationships.findIndex(r => r.id === relId);
    if (index === -1) return false;
    store.family_relationships.splice(index, 1);
    saveLocalStore();
    return true;
  },

  // Emergency Incidents
  async createIncident(incidentData: any) {
    const incidentCode = `INC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const incident = {
      id: crypto.randomUUID(),
      profile_id: incidentData.profile_id,
      organization_id: incidentData.organization_id || null,
      qr_token_id: incidentData.qr_token_id || null,
      incident_code: incidentCode,
      status: 'triggered',
      location_lat: incidentData.location_lat || null,
      location_lng: incidentData.location_lng || null,
      location_address: incidentData.location_address || null,
      triggered_by_ip: incidentData.triggered_by_ip || null,
      triggered_at: new Date().toISOString(),
      acknowledged_by: null,
      acknowledged_at: null,
      resolution_notes: null
    };
    store.emergency_incidents.unshift(incident);
    saveLocalStore();
    return incident;
  },

  async getIncidentsByOrgId(orgId: string) {
    return store.emergency_incidents.filter(i => i.organization_id === orgId);
  },

  async getIncidentsByProfileId(profileId: string) {
    return store.emergency_incidents.filter(i => i.profile_id === profileId);
  },

  async getAllIncidents() {
    return store.emergency_incidents;
  },

  async getIncidentById(id: string) {
    return store.emergency_incidents.find(i => i.id === id) || null;
  },

  async acknowledgeIncident(id: string, acknowledgedBy: string) {
    const incident = store.emergency_incidents.find(i => i.id === id);
    if (!incident) return null;
    incident.status = 'acknowledged';
    incident.acknowledged_by = acknowledgedBy;
    incident.acknowledged_at = new Date().toISOString();
    saveLocalStore();
    return incident;
  },

  async resolveIncident(id: string, notes: string) {
    const incident = store.emergency_incidents.find(i => i.id === id);
    if (!incident) return null;
    incident.status = 'resolved';
    incident.resolution_notes = notes;
    saveLocalStore();
    return incident;
  },

  // Notification Deliveries
  async recordNotificationDelivery(delivery: any) {
    const record = {
      id: crypto.randomUUID(),
      incident_id: delivery.incident_id,
      recipient_type: delivery.recipient_type,
      recipient_name: delivery.recipient_name,
      recipient_phone: delivery.recipient_phone || null,
      recipient_email: delivery.recipient_email || null,
      channel: delivery.channel,
      status: delivery.status,
      provider_ref: delivery.provider_ref || `SIM-${Date.now()}`,
      failure_reason: delivery.failure_reason || null,
      retry_count: delivery.retry_count || 0,
      created_at: new Date().toISOString()
    };
    store.notification_deliveries.push(record);
    saveLocalStore();
    return record;
  },

  async getDeliveriesByIncidentId(incidentId: string) {
    return store.notification_deliveries.filter(d => d.incident_id === incidentId);
  },

  // Audit Logs
  async logAuditEvent(actorUserId: string | null, action: string, entityType: string, entityId: string | null, metadata: any = {}) {
    const log = {
      id: crypto.randomUUID(),
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      ip_address: metadata.ip || null,
      created_at: new Date().toISOString()
    };
    store.audit_logs.unshift(log);
    saveLocalStore();
    return log;
  },

  async getAuditLogs(limit = 100) {
    return store.audit_logs.slice(0, limit);
  },

  // Raw Store Access for tests
  _getRawStore() {
    return store;
  }
};
