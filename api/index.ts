import type { Request, Response } from 'express';
import app from '../server/app';

export default function handler(req: Request, res: Response) {
  return new Promise((resolve) => {
    try {
      app(req, res, (err?: any) => {
        if (err && !res.headersSent) {
          console.error('[Vercel Serverless Invocation Error]:', err);
          res.status(500).json({
            status: 'error',
            error: 'Serverless invocation error',
            message: String(err?.message || err)
          });
        }
        resolve(undefined);
      });
    } catch (err: any) {
      console.error('[Vercel Serverless Exception]:', err);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          error: 'Handler Exception',
          message: String(err?.message || err)
        });
      }
      resolve(undefined);
    }
  });
}
