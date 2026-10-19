import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import qrRoutes from './routes/qrRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import familyRoutes from './routes/familyRoutes';
import companyRoutes from './routes/companyRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();

// Security & Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EMP Commercial Backend',
    version: '1.0.0'
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Routes (both with and without /api prefix for maximum Vercel & local proxy compatibility)
const routes = [
  { prefix: '/auth', router: authRoutes },
  { prefix: '/profiles', router: profileRoutes },
  { prefix: '/qr', router: qrRoutes },
  { prefix: '/emergency', router: emergencyRoutes },
  { prefix: '/family', router: familyRoutes },
  { prefix: '/company', router: companyRoutes },
  { prefix: '/admin', router: adminRoutes },
];

routes.forEach(({ prefix, router }) => {
  app.use(`/api${prefix}`, router);
  app.use(prefix, router);
});

// Safe global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: 'An unexpected internal error occurred. Please try again later.'
  });
});

export { app };
export default app;
