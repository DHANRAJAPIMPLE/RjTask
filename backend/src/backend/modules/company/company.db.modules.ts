import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class CompanyDbController {

  static async getMyCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;

      const userMappings = await prisma.userMapping.findMany({
        where: { userId: userId },
        include: {
          company: true,
        },
      });

      res.status(200).json(userMappings);
    } catch (error) {
      next(error);
    }
  }

  static async getGroupCompanies(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // 1. Fetch groups and their companies (Active)
      const groups = await prisma.groupCompany.findMany({
  include: {
    companyMappings: {
      include: {
        company: {
          include: {
            userMappings: {
              include: {
                user: {
                  include: {
                    userAccesses: {
                      where: {
                        isGlobalAccess: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
      // 2. Fetch companies NOT in any group (Solo)
      const soloCompanies = await prisma.company.findMany({
        where: {
          companyMappings: {
            none: {},
          },
        },
        include: {
            userMappings: {
              include: {
                user: {
                  include: {
                    userAccesses: {
                      where: {
                        isGlobalAccess: true,
                      },
                    },
                  },
                },
              },
            },
          },
      });

      // 3. Fetch pending onboarding records
      const pendingOnboardings = await prisma.companyOnboarding.findMany({
        where: { status: 'pending' },
        include: {
          initiator: {
            select: { name: true, email: true },
          },
          approver: {
            select: { name: true, email: true },
          },
        },
      });

      res.status(200).json({
        groups,
        soloCompanies,
        pendingOnboardings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCompanyByCode(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { companyCode } = req.body;
      const company = await prisma.company.findUnique({
        where: { companyCode },
      });
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
}
