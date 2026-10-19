import { Router } from 'express';
import { repository } from '../db/repository.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper to resolve profile and ensure ownership/guardianship
async function resolveAuthorizedProfile(userId: string, targetProfileId?: string) {
  if (targetProfileId) {
    const profile = await repository.getMedicalProfileById(targetProfileId);
    if (!profile) return null;
    // Authorized if owner or manager of dependent
    if (profile.user_id === userId || profile.manager_user_id === userId) {
      return profile;
    }
    return null;
  }
  return repository.getMedicalProfileByUserId(userId);
}

// Get current QR token details
router.get('/status', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const targetProfileId = req.query.profileId as string | undefined;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found or unauthorized.' });
    }

    const token = await repository.getQRTokenByProfileId(profile.id);
    res.json({
      profile_id: profile.id,
      full_name: profile.full_name,
      qr_token: token ? {
        id: token.id,
        public_token: token.public_token,
        status: token.status,
        scan_count: token.scan_count,
        created_at: token.created_at,
        suspended_at: token.suspended_at,
        revoked_at: token.revoked_at
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve QR status.' });
  }
});

// Generate QR Code
router.post('/generate', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetProfileId } = req.body;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized.' });

    const newToken = await repository.createQRToken(profile.id);

    await repository.logAuditEvent(req.user!.id, 'QR_GENERATED', 'qr_token', newToken.id, {
      profile_id: profile.id,
      public_token: newToken.public_token
    });

    res.status(201).json({ qr_token: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR token.' });
  }
});

// Suspend QR Code
router.post('/suspend', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { tokenId, targetProfileId } = req.body;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized.' });

    const currentToken = await repository.getQRTokenByProfileId(profile.id);
    if (!currentToken || (tokenId && currentToken.id !== tokenId)) {
      return res.status(404).json({ error: 'Active QR token not found.' });
    }

    const suspended = await repository.suspendQRToken(currentToken.id);

    await repository.logAuditEvent(req.user!.id, 'QR_SUSPENDED', 'qr_token', currentToken.id, {
      public_token: currentToken.public_token
    });

    res.json({ qr_token: suspended });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend QR code.' });
  }
});

// Reactivate Suspended QR Code
router.post('/reactivate', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetProfileId } = req.body;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized.' });

    const token = await repository.getQRTokenByProfileId(profile.id);
    if (!token || token.status !== 'suspended') {
      return res.status(400).json({ error: 'Token is not in suspended state.' });
    }

    const reactivated = await repository.reactivateQRToken(token.id);

    await repository.logAuditEvent(req.user!.id, 'QR_REACTIVATED', 'qr_token', token.id, {
      public_token: token.public_token
    });

    res.json({ qr_token: reactivated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate QR code.' });
  }
});

// Permanently Revoke QR Code
router.post('/revoke', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetProfileId } = req.body;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized.' });

    const token = await repository.getQRTokenByProfileId(profile.id);
    if (!token) return res.status(404).json({ error: 'Token not found.' });

    const revoked = await repository.revokeQRToken(token.id);

    await repository.logAuditEvent(req.user!.id, 'QR_REVOKED', 'qr_token', token.id, {
      public_token: token.public_token
    });

    res.json({ qr_token: revoked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke QR code.' });
  }
});

// Regenerate QR Code (Atomic: revokes old token and generates replacement)
router.post('/regenerate', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetProfileId } = req.body;
    const profile = await resolveAuthorizedProfile(req.user!.id, targetProfileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized.' });

    // Creates new token while automatically setting any existing token to revoked
    const newToken = await repository.createQRToken(profile.id);

    await repository.logAuditEvent(req.user!.id, 'QR_REGENERATED', 'qr_token', newToken.id, {
      profile_id: profile.id,
      new_public_token: newToken.public_token
    });

    res.json({ qr_token: newToken });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate QR code.' });
  }
});

export default router;
