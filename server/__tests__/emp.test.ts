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
});
