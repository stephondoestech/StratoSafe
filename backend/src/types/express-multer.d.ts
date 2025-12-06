/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// This fixes the type compatibility issue between Express and Multer
import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';

declare global {
  namespace Express {
    // Ensure Multer fields are available on Express.Request
    interface Request {
      file?: Express.Multer.File;
      files?:
        | {
            [fieldname: string]: Express.Multer.File[];
          }
        | Express.Multer.File[];
    }
  }
}

// Make Express's RequestHandler compatible with Multer middleware
declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    [key: string]: string;
  }

  interface RequestHandler<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = any> {
    (
      req: Request<P, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction
    ): void | Promise<void>;
  }
}

// Export nothing, this is just for types
export {};
