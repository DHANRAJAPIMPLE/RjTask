import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../shared/middlewares/error.middleware';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';



export class AdminController {

static async getGroupCompanies(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendCompanyUrl}/groups`,
      );

      if (!ok) {
        throw new AppError(data.error || 'Failed to fetch groups', status);
      }

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

}