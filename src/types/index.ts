export type UserRole = 'super_admin' | 'company_admin' | 'employee' | 'family_member';

export type QRStatus = 'not_generated' | 'active' | 'suspended' | 'revoked' | 'expired';

export type IncidentStatus = 'triggered' | 'acknowledged' | 'resolved' | 'false_alarm';

export type NotificationChannel = 'sms' | 'email' | 'push' | 'in_app';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'deactivated';
  email_verified: boolean;
  created_at: string;
  organization_id?: string | null;
  organization_name?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  status: 'active' | 'suspended';
  emergency_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_instructions?: string | null;
  show_company_phone_on_qr: boolean;
  settings?: Record<string, any>;
  created_at: string;
}

export interface AllergyItem {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  is_critical: boolean;
}

export interface MedicalConditionItem {
  id: string;
  condition: string;
  diagnosed_year?: string;
  notes?: string;
}

export interface MedicalDeviceItem {
  id: string;
  device_name: string;
  details?: string;
}

export interface SurgeryItem {
  id: string;
  procedure: string;
  year?: string;
}

export interface PublicDisclosures {
  blood_group: boolean;
  allergies: boolean;
  medications: boolean;
  conditions: boolean;
  devices: boolean;
  emergency_notes: boolean;
}

export interface MedicalProfile {
  id: string;
  user_id?: string | null;
  organization_id?: string | null;
  is_dependent: boolean;
  manager_user_id?: string | null;
  relationship_to_manager?: string | null;
  full_name: string;
  preferred_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group: string;
  allergies: AllergyItem[];
  medications: MedicationItem[];
  conditions: MedicalConditionItem[];
  surgeries: SurgeryItem[];
  devices: MedicalDeviceItem[];
  emergency_notes?: string | null;
  public_disclosures: PublicDisclosures;
  profile_completion_pct: number;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  profile_id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  priority_order: number;
  is_alert_recipient: boolean;
  is_verified: boolean;
}

export interface QRTokenData {
  id: string;
  profile_id: string;
  public_token: string;
  status: QRStatus;
  scan_count: number;
  created_at: string;
  suspended_at?: string | null;
  revoked_at?: string | null;
}

export interface PublicEmergencyProfile {
  public_token: string;
  status: QRStatus;
  display_name: string;
  blood_group?: string | null;
  allergies?: AllergyItem[];
  medications?: MedicationItem[];
  conditions?: MedicalConditionItem[];
  devices?: MedicalDeviceItem[];
  emergency_notes?: string | null;
  emergency_contacts: {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    priority_order: number;
  }[];
  company_emergency_contact?: {
    organization_name: string;
    phone: string;
    contact_name?: string | null;
    instructions?: string | null;
  } | null;
  updated_at: string;
  is_suspended_or_revoked?: boolean;
  message?: string;
}

export interface EmergencyIncident {
  id: string;
  profile_id: string;
  organization_id?: string | null;
  qr_token_id?: string | null;
  incident_code: string;
  status: IncidentStatus;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  triggered_at: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolution_notes?: string | null;
  profile_name?: string;
  organization_name?: string;
}

export interface NotificationDelivery {
  id: string;
  incident_id: string;
  recipient_type: 'family_contact' | 'company_contact';
  recipient_name: string;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider_ref?: string | null;
  failure_reason?: string | null;
  retry_count: number;
  created_at: string;
}

export interface FamilyPermissions {
  receive_alerts: boolean;
  can_view_medical: boolean;
  can_manage_qr: boolean;
}

export interface FamilyMemberItem {
  id: string;
  relationship_id: string;
  full_name: string;
  relationship_type: string;
  is_dependent: boolean;
  invitation_status: 'active' | 'pending_invite' | 'pending_approval' | 'accepted' | 'rejected';
  invite_email?: string | null;
  invite_phone?: string | null;
  is_sponsor?: boolean;
  permissions?: FamilyPermissions;
  qr_status: QRStatus;
  public_token?: string;
}

export interface PendingFamilyRequest {
  relationship_id: string;
  sponsor_name: string;
  sponsor_email?: string | null;
  relationship_type: string;
  created_at: string;
}

export interface UserOrganizationStatus {
  is_enrolled: boolean;
  status: 'independent' | 'active' | 'pending_approval';
  organization: Organization | null;
  membership?: any;
}

