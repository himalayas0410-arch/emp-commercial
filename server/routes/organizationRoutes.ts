import { Router } from 'express';
import { repository } from '../db/repository';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Get user's current organization membership status
router.get('/my-status', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const membership = await repository.getMembershipByUserId(req.user!.id);
    if (!membership) {
      return res.json({
        is_enrolled: false,
        status: 'independent',
        organization: null,
        membership: null
      });
    }

    const org = await repository.getOrganizationById(membership.organization_id);
    res.json({
      is_enrolled: true,
      status: membership.status,
      membership,
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
        emergency_phone: org.emergency_phone,
        emergency_contact_name: org.emergency_contact_name,
        emergency_instructions: org.emergency_instructions,
        show_company_phone_on_qr: org.show_company_phone_on_qr
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve organization status.' });
  }
});

// 2. Discover available public organizations to join
router.get('/available', async (_req, res) => {
  try {
    const list = await repository.getAllOrganizations();
    res.json({ organizations: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list organizations.' });
  }
});

// 3. Join an organization (by company code/slug or org ID)
router.post('/join', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { company_code, employee_id_number, department } = req.body;
    if (!company_code) {
      return res.status(400).json({ error: 'Company code or organization identifier is required.' });
    }

    const result = await repository.joinOrganization(
      req.user!.id,
      company_code.trim(),
      employee_id_number,
      department
    );

    if (result.error || !result.membership || !result.organization) {
      return res.status(404).json({ error: result.error || 'Failed to join organization' });
    }

    await repository.logAuditEvent(req.user!.id, 'ORGANIZATION_JOINED', 'organization_membership', result.membership.id, {
      organization_name: result.organization.name,
      employee_id_number
    });

    res.json({
      success: true,
      message: `Successfully joined ${result.organization.name}.`,
      organization: result.organization,
      membership: result.membership
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to join organization.' });
  }
});

// 4. Leave an organization (revert to independent account)
router.post('/leave', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await repository.leaveOrganization(req.user!.id);

    await repository.logAuditEvent(req.user!.id, 'ORGANIZATION_LEFT', 'user', req.user!.id);

    res.json({
      success: true,
      message: 'You have left the organization. Your personal emergency QR and medical profile remain fully active and independent.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to leave organization.' });
  }
});

export default router;
