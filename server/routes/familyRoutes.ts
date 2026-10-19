import { Router } from 'express';
import { repository } from '../db/repository';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

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

    // Dispatch real email / SMS invitation to the family member
    await notificationService.dispatchFamilyInvitation({
      sponsorName: req.user!.full_name,
      targetEmail: email,
      targetPhone: phone,
      relationshipType: relationship_type,
      isExistingUser: false
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

// Get pending family link requests waiting for approval by current user
router.get('/requests/pending', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await repository.findUserById(req.user!.id);
    const requests = await repository.getPendingFamilyRequests(req.user!.id, user?.email);
    res.json({ pending_requests: requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve pending family requests.' });
  }
});

// Link an existing EMP user account
router.post('/link-request', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { target_email, relationship_type } = req.body;
    if (!target_email || !relationship_type) {
      return res.status(400).json({ error: 'Target user email and relationship type are required.' });
    }

    if (target_email.toLowerCase() === req.user!.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot link your own account to itself.' });
    }

    const targetUser = await repository.findUserByEmail(target_email);
    const sponsorProfile = await repository.getMedicalProfileByUserId(req.user!.id);
    const targetProfile = targetUser ? await repository.getMedicalProfileByUserId(targetUser.id) : null;

    const rel = await repository.createFamilyRelationship({
      sponsor_user_id: req.user!.id,
      linked_user_id: targetUser ? targetUser.id : null,
      family_profile_id: targetProfile ? targetProfile.id : (sponsorProfile ? sponsorProfile.id : null),
      relationship_type,
      invitation_status: targetUser ? 'pending_approval' : 'pending_invite',
      invite_email: target_email.toLowerCase(),
      permissions: {
        receive_alerts: true,
        can_view_medical: false,
        can_manage_qr: false
      }
    });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_LINK_REQUESTED', 'family_relationship', rel.id, {
      target_email,
      relationship_type
    });

    // Dispatch email notification to target user
    await notificationService.dispatchFamilyInvitation({
      sponsorName: req.user!.full_name,
      targetEmail: target_email,
      relationshipType: relationship_type,
      isExistingUser: !!targetUser
    });

    res.status(201).json({
      success: true,
      message: targetUser
        ? `Family link request sent to ${target_email}. Awaiting their authorization.`
        : `Invitation sent to ${target_email}. They will receive a link when creating their EMP account.`,
      relationship: rel
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit link request.' });
  }
});

// Accept a family link request
router.post('/requests/:id/accept', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rel = await repository.acceptFamilyRequest(req.params.id, req.user!.id);
    if (!rel) return res.status(404).json({ error: 'Family request not found.' });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_LINK_ACCEPTED', 'family_relationship', req.params.id);

    res.json({ success: true, message: 'Family relationship successfully linked.', relationship: rel });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept family link.' });
  }
});

// Decline a family link request
router.post('/requests/:id/decline', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await repository.declineFamilyRequest(req.params.id);
    if (!success) return res.status(404).json({ error: 'Family request not found.' });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_LINK_DECLINED', 'family_relationship', req.params.id);

    res.json({ success: true, message: 'Family link request declined.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to decline family link.' });
  }
});

// Update permissions for a family relationship
router.put('/:relationshipId/permissions', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { receive_alerts, can_view_medical, can_manage_qr } = req.body;
    const updated = await repository.updateFamilyPermissions(req.params.relationshipId, {
      receive_alerts,
      can_view_medical,
      can_manage_qr
    });
    if (!updated) return res.status(404).json({ error: 'Relationship not found.' });

    await repository.logAuditEvent(req.user!.id, 'FAMILY_PERMISSIONS_UPDATED', 'family_relationship', req.params.relationshipId, {
      permissions: updated.permissions
    });

    res.json({ success: true, permissions: updated.permissions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update permissions.' });
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
