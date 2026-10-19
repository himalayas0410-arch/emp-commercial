import { app } from '../server/app';
import { initSeedData } from '../server/db/repository';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    try {
      await initSeedData();
    } catch (e) {
      console.error('[Vercel Seed Init Error]', e);
    }
    initialized = true;
  }
  return app(req, res);
}
