import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { repository } from '../db/repository';
import { notificationService } from '../services/notificationService';

const router = Router();

// Abuse prevention & enumeration resistance rate limiter for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 min
  message: { error: 'Too many requests. Please wait before scanning again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit on triggering alerts (max 5 alerts per 10 min per IP)
const alertTriggerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Emergency alert submission rate limit exceeded. Please dial the emergency numbers directly.' }
});

// Public Emergency Scan Page Data
router.get('/:token', publicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Missing token parameter.' });
    }

    const qrRecord = await repository.getQRTokenByPublicToken(token);
    if (!qrRecord) {
      // Resistance against enumeration: return generic not found without leaking user info
      return res.status(404).json({
        status: 'invalid',
        message: 'This Emergency Medical QR token is invalid or does not exist.'
      });
    }

    // Check status: Suspended
    if (qrRecord.status === 'suspended') {
      return res.status(200).json({
        status: 'suspended',
        public_token: token,
        message: 'This emergency profile has been temporarily suspended by the owner.',
        is_suspended_or_revoked: true
      });
    }

    // Check status: Revoked
    if (qrRecord.status === 'revoked') {
      return res.status(200).json({
        status: 'revoked',
        public_token: token,
        message: 'This emergency QR code has been permanently revoked and is no longer active.',
        is_suspended_or_revoked: true
      });
    }

    // Active token: fetch profile
    const profile = await repository.getMedicalProfileById(qrRecord.profile_id);
    if (!profile) {
      return res.status(404).json({ status: 'invalid', message: 'Medical profile not found.' });
    }

    // Increment scan counter
    await repository.incrementQRScan(qrRecord.id);

    // Fetch emergency contacts
    const allContacts = await repository.getContactsByProfileId(profile.id);
    const visibleContacts = allContacts.map(c => ({
      id: c.id,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      priority_order: c.priority_order
    }));

    // Fetch company emergency hotline if enrolled in an organization
    let companyEmergency = null;
    if (profile.organization_id) {
      const org = await repository.getOrganizationById(profile.organization_id);
      if (org && org.show_company_phone_on_qr && org.emergency_phone) {
        companyEmergency = {
          organization_name: org.name,
          phone: org.emergency_phone,
          contact_name: org.emergency_contact_name || 'Emergency Response Desk',
          instructions: org.emergency_instructions
        };
      }
    }

    // CRITICAL DATA MINIMIZATION:
    // Only return fields that the individual explicitly allowed in public_disclosures!
    const disclosures = profile.public_disclosures || {
      blood_group: true,
      allergies: true,
      medications: true,
      conditions: true,
      devices: true,
      emergency_notes: true
    };

    const sanitizedData = {
      status: 'active',
      public_token: qrRecord.public_token,
      display_name: profile.preferred_name || profile.full_name,
      blood_group: disclosures.blood_group ? profile.blood_group : null,
      allergies: disclosures.allergies ? profile.allergies : [],
      medications: disclosures.medications ? profile.medications : [],
      conditions: disclosures.conditions ? profile.conditions : [],
      devices: disclosures.devices ? profile.devices : [],
      emergency_notes: disclosures.emergency_notes ? profile.emergency_notes : null,
      emergency_contacts: visibleContacts,
      company_emergency_contact: companyEmergency,
      updated_at: profile.updated_at
    };

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    // Log audit event for scan
    await repository.logAuditEvent(null, 'QR_SCANNED', 'qr_token', qrRecord.id, {
      public_token: token,
      ip: clientIp
    });

    res.json(sanitizedData);
  } catch (err: any) {
    console.error('[Emergency Scan Error]', err);
    res.status(500).json({ error: 'Server error retrieving emergency details.' });
  }
});

// Trigger Emergency Alert
router.post('/:token/alert', alertTriggerLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { location_lat, location_lng, location_address } = req.body;

    const qrRecord = await repository.getQRTokenByPublicToken(token);
    if (!qrRecord || qrRecord.status !== 'active') {
      return res.status(400).json({ error: 'Cannot trigger alert: QR code is not active.' });
    }

    const profile = await repository.getMedicalProfileById(qrRecord.profile_id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
    // 1. Create unique emergency incident record
    const incident = await repository.createIncident({
      profile_id: profile.id,
      organization_id: profile.organization_id,
      qr_token_id: qrRecord.id,
      location_lat,
      location_lng,
      location_address,
      triggered_by_ip: clientIp
    });

    // 2. Determine eligible notification recipients
    const contacts = await repository.getContactsByProfileId(profile.id);
    const recipients: any[] = [];

    // Family / Personal Emergency Contacts
    for (const c of contacts) {
      if (c.is_alert_recipient) {
        recipients.push({
          type: 'family_contact',
          name: c.name,
          phone: c.phone,
          email: c.email
        });
      }
    }

    // Company Emergency Contact / HR Team if enrolled
    let orgName = undefined;
    if (profile.organization_id) {
      const org = await repository.getOrganizationById(profile.organization_id);
      if (org) {
        orgName = org.name;
        if (org.emergency_phone) {
          recipients.push({
            type: 'company_contact',
            name: `${org.name} (${org.emergency_contact_name || 'Emergency Team'})`,
            phone: org.emergency_phone,
            email: null
          });
        }
      }
    }

    // 3. Dispatch notifications across channels
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const incidentUrl = `${frontendBaseUrl}/incident/${incident.id}`;

    const dispatchResult = await notificationService.dispatchEmergencyAlert({
      incidentId: incident.id,
      incidentCode: incident.incident_code,
      affectedName: profile.full_name,
      organizationName: orgName,
      triggeredAt: incident.triggered_at,
      locationAddress: location_address,
      incidentUrl,
      recipients
    });

    // 4. Log audit event
    await repository.logAuditEvent(null, 'EMERGENCY_ALERT_TRIGGERED', 'emergency_incident', incident.id, {
      incidentCode: incident.incident_code,
      totalRecipients: recipients.length,
      ip: clientIp
    });

    res.status(201).json({
      success: true,
      incident_id: incident.id,
      incident_code: incident.incident_code,
      status: 'dispatched',
      message: 'Emergency alert dispatched to registered family contacts and emergency responders.',
      recipients_notified: dispatchResult.totalRecipients,
      channels_summary: dispatchResult.channelsDispatched
    });
  } catch (err: any) {
    console.error('[Emergency Alert Error]', err);
    res.status(500).json({ error: 'Failed to dispatch emergency alert. Please use the phone buttons to call directly.' });
  }
});

export default router;
