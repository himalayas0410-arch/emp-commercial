import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { repository } from '../db/repository';

const JWT_SECRET = process.env.JWT_SECRET || 'emp_commercial_super_secure_jwt_secret_2026_99cc663d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_id?: string | null;
  };
}

export function generateToken(user: { id: string; email: string; full_name?: string; role: string; organization_id?: string | null }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      organization_id: user.organization_id || null
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await repository.findUserById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User session is inactive or user no longer exists.' });
    }

    // Attach membership org if available
    const membership = await repository.getMembershipByUserId(user.id);
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      organization_id: membership ? membership.organization_id : null
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
}

export function requireOrgMatch(paramKey = 'orgId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role === 'super_admin') return next();

    const targetOrgId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
    if (req.user.organization_id !== targetOrgId) {
      return res.status(403).json({ error: 'Access denied: Tenant isolation violation. You cannot access another company\'s records.' });
    }
    next();
  };
}
