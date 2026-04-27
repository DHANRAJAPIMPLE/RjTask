import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class UserDbController {
  static async fetchAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic: Fetch raw users with their related mappings, company, and access details
      const users = await prisma.user.findMany({
        include: {
          userMappings: {
            include: {
              company: true,
              manager: true,
            },
          },
          userAccesses: {
            include: {
              role: true,
              orgStructure: true,
            },
          },
        },
      });

      // Logic: Fetch raw pending user onboardings
      const pendingOnboardings = await prisma.userOnboarding.findMany({
        where: { status: 'pending' },
      });

      res.status(200).json({
        users,
        pendingOnboardings,
      });
    } catch (error) {
      next(error);
    }
  }
}
