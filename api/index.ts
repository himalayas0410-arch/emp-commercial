import { app } from '../server/index.js';
import { initSeedData } from '../server/db/repository.js';

let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    try {
      await initSeedData();
    } catch (e) {
      console.error('[Vercel Serverless Init Error]', e);
    }
    isInitialized = true;
  }
  return app(req, res);
}
