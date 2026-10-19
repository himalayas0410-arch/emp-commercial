let initialized = false;

export default async function handler(req: any, res: any) {
  try {
    const { app } = await import('../server/app');
    const { initSeedData } = await import('../server/db/repository');
    
    if (!initialized) {
      await initSeedData();
      initialized = true;
    }
    
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Caught Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Vercel Serverless Function Error',
        message: err?.message || String(err),
        stack: err?.stack,
        code: err?.code
      });
    }
  }
}
