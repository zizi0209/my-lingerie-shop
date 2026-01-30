/**
 * Express type extensions for Size System V2
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      sessionID?: string;
      session?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

export {};
