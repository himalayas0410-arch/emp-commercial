import app from '../server/app';
import { initSeedData } from '../server/db/repository';

initSeedData().catch(console.error);

export default app;
