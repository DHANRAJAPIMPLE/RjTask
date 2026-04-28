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
        // Relations were removed
      });

      // 4. Fetch history for active and pending records to get initiator/approver
      const allActiveCompanyCodes = [
        ...groups.flatMap((g: any) => g.companyMappings.map((cm: any) => cm.company.companyCode)),
        ...soloCompanies.map((c: any) => c.companyCode),
      ];
      const allGroupCodes = groups.map((g: any) => g.groupCode);
      const allPendingCodes = pendingOnboardings.map(onb => onb.companyCode);

      const allCodes = [...new Set([...allActiveCompanyCodes, ...allGroupCodes, ...allPendingCodes])];

      const histories = await prisma.companyHistory.findMany({
        where: {
          companyCode: { in: allCodes },
        },
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map history info for easy lookup
      // Key: companyCode_event, Value: user details
      const historyMap = new Map();
      histories.forEach((h) => {
        const key = `${h.companyCode}_${h.event}`;
        if (!historyMap.has(key)) {
          historyMap.set(key, {
            user: h.user,
            createdAt: h.createdAt,
          });
        }
      });

      // 5. Attach history info to groups and companies
      const enhancedGroups = groups.map((g: any) => {
        const initiateHistory = historyMap.get(`${g.groupCode}_INITIATE`);
        const approveHistory = historyMap.get(`${g.groupCode}_APPROVE`);
        
        return {
          ...g,
          initiator: initiateHistory?.user || null,
          approver: approveHistory?.user || null,
          approvedAt: approveHistory?.createdAt || null,
          createdAt: initiateHistory?.createdAt || g.createdAt,
          companyMappings: g.companyMappings.map((cm: any) => {
            const compInit = historyMap.get(`${cm.company.companyCode}_INITIATE`);
            const compApprove = historyMap.get(`${cm.company.companyCode}_APPROVE`);
            return {
              ...cm,
              company: {
                ...cm.company,
                initiator: compInit?.user || initiateHistory?.user || null,
                approver: compApprove?.user || approveHistory?.user || null,
                approvedAt: compApprove?.createdAt || approveHistory?.createdAt || null,
                createdAt: compInit?.createdAt || initiateHistory?.createdAt || cm.company.createdAt,
              },
            };
          }),
        };
      });

      const enhancedSoloCompanies = soloCompanies.map((c: any) => {
        const compInit = historyMap.get(`${c.companyCode}_INITIATE`);
        const compApprove = historyMap.get(`${c.companyCode}_APPROVE`);
        return {
          ...c,
          initiator: compInit?.user || null,
          approver: compApprove?.user || null,
          approvedAt: compApprove?.createdAt || null,
          createdAt: compInit?.createdAt || c.createdAt,
        };
      });

      // Also enhance pendingOnboardings if needed
      const enhancedPending = pendingOnboardings.map((onb: any) => {
        const init = historyMap.get(`${onb.companyCode}_INITIATE`);
        return {
          ...onb,
          initiator: init?.user || null,
        };
      });

      res.status(200).json({
        groups: enhancedGroups,
        soloCompanies: enhancedSoloCompanies,
        pendingOnboardings: enhancedPending,
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
