import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middlewares/error.middleware';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';
import {
  companyOnboardingSchema,
  companyActionSchema,
  userOnboardingSchema,
  userActionSchema,
} from '../validations/onboarding.validator';

export class OnboardingController {
  static async initiateCompanyOnboarding(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedData = companyOnboardingSchema.parse(req.body);
      const initiatorId = req.user?.id;

      if (!initiatorId) {
        throw new AppError('Unauthorized', 401);
      }


      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/onboarding/company/initiate`,
        {
          ...validatedData,
          initiatorId,
        },
      );

      if (!ok) {
        throw new AppError(
          data.error || 'Failed to initiate onboarding',
          status,
        );
      }

      res.status(201).json(data);
    } catch (error) {

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  }

  static async actionCompanyOnboarding(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedData = companyActionSchema.parse(req.body);
      const approverId = req.user?.id;

      if (!approverId) {
        throw new AppError('Unauthorized', 401);
      }

      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/onboarding/company/action`,
        {
          ...validatedData,
          approverId,
        },
      );

      if (!ok) {
        throw new AppError(
          data.error || 'Failed to process onboarding action',
          status,
        );
      }

      res.status(200).json(data);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  }

  static async initiateUserOnboarding(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {

      const validatedData = userOnboardingSchema.parse(req.body);
      const initiatorId = req.user?.id;

      if (!initiatorId) {
        throw new AppError('Unauthorized', 401);
      }

      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/onboarding/user/initiate`,
        {
          ...validatedData,
          initiatorId,
        },
      );

      if (!ok) {
        throw new AppError(
          data.error || 'Failed to initiate user onboarding',
          status,
        );
      }

      res.status(201).json(data);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  }

  static async actionUserOnboarding(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedData = userActionSchema.parse(req.body);
      const approverId = req.user?.id;

      if (!approverId) {
        throw new AppError('Unauthorized', 401);
      }

      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/onboarding/user/action`,
        {
          ...validatedData,
          approverId,
        },
      );

      if (!ok) {
        throw new AppError(
          data.error || 'Failed to process user onboarding action',
          status,
        );
      }

      res.status(200).json(data);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  }
}
