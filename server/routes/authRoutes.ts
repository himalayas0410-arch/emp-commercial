import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { repository } from '../db/repository';
import { generateToken, verifyAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await repository.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been deactivated or suspended.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const membership = await repository.getMembershipByUserId(user.id);
    let org = null;
    if (membership) {
      org = await repository.getOrganizationById(membership.organization_id);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: membership ? membership.organization_id : null
    });

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    await repository.logAuditEvent(user.id, 'USER_LOGIN', 'user', user.id, { ip: clientIp });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        organization_id: membership ? membership.organization_id : null,
        organization_name: org ? org.name : null
      }
    });
  } catch (err: any) {
    console.error('[Auth Error]', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Register new user (Employee or Organization Admin)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role = 'employee', organization_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const existing = await repository.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    let orgId = null;
    let userRole = role;

    // If company admin registering new company
    if (role === 'company_admin' && organization_name) {
      const org = await repository.createOrganization({
        name: organization_name,
        emergency_phone: phone || null,
        emergency_contact_name: full_name
      });
      orgId = org.id;
    }

    const user = await repository.createUser({
      email,
      password_hash,
      full_name,
      phone,
      role: userRole
    });

    if (orgId) {
      await repository.createMembership({
        organization_id: orgId,
        user_id: user.id,
        role: 'company_admin'
      });
    }

    // Auto-create initial medical profile for employee
    let profile = null;
    if (userRole === 'employee') {
      profile = await repository.createMedicalProfile({
        user_id: user.id,
        organization_id: orgId,
        full_name: user.full_name,
        blood_group: 'Unknown',
        profile_completion_pct: 25
      });
      // Pre-generate QR token
      await repository.createQRToken(profile.id);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: orgId
    });

    await repository.logAuditEvent(user.id, 'USER_REGISTERED', 'user', user.id, { role: userRole });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organization_id: orgId
      }
    });
  } catch (err: any) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Current session info
router.get('/me', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await repository.findUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const membership = await repository.getMembershipByUserId(user.id);
    let org = null;
    if (membership) {
      org = await repository.getOrganizationById(membership.organization_id);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        organization_id: membership ? membership.organization_id : null,
        organization_name: org ? org.name : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user.' });
  }
});

export default router;
