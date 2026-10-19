import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { repository } from '../db/repository';
import { verifyAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Middleware: must be company_admin or super_admin
router.use(verifyAuth, requireRole('company_admin', 'super_admin'));

// Helper to get active company organization id
async function resolveOrgId(req: AuthenticatedRequest): Promise<string | null> {
  if (req.user!.role === 'super_admin') {
    return (req.query.orgId as string) || (req.body.orgId as string) || req.user!.organization_id || null;
  }
  return req.user!.organization_id || null;
}

// 1. Company Dashboard Overview Metrics
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const org = await repository.getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const memberships = await repository.getMembershipsByOrgId(orgId);
    const incidents = await repository.getIncidentsByOrgId(orgId);

    // Aggregate statistics
    let activeEmployees = 0;
    let profilesComplete = 0;
    let profilesIncomplete = 0;
    let activeQRs = 0;
    let suspendedQRs = 0;

    for (const mem of memberships) {
      const user = await repository.findUserById(mem.user_id);
      if (user && user.status === 'active') {
        activeEmployees++;
      }
      const profile = await repository.getMedicalProfileByUserId(mem.user_id);
      if (profile) {
        if ((profile.profile_completion_pct || 0) >= 80) {
          profilesComplete++;
        } else {
          profilesIncomplete++;
        }
        const qr = await repository.getQRTokenByProfileId(profile.id);
        if (qr) {
          if (qr.status === 'active') activeQRs++;
          if (qr.status === 'suspended') suspendedQRs++;
        }
      }
    }

    const unacknowledgedIncidents = incidents.filter(i => i.status === 'triggered').length;

    res.json({
      organization: {
        id: org.id,
        name: org.name,
        emergency_phone: org.emergency_phone,
        emergency_contact_name: org.emergency_contact_name,
        emergency_instructions: org.emergency_instructions,
        show_company_phone_on_qr: org.show_company_phone_on_qr
      },
      metrics: {
        total_enrolled: memberships.length,
        active_accounts: activeEmployees,
        profiles_complete: profilesComplete,
        profiles_incomplete: profilesIncomplete,
        active_qrs: activeQRs,
        suspended_qrs: suspendedQRs,
        total_incidents: incidents.length,
        unacknowledged_incidents: unacknowledgedIncidents
      },
      recent_incidents: incidents.slice(0, 5)
    });
  } catch (err: any) {
    console.error('[Company Dashboard Error]', err);
    res.status(500).json({ error: 'Failed to load company metrics.' });
  }
});

// 2. Employee Roster Management (STRICT PRIVACY: NO PRIVATE MEDICAL HISTORIES RETURNED)
router.get('/employees', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const memberships = await repository.getMembershipsByOrgId(orgId);
    const search = ((req.query.search as string) || '').toLowerCase();
    const department = (req.query.department as string) || '';

    const employees = [];
    for (const mem of memberships) {
      const user = await repository.findUserById(mem.user_id);
      if (!user) continue;

      if (search && !user.full_name.toLowerCase().includes(search) && !user.email.toLowerCase().includes(search)) {
        continue;
      }
      if (department && mem.department !== department) {
        continue;
      }

      const profile = await repository.getMedicalProfileByUserId(user.id);
      let qrToken = null;
      if (profile) {
        qrToken = await repository.getQRTokenByProfileId(profile.id);
      }

      employees.push({
        id: user.id,
        membership_id: mem.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: mem.role,
        department: mem.department || 'General',
        employee_id_number: mem.employee_id_number || 'N/A',
        account_status: user.status,
        joined_at: mem.joined_at,
        profile_completion_pct: profile ? profile.profile_completion_pct : 0,
        qr_status: qrToken ? qrToken.status : 'not_generated',
        public_token: qrToken ? qrToken.public_token : null
      });
    }

    res.json({ employees });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load employee list.' });
  }
});

// 3. Single Employee Invitation
router.post('/employees/invite', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const { full_name, email, department, employee_id_number, phone } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const existing = await repository.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email is already registered.' });
    }

    // Default temporary invite password
    const tempPassword = 'Emp@' + Math.floor(1000 + Math.random() * 9000);
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(tempPassword, salt);

    const user = await repository.createUser({
      email,
      password_hash,
      full_name,
      phone: phone || null,
      role: 'employee',
      status: 'active'
    });

    await repository.createMembership({
      organization_id: orgId,
      user_id: user.id,
      role: 'employee',
      department: department || 'General',
      employee_id_number: employee_id_number || null
    });

    // Auto-create medical profile + QR token
    const profile = await repository.createMedicalProfile({
      user_id: user.id,
      organization_id: orgId,
      full_name: user.full_name,
      blood_group: 'Unknown',
      profile_completion_pct: 25
    });
    await repository.createQRToken(profile.id);

    await repository.logAuditEvent(req.user!.id, 'EMPLOYEE_INVITED', 'user', user.id, {
      email,
      department
    });

    res.status(201).json({
      success: true,
      message: 'Employee invited successfully.',
      temporary_password: tempPassword,
      employee: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        department
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invite employee.' });
  }
});

// 4. Validated CSV Bulk Import
router.post('/employees/csv-import', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const { csv_content } = req.body;
    if (!csv_content || typeof csv_content !== 'string') {
      return res.status(400).json({ error: 'csv_content string is required.' });
    }

    const lines = csv_content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ error: 'CSV file contains no records.' });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf('email');
    const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('full_name');
    const deptIdx = headers.indexOf('department');
    const idIdx = headers.indexOf('employee_id');

    if (emailIdx === -1 || nameIdx === -1) {
      return res.status(400).json({ error: 'CSV must contain at least "email" and "name" columns.' });
    }

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const email = parts[emailIdx];
      const fullName = parts[nameIdx];
      const dept = deptIdx !== -1 ? parts[deptIdx] : 'General';
      const empIdNum = idIdx !== -1 ? parts[idIdx] : null;

      if (!email || !fullName) {
        results.skipped++;
        results.errors.push(`Line ${i + 1}: missing email or name`);
        continue;
      }

      const existing = await repository.findUserByEmail(email);
      if (existing) {
        results.skipped++;
        results.errors.push(`Line ${i + 1}: ${email} already registered`);
        continue;
      }

      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync('Emp@123', salt);

      const user = await repository.createUser({
        email,
        password_hash,
        full_name: fullName,
        role: 'employee',
        status: 'active'
      });

      await repository.createMembership({
        organization_id: orgId,
        user_id: user.id,
        role: 'employee',
        department: dept,
        employee_id_number: empIdNum
      });

      const profile = await repository.createMedicalProfile({
        user_id: user.id,
        organization_id: orgId,
        full_name: fullName,
        blood_group: 'Unknown',
        profile_completion_pct: 25
      });
      await repository.createQRToken(profile.id);

      results.imported++;
    }

    await repository.logAuditEvent(req.user!.id, 'CSV_BULK_IMPORT', 'organization', orgId, {
      imported: results.imported,
      skipped: results.skipped
    });

    res.json({
      success: true,
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process CSV file.' });
  }
});

// 5. Emergency Incident Dashboard for Company
router.get('/incidents', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const incidents = await repository.getIncidentsByOrgId(orgId);

    // Enrich with employee name and notification delivery status
    const enriched = [];
    for (const inc of incidents) {
      const profile = await repository.getMedicalProfileById(inc.profile_id);
      const deliveries = await repository.getDeliveriesByIncidentId(inc.id);
      enriched.push({
        ...inc,
        affected_name: profile ? profile.full_name : 'Unknown Individual',
        deliveries
      });
    }

    res.json({ incidents: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve incidents.' });
  }
});

// 6. Acknowledge Incident
router.post('/incidents/:id/acknowledge', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await repository.findUserById(req.user!.id);
    const responderName = user ? `${user.full_name} (${user.role})` : 'Authorized HR Responder';

    const ack = await repository.acknowledgeIncident(req.params.id, responderName);
    if (!ack) return res.status(404).json({ error: 'Incident not found.' });

    await repository.logAuditEvent(req.user!.id, 'INCIDENT_ACKNOWLEDGED', 'emergency_incident', req.params.id, {
      responder: responderName
    });

    res.json({ incident: ack });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge incident.' });
  }
});

// 7. Resolve Incident
router.post('/incidents/:id/resolve', async (req: AuthenticatedRequest, res) => {
  try {
    const { resolution_notes } = req.body;
    const resolved = await repository.resolveIncident(req.params.id, resolution_notes || 'Incident resolved by emergency response team.');
    if (!resolved) return res.status(404).json({ error: 'Incident not found.' });

    await repository.logAuditEvent(req.user!.id, 'INCIDENT_RESOLVED', 'emergency_incident', req.params.id, {
      notes: resolution_notes
    });

    res.json({ incident: resolved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve incident.' });
  }
});

// 8. Organization Emergency Contact Settings
router.get('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const org = await repository.getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    res.json({ organization: org });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

router.put('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID not found.' });

    const { emergency_phone, emergency_contact_name, emergency_instructions, show_company_phone_on_qr, name } = req.body;

    const updated = await repository.updateOrganization(orgId, {
      emergency_phone,
      emergency_contact_name,
      emergency_instructions,
      show_company_phone_on_qr: show_company_phone_on_qr ?? true,
      ...(name ? { name } : {})
    });

    await repository.logAuditEvent(req.user!.id, 'COMPANY_SETTINGS_UPDATED', 'organization', orgId);

    res.json({ organization: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company settings.' });
  }
});

export default router;
