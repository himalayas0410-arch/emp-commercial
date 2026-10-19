import { Router } from 'express';
import { repository } from '../db/repository.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get all family members and dependents for logged-in user
router.get('/', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const list = await repository.getFamilyRelationships(req.user!.id);
    res.json({ family_members: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve family members.' });
  }
});

// Add a dependent profile (e.g. child, elderly dependent)
router.post('/dependent', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { full_name, relationship_type, date_of_birth, gender, blood_group, allergies, conditions, emergency_notes } = req.body;
    if (!full_name || !relationship_type) {
      return res.status(400).json({ error: 'Full name and relationship type are required.' });
    }

    // 1. Create separate medical profile for the dependent
    const dependentProfile = await repository.createMedicalProfile({
      user_id: null, // No separate login yet
      organization_id: req.user!.organization_id || null,
      is_dependent: true,
      manager_user_id: req.user!.id,
      full_name,
      date_of_birth,
      gender,
      blood_group: blood_group || 'Unknown',
      allergies: allergies || [],
      conditions: conditions || [],
      emergency_notes: emergency_notes || null,
      profile_completion_pct: 60
    });

    // 2. Add employee as the dependent's primary emergency contact
    const sponsorUser = await repository.findUserById(req.user!.id);
    if (sponsorUser) {
      await repository.createEmergencyContact({
        profile_id: dependentProfile.id,
        name: sponsorUser.full_name,
        relationship: 'Guardian / Parent',
        phone: sponsorUser.phone || '',
        email: sponsorUser.email,
        priority_order: 1,
        is_alert_recipient: true
      });
    }

    // 3. Generate independent, unique QR token for this dependent!
    const qrToken = await repository.createQRToken(dependentProfile.id);

    // 4. Create family relationship link
    const rel = await repository.createFamilyRelationship({
      sponsor_user_id: req.user!.id,
      family_profile_id: dependentProfile.id,
      relationship_type,
      invitation_status: 'active'
    });

    await repository.logAuditEvent(req.user!.id, 'DEPENDENT_PROFILE_CREATED', 'medical_profile', dependentProfile.id, {
      full_name,
      relationship_type,
      qr_token: qrToken.public_token
    });

    res.status(201).json({
      success: true,
      dependent: {
        relationship_id: rel.id,
        id: dependentProfile.id,
        full_name: dependentProfile.full_name,
        relationship_type,
        is_dependent: true,
        invitation_status: 'active',
        qr_status: qrToken.status,
        public_token: qrToken.public_token
      }
    });
  } catch (err: any) {
    console.error('[Add Dependent Error]', err);
    res.status(500).json({ error: 'Failed to create dependent profile.' });
  }
});

// Invite independent adult family member (e.g. spouse, adult sibling)
router.post('/invite', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { full_name, relationship_type, email, phone } = req.body;
    if (!full_name || !relationship_type || (!email && !phone)) {
      return res.status(400).json({ error: 'Full name, relationship type, and email or phone are required.' });
    }

    // Create an independent profile skeleton
    const familyProfile = await repository.createMedicalProfile({
      user_id: null,
      organization_id: null, // Personal profile, decoupled from employer!
      is_dependent: false,
      manager_user_id: null,
      full_name,
      blood_group: 'Unknown',
      profile_completion_pct: 30
    });

    // Generate independent QR token
    const qrToken = await repository.createQRToken(familyProfile.id);

    // Create relationship in pending_invite status
    const rel = await repository.createFamilyRelationship({
      sponsor_user_id: req.user!.id,
      family_profile_id: familyProfile.id,
      relationship_type,
      invitation_status: 'pending_invite',
      invite_email: email,
      invite_phone: phone
    });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_MEMBER_INVITED', 'family_relationship', rel.id, {
      invite_email: email,
      invite_phone: phone
    });

    res.status(201).json({
      success: true,
      family_member: {
        relationship_id: rel.id,
        id: familyProfile.id,
        full_name,
        relationship_type,
        is_dependent: false,
        invitation_status: 'pending_invite',
        invite_email: email,
        invite_phone: phone,
        qr_status: qrToken.status,
        public_token: qrToken.public_token
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send family invitation.' });
  }
});

// Remove family association without deleting user's personal account
router.delete('/:relationshipId', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await repository.deleteFamilyRelationship(req.params.relationshipId);
    if (!success) return res.status(404).json({ error: 'Relationship not found.' });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_RELATIONSHIP_REMOVED', 'family_relationship', req.params.relationshipId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove relationship.' });
  }
});

export default router;
