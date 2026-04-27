import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class CompanyDbController {
  // private static formatDate(date: Date | string): string {
  //   const d = new Date(date);
  //   const day = String(d.getDate()).padStart(2, '0');
  //   const month = String(d.getMonth() + 1).padStart(2, '0');
  //   const year = d.getFullYear();
  //   return `${day}-${month}-${year}`;
  // }

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
              company: true,
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
      });

      // 3. Fetch pending onboarding records
      const pendingOnboardings = await prisma.companyOnboarding.findMany({
        where: { status: 'pending' },
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
