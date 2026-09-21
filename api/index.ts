import type { Request, Response } from 'express';
import app from '../server/app';

export default function handler(req: Request, res: Response) {
  // 1. Robust URL Normalization for Vercel Serverless Function routing
  const matchedPath = (req.headers['x-matched-path'] as string) || (req.headers['x-invoke-path'] as string);
  if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  } else if (req.query) {
    const rawRoute = req.query.path || req.query.match || (req.query as any).__route;
    if (rawRoute) {
      const routeStr = Array.isArray(rawRoute) ? rawRoute.join('/') : String(rawRoute);
      const urlParts = (req.url || '').split('?');
      const searchParams = new URLSearchParams(urlParts[1] || '');
      searchParams.delete('path');
      searchParams.delete('match');
      searchParams.delete('__route');
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      req.url = `/api/${routeStr.replace(/^\/+/, '')}${qs}`;
    }
  }

  // Ensure leading slash
  if (!req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }

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
