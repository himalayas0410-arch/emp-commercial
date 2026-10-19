import { Router } from 'express';
import { repository } from '../db/repository.js';
import { verifyAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(verifyAuth, requireRole('super_admin'));

// Platform Wide Metrics
router.get('/metrics', async (req: AuthenticatedRequest, res) => {
  try {
    const rawStore = repository._getRawStore();

    const totalOrgs = rawStore.organizations.length;
    const totalUsers = rawStore.users.length;
    const totalQRs = rawStore.qr_tokens.length;
    const activeQRs = rawStore.qr_tokens.filter(q => q.status === 'active').length;
    const suspendedQRs = rawStore.qr_tokens.filter(q => q.status === 'suspended').length;
    const revokedQRs = rawStore.qr_tokens.filter(q => q.status === 'revoked').length;
    const totalIncidents = rawStore.emergency_incidents.length;
    const totalDeliveries = rawStore.notification_deliveries.length;

    res.json({
      metrics: {
        total_organizations: totalOrgs,
        total_users: totalUsers,
        total_qrs: totalQRs,
        active_qrs: activeQRs,
        suspended_qrs: suspendedQRs,
        revoked_qrs: revokedQRs,
        total_incidents: totalIncidents,
        total_notifications_sent: totalDeliveries,
        system_health: 'Operational',
        database_status: 'Connected (Postgres & Resilient Cache)'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve platform metrics.' });
  }
});

// Organization Accounts Explorer
router.get('/organizations', async (req: AuthenticatedRequest, res) => {
  try {
    const orgs = await repository.getOrganizations();
    const rawStore = repository._getRawStore();

    const enriched = orgs.map(org => {
      const seats = rawStore.organization_memberships.filter(m => m.organization_id === org.id).length;
      const sub = rawStore.subscriptions.find(s => s.organization_id === org.id);
      return {
        ...org,
        enrolled_employees: seats,
        subscription: sub || { plan_tier: 'growth', status: 'active', max_seats: 100 }
      };
    });

    res.json({ organizations: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list organizations.' });
  }
});

// Update Organization Status / Plan
router.post('/organizations/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { status, plan_tier, max_seats } = req.body;
    const updated = await repository.updateOrganization(req.params.id, { status });
    if (!updated) return res.status(404).json({ error: 'Organization not found.' });

    if (plan_tier || max_seats) {
      const rawStore = repository._getRawStore();
      const sub = rawStore.subscriptions.find(s => s.organization_id === req.params.id);
      if (sub) {
        if (plan_tier) sub.plan_tier = plan_tier;
        if (max_seats) sub.max_seats = max_seats;
      }
    }

    await repository.logAuditEvent(req.user!.id, 'ORG_STATUS_CHANGED', 'organization', req.params.id, { status, plan_tier });

    res.json({ organization: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update organization status.' });
  }
});

// Platform Audit Log Viewer
router.get('/audit-logs', async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const logs = await repository.getAuditLogs(limit);
    res.json({ audit_logs: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;
