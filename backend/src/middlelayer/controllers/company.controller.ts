import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../shared/middlewares/error.middleware';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';
import {
  companyOnboardingSchema,
  companyActionSchema,
} from '../validations/onboarding.validator';
import { CodeGenUtil } from '../utils/code-gen.util';

export class CompanyController {
  static async getMyCompanies(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;

      // Fetch raw mappings from Backend
      const {
        data: mappings,
        ok,
        status,
      } = await internalPost<any[]>(
        `${config.backendCompanyUrl}/my-companies`,
        { userId },
      );

      if (!ok) {
        throw new AppError('Failed to fetch companies', status);
      }

      // Logic: Shape data for frontend
      const companies = mappings.map((m) => ({
        companyCode: m.company.companyCode,
        brandName: m.company.brandName,
      }));

      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }

  static async initiateCompanyOnboarding(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedData = companyOnboardingSchema.parse(req.body);
      const initiatorId = req.user?.id;
      const { group, company, signatories } = validatedData;

      if (!initiatorId) {
        throw new AppError('Unauthorized', 401);
      }

      // Logic: Handle Group Code
      let finalGroupCode = group.groupCode;
      if (!finalGroupCode && group.name) {
        finalGroupCode = await CodeGenUtil.generateUniqueGroupCode(group.name);
      }

      // Logic: Handle Company Code
      let finalCompanyCode = company.companyCode;
      if (finalCompanyCode) {
        const { data } = await internalPost<any>(
          `${config.backendUrl}/internal/onboarding/company/check-code`,
          { code: finalCompanyCode },
        );
        if (data.exists) {
          finalCompanyCode = await CodeGenUtil.generateUniqueCompanyCode(
            company.name,
          );
        }
      } else {
        finalCompanyCode = await CodeGenUtil.generateUniqueCompanyCode(
          company.name,
        );
      }

      // Logic: Get global access user IDs
      const { data: globalAccessIds } = await internalPost<string[]>(
        `${config.backendUrl}/internal/onboarding/global-access-ids`,
        {},
      );

      // Call Backend to create the record
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/onboarding/company/create`,
        {
          initiatorId,
          companyCode: finalCompanyCode,
          groupCode: finalGroupCode,
          data: {
            group,
            company,
            signatories,
          },
          status: 'pending',
          accessibleBy: globalAccessIds || [],
        },
      );

      if (!ok) {
        throw new AppError(
          data.error || 'Failed to initiate onboarding',
          status,
        );
      }

      res.status(201).json({
        message: 'Onboarding initiated successfully',
        companyCode: finalCompanyCode,
        groupCode: finalGroupCode,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error.errors });
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
      const { id, action, remark } = validatedData;

      if (!approverId) {
        throw new AppError('Unauthorized', 401);
      }

      // 1. Fetch onboarding record
      const { data: onboarding, ok: fetchOk } = await internalPost<any>(
        `${config.backendUrl}/internal/onboarding/company/get`,
        { id },
      );

      if (!fetchOk || !onboarding) {
        throw new AppError('Onboarding request not found', 404);
      }

      // 2. Logic: Validate status
      if (onboarding.status !== 'pending') {
        throw new AppError('Onboarding request already processed', 400);
      }

      // 3. Logic: Verify permissions
      if (!onboarding.accessibleBy.includes(approverId)) {
        throw new AppError(
          'Unauthorized: You do not have permission to process this request',
          403,
        );
      }

      // 4. Handle rejection
      if (action === 'reject') {
        await internalPost(
          `${config.backendUrl}/internal/onboarding/company/update-status`,
          {
            id,
            data: {
              status: 'rejected',
              approverId,
              approvedAt: new Date(),
              approvalRemark: remark,
            },
          },
        );
        return res.status(200).json({ message: 'Onboarding request rejected' });
      }

      // 5. Handle approval (Commit to Backend Transaction)
      const {
        data: commitRes,
        ok: commitOk,
        status: commitStatus,
      } = await internalPost(
        `${config.backendUrl}/internal/onboarding/company/approve-commit`,
        { id, approverId, remark },
      );

      if (!commitOk) {
        throw new AppError(
          commitRes.error || 'Failed to process onboarding approval',
          commitStatus,
        );
      }

      res
        .status(200)
        .json({ message: 'Onboarding request approved and data populated' });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error.errors });
      }
      next(error);
    }
  }
}
