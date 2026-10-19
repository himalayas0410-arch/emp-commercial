import { Router } from 'express';
import { repository } from '../db/repository';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get current user's medical profile & emergency contacts
router.get('/me', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    let profile = await repository.getMedicalProfileByUserId(req.user!.id);
    if (!profile) {
      const user = await repository.findUserById(req.user!.id);
      profile = await repository.createMedicalProfile({
        user_id: req.user!.id,
        organization_id: req.user!.organization_id || null,
        full_name: user ? user.full_name : 'User'
      });
    }

    const contacts = await repository.getContactsByProfileId(profile.id);
    const qrToken = await repository.getQRTokenByProfileId(profile.id);

    res.json({
      profile,
      contacts,
      qr_token: qrToken ? {
        id: qrToken.id,
        public_token: qrToken.public_token,
        status: qrToken.status,
        scan_count: qrToken.scan_count,
        created_at: qrToken.created_at,
        suspended_at: qrToken.suspended_at
      } : null
    });
  } catch (err: any) {
    console.error('[Profile Fetch Error]', err);
    res.status(500).json({ error: 'Failed to retrieve medical profile.' });
  }
});

// Update current user's medical profile
router.put('/me', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await repository.getMedicalProfileByUserId(req.user!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const allowedUpdates = [
      'full_name',
      'preferred_name',
      'date_of_birth',
      'gender',
      'blood_group',
      'allergies',
      'medications',
      'conditions',
      'surgeries',
      'devices',
      'emergency_notes',
      'public_disclosures'
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedProfile = await repository.updateMedicalProfile(profile.id, updates);

    await repository.logAuditEvent(req.user!.id, 'PROFILE_UPDATED', 'medical_profile', profile.id, {
      updatedFields: Object.keys(updates)
    });

    res.json({ profile: updatedProfile });
  } catch (err: any) {
    console.error('[Profile Update Error]', err);
    res.status(500).json({ error: 'Failed to update medical profile.' });
  }
});

// Add Emergency Contact
router.post('/contacts', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await repository.getMedicalProfileByUserId(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const { name, relationship, phone, email, priority_order, is_alert_recipient } = req.body;
    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: 'Name, relationship, and phone number are required.' });
    }

    const contact = await repository.createEmergencyContact({
      profile_id: profile.id,
      name,
      relationship,
      phone,
      email,
      priority_order: priority_order || 1,
      is_alert_recipient: is_alert_recipient ?? true
    });

    // Refresh profile completion
    await repository.updateMedicalProfile(profile.id, {});

    await repository.logAuditEvent(req.user!.id, 'CONTACT_ADDED', 'emergency_contact', contact.id, { name });

    res.status(201).json({ contact });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add emergency contact.' });
  }
});

// Update Emergency Contact
router.put('/contacts/:id', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await repository.getMedicalProfileByUserId(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const updated = await repository.updateEmergencyContact(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Contact not found.' });

    await repository.logAuditEvent(req.user!.id, 'CONTACT_UPDATED', 'emergency_contact', req.params.id);

    res.json({ contact: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact.' });
  }
});

// Delete Emergency Contact
router.delete('/contacts/:id', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await repository.deleteEmergencyContact(req.params.id);
    if (!success) return res.status(404).json({ error: 'Contact not found.' });

    const profile = await repository.getMedicalProfileByUserId(req.user!.id);
    if (profile) await repository.updateMedicalProfile(profile.id, {});

    await repository.logAuditEvent(req.user!.id, 'CONTACT_DELETED', 'emergency_contact', req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove contact.' });
  }
});

export default router;
