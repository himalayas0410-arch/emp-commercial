import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { initSeedData, resetStoreForTesting } from '../db/repository';

describe('EMP Commercial Full-Stack API Test Suite', () => {
  let employeeToken = '';
  let hrToken = '';
  let superAdminToken = '';
  let employeeQrPublicToken = 'EMP-RAHUL-789X';

  beforeAll(async () => {
    resetStoreForTesting();
    await initSeedData();

    // 1. Employee Login
    const empLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul.sharma@apexglobal.com', password: 'Emp@123' });
    expect(empLogin.status).toBe(200);
    employeeToken = empLogin.body.token;

    // 2. HR Admin Login
    const hrLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@apexglobal.com', password: 'Emp@123' });
    expect(hrLogin.status).toBe(200);
    hrToken = hrLogin.body.token;

    // 3. Super Admin Login
    const saLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@emp.com', password: 'Admin@123' });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.token;
  });

  describe('Scenario A: Authentication & Medical Profile', () => {
    it('should retrieve employee medical profile with active QR token', async () => {
      const res = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.profile.full_name).toBe('Rahul Sharma');
      expect(res.body.profile.blood_group).toBe('O+');
      expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.qr_token.status).toBe('active');
    });

    it('should update medical profile and public disclosures', async () => {
      const res = await request(app)
        .put('/api/profiles/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          emergency_notes: 'Updated emergency protocol: call wife Pooja immediately.',
          public_disclosures: {
            blood_group: true,
            allergies: true,
            medications: true,
            conditions: true,
            devices: false, // Explicitly hiding devices from public QR!
            emergency_notes: true
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.public_disclosures.devices).toBe(false);
    });

    it('should add a new emergency contact', async () => {
      const res = await request(app)
        .post('/api/profiles/contacts')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Arun Verma',
          relationship: 'Colleague / Mentor',
          phone: '+91 98111 44433',
          priority_order: 3,
          is_alert_recipient: true
        });

      expect(res.status).toBe(201);
      expect(res.body.contact.name).toBe('Arun Verma');
    });
  });

  describe('Scenario B: Public Emergency Scan & Alert Workflow', () => {
    it('should open public emergency page without authentication', async () => {
      const res = await request(app)
        .get(`/api/emergency/${employeeQrPublicToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.display_name).toBeDefined();
      expect(res.body.blood_group).toBe('O+');
      // Verify data minimization: devices was hidden by user in Scenario A!
      expect(res.body.devices).toEqual([]);
      // Emergency contacts are present
      expect(res.body.emergency_contacts.length).toBeGreaterThanOrEqual(1);
      // Company emergency desk is present
      expect(res.body.company_emergency_contact).toBeDefined();
      expect(res.body.company_emergency_contact.phone).toBe('+91 98765 43210');
    });

    it('should trigger emergency alert and notify contacts', async () => {
      const res = await request(app)
        .post(`/api/emergency/${employeeQrPublicToken}/alert`)
        .send({
          location_address: 'DLF CyberCity Building 10, Gurugram, India',
          location_lat: 28.4986,
          location_lng: 77.0878
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.incident_code).toMatch(/^INC-/);
      expect(res.body.recipients_notified).toBeGreaterThanOrEqual(1);
      expect(res.body.channels_summary.in_app).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario C: QR Suspension, Reactivation, and Revocation', () => {
    it('should suspend QR token and block public profile access', async () => {
      // 1. Suspend
      const suspendRes = await request(app)
        .post('/api/qr/suspend')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.qr_token.status).toBe('suspended');

      // 2. Scan should return suspended neutral message and NO medical details
      const scanRes = await request(app)
        .get(`/api/emergency/${employeeQrPublicToken}`);
      expect(scanRes.status).toBe(200);
      expect(scanRes.body.status).toBe('suspended');
      expect(scanRes.body.blood_group).toBeUndefined();
      expect(scanRes.body.allergies).toBeUndefined();
    });

    it('should reactivate suspended QR token', async () => {
      const reactivateRes = await request(app)
        .post('/api/qr/reactivate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.qr_token.status).toBe('active');

      // Scan should work again
      const scanRes = await request(app)
        .get(`/api/emergency/${employeeQrPublicToken}`);
      expect(scanRes.status).toBe(200);
      expect(scanRes.body.status).toBe('active');
    });

    it('should regenerate QR token, permanently revoking the old one', async () => {
      const regenRes = await request(app)
        .post('/api/qr/regenerate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});
      expect(regenRes.status).toBe(200);
      const newPublicToken = regenRes.body.qr_token.public_token;
      expect(newPublicToken).not.toBe(employeeQrPublicToken);

      // Old token MUST now be revoked and expose NO medical data
      const oldScan = await request(app)
        .get(`/api/emergency/${employeeQrPublicToken}`);
      expect(oldScan.body.status).toBe('revoked');
      expect(oldScan.body.blood_group).toBeUndefined();

      // New token MUST be active
      const newScan = await request(app)
        .get(`/api/emergency/${newPublicToken}`);
      expect(newScan.body.status).toBe('active');
      expect(newScan.body.blood_group).toBe('O+');
    });
  });

  describe('Scenario D: Family & Dependent QR Codes', () => {
    it('should create a dependent with an independent unique QR code', async () => {
      const res = await request(app)
        .post('/api/family/dependent')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          full_name: 'Anvi Sharma',
          relationship_type: 'Daughter (Dependent Child)',
          date_of_birth: '2021-05-10',
          gender: 'Female',
          blood_group: 'A+',
          allergies: [{ id: '1', allergen: 'Lactose', reaction: 'Mild cramps', severity: 'mild' }]
        });

      expect(res.status).toBe(201);
      expect(res.body.dependent.full_name).toBe('Anvi Sharma');
      expect(res.body.dependent.public_token).toBeDefined();

      // Verify dependent QR opens dependent medical info
      const scanDep = await request(app)
        .get(`/api/emergency/${res.body.dependent.public_token}`);
      expect(scanDep.status).toBe(200);
      expect(scanDep.body.display_name).toBe('Anvi Sharma');
      expect(scanDep.body.blood_group).toBe('A+');
    });
  });

  describe('Scenario E: Company HR Administration & Strict RBAC', () => {
    it('should allow HR admin to view company metrics and employee roster without medical details', async () => {
      const res = await request(app)
        .get('/api/company/employees')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.employees.length).toBeGreaterThanOrEqual(1);
      const empRecord = res.body.employees[0];
      expect(empRecord.full_name).toBeDefined();
      expect(empRecord.qr_status).toBeDefined();
      // HR must NOT have access to medical details!
      expect((empRecord as any).blood_group).toBeUndefined();
      expect((empRecord as any).allergies).toBeUndefined();
    });

    it('should acknowledge an emergency incident', async () => {
      const incidentsRes = await request(app)
        .get('/api/company/incidents')
        .set('Authorization', `Bearer ${hrToken}`);
      
      expect(incidentsRes.status).toBe(200);
      if (incidentsRes.body.incidents.length > 0) {
        const incidentId = incidentsRes.body.incidents[0].id;
        const ackRes = await request(app)
          .post(`/api/company/incidents/${incidentId}/acknowledge`)
          .set('Authorization', `Bearer ${hrToken}`);
        
        expect(ackRes.status).toBe(200);
        expect(ackRes.body.incident.status).toBe('acknowledged');
      }
    });

    it('should deny employee access to company HR management endpoints', async () => {
      const res = await request(app)
        .get('/api/company/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario F: Platform Super Admin', () => {
    it('should allow Super Admin to view platform metrics and audit logs', async () => {
      const metricsRes = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.metrics.total_organizations).toBeGreaterThanOrEqual(1);

      const logsRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(logsRes.status).toBe(200);
      expect(logsRes.body.audit_logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario G: Direct Independent User Registration (No HR Invite Required)', () => {
    let independentToken = '';
    let independentQrToken = '';

    it('should allow an independent individual or student to register directly', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'priya.singh@example.com',
          password: 'Pass@123User',
          full_name: 'Priya Singh',
          phone: '+91 98990 11223',
          role: 'individual'
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.token).toBeDefined();
      expect(regRes.body.user.role).toBe('individual');
      independentToken = regRes.body.token;

      // Check that medical profile and personal QR token were created automatically
      const profileRes = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${independentToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.profile.full_name).toBe('Priya Singh');
      expect(profileRes.body.qr_token).toBeDefined();
      expect(profileRes.body.qr_token.status).toBe('active');
      independentQrToken = profileRes.body.qr_token.public_token;
    });

    it('should allow direct independent QR to be scanned publicly', async () => {
      const scanRes = await request(app).get(`/api/emergency/${independentQrToken}`);
      expect(scanRes.status).toBe(200);
      expect(scanRes.body.display_name).toBe('Priya Singh');
      expect(scanRes.body.status).toBe('active');
    });

    it('should support full QR lifecycle: suspend, reactivate, revoke, and generate fresh', async () => {
      // 1. Suspend
      const suspendRes = await request(app)
        .post('/api/qr/suspend')
        .set('Authorization', `Bearer ${independentToken}`);
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.qr_token.status).toBe('suspended');

      // Public scan of suspended QR returns status: 'suspended' with 200
      const scanSuspended = await request(app).get(`/api/emergency/${independentQrToken}`);
      expect(scanSuspended.status).toBe(200);
      expect(scanSuspended.body.status).toBe('suspended');

      // 2. Reactivate
      const reactivateRes = await request(app)
        .post('/api/qr/reactivate')
        .set('Authorization', `Bearer ${independentToken}`);
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.qr_token.status).toBe('active');

      // 3. Permanently Revoke
      const revokeRes = await request(app)
        .post('/api/qr/revoke')
        .set('Authorization', `Bearer ${independentToken}`);
      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.qr_token.status).toBe('revoked');

      // Public scan of revoked QR returns status: 'revoked' with 200
      const scanRevoked = await request(app).get(`/api/emergency/${independentQrToken}`);
      expect(scanRevoked.status).toBe(200);
      expect(scanRevoked.body.status).toBe('revoked');

      // 4. Generate Fresh Token
      const genRes = await request(app)
        .post('/api/qr/generate')
        .set('Authorization', `Bearer ${independentToken}`);
      expect(genRes.status).toBe(201);
      expect(genRes.body.qr_token.status).toBe('active');
      expect(genRes.body.qr_token.public_token).not.toBe(independentQrToken);
    });
  });

  describe('Scenario H: Family Linking Hub (Existing Accounts & Permission Controls)', () => {
    let userA_Token = '';
    let userB_Token = '';
    let linkRequestId = '';

    beforeAll(async () => {
      // Register User A
      const regA = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'vikram.mehta@example.com',
          password: 'Pass@123Mehta',
          full_name: 'Vikram Mehta',
          role: 'individual'
        });
      userA_Token = regA.body.token;

      // Register User B
      const regB = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sunita.mehta@example.com',
          password: 'Pass@123Sunita',
          full_name: 'Sunita Mehta',
          role: 'individual'
        });
      userB_Token = regB.body.token;
    });

    it('should allow User A to send a family link request to User B', async () => {
      const sendReq = await request(app)
        .post('/api/family/link-request')
        .set('Authorization', `Bearer ${userA_Token}`)
        .send({
          target_email: 'sunita.mehta@example.com',
          relationship_type: 'Spouse'
        });

      expect(sendReq.status).toBe(201);
      expect(sendReq.body.success).toBe(true);
      expect(sendReq.body.relationship.invitation_status).toBe('pending_approval');
      linkRequestId = sendReq.body.relationship.id;
    });

    it('should show pending request in User B pending list and allow acceptance', async () => {
      const pendingRes = await request(app)
        .get('/api/family/requests/pending')
        .set('Authorization', `Bearer ${userB_Token}`);

      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.pending_requests.length).toBeGreaterThanOrEqual(1);

      // User B accepts
      const acceptRes = await request(app)
        .post(`/api/family/requests/${linkRequestId}/accept`)
        .set('Authorization', `Bearer ${userB_Token}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);

      // Both users now see the linked relationship
      const famA = await request(app)
        .get('/api/family')
        .set('Authorization', `Bearer ${userA_Token}`);
      expect(famA.body.family_members.some((m: any) => m.name === 'Sunita Mehta')).toBe(true);
    });

    it('should update granular family permissions', async () => {
      const famA = await request(app)
        .get('/api/family')
        .set('Authorization', `Bearer ${userA_Token}`);
      const rel = famA.body.family_members.find((m: any) => m.name === 'Sunita Mehta');

      const permRes = await request(app)
        .put(`/api/family/${rel.id}/permissions`)
        .set('Authorization', `Bearer ${userA_Token}`)
        .send({
          receive_alerts: true,
          can_view_medical: false,
          can_manage_qr: true
        });

      expect(permRes.status).toBe(200);
      expect(permRes.body.permissions.can_view_medical).toBe(false);
      expect(permRes.body.permissions.can_manage_qr).toBe(true);
    });
  });

  describe('Scenario I: Optional Organization System (Join & Leave)', () => {
    let testUserToken = '';

    beforeAll(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'rohit.consultant@example.com',
          password: 'Pass@123Rohit',
          full_name: 'Rohit Consultant',
          role: 'individual'
        });
      testUserToken = reg.body.token;
    });

    it('should report independent status initially', async () => {
      const statusRes = await request(app)
        .get('/api/organization/my-status')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.is_enrolled).toBe(false);
      expect(statusRes.body.status).toBe('independent');
    });

    it('should join an organization by slug or code', async () => {
      const joinRes = await request(app)
        .post('/api/organization/join')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          company_code: 'apex-global',
          employee_id_number: 'APEX-EXT-9988',
          department: 'Emergency IT'
        });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.organization.name).toBe('Apex Global Technologies');

      const statusAfter = await request(app)
        .get('/api/organization/my-status')
        .set('Authorization', `Bearer ${testUserToken}`);
      expect(statusAfter.body.is_enrolled).toBe(true);
      expect(statusAfter.body.organization.emergency_phone).toBeDefined();
    });

    it('should leave an organization cleanly without losing medical profile or QR badge', async () => {
      const leaveRes = await request(app)
        .post('/api/organization/leave')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.success).toBe(true);

      // Verify medical profile and QR code remain completely intact
      const profRes = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${testUserToken}`);
      expect(profRes.body.profile.full_name).toBe('Rohit Consultant');
      expect(profRes.body.qr_token.status).toBe('active');
    });
  });

  describe('Scenario J: Alert Idempotency & Delivery History', () => {
    it('should prevent duplicate emergency incidents within 60 seconds', async () => {
      // Get Rahul's current active token after regeneration
      const curRes = await request(app)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${employeeToken}`);
      const activeToken = curRes.body.qr_token.public_token;

      // First trigger
      const firstTrigger = await request(app)
        .post(`/api/emergency/${activeToken}/alert`)
        .send({
          location_address: 'CyberHub DLF Phase 2'
        });

      expect(firstTrigger.status).toBe(201);
      expect(firstTrigger.body.success).toBe(true);
      expect(firstTrigger.body.incident_code).toBeDefined();

      // Second trigger immediately within 60s
      const secondTrigger = await request(app)
        .post(`/api/emergency/${activeToken}/alert`)
        .send({
          location_address: 'CyberHub DLF Phase 2'
        });

      expect(secondTrigger.status).toBe(200);
      expect(secondTrigger.body.status).toBe('duplicate_prevented');
      expect(secondTrigger.body.message).toContain('already dispatched');
    });

    it('should allow employee to retrieve real incident delivery logs', async () => {
      const historyRes = await request(app)
        .get('/api/emergency/history/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.incidents.length).toBeGreaterThanOrEqual(1);
      const inc = historyRes.body.incidents[0];
      expect(inc.incident_code).toBeDefined();
      expect(inc.deliveries).toBeDefined();
      expect(inc.deliveries.length).toBeGreaterThanOrEqual(1);
    });
  });
});

