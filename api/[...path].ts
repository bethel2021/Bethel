import type { Request, Response } from 'express';
import handler from './index';

export default function catchAllHandler(req: Request, res: Response) {
  return handler(req, res);
}
