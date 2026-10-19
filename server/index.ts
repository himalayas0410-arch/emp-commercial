import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testSupabaseConnection } from './db/supabase.js';
import { initSeedData } from './db/repository.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EMP Commercial Backend',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);

// Safe global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: 'An unexpected internal error occurred. Please try again later.'
  });
});

export { app };

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(`  EMP Commercial Server running on port ${PORT}`);
    console.log(`  API Base: http://localhost:${PORT}/api`);
    console.log(`=================================================\n`);

    await testSupabaseConnection();
    await initSeedData();
  });
}
