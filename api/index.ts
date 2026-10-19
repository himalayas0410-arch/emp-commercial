import { app } from '../server/index';
import { initSeedData } from '../server/db/repository';

// Initialize baseline in-memory database on cold start
initSeedData().catch(console.error);

export default app;
