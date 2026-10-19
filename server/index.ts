import dotenv from 'dotenv';
import { app } from './app';
import { testSupabaseConnection } from './db/supabase';
import { initSeedData } from './db/repository';

dotenv.config();

const PORT = process.env.PORT || 5000;

export { app };

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
