import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class UserDbController {
  static async fetchAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic: Fetch raw users with their related mappings, company, and access details
      const {companyCode} = req.body;
      
      const company = await prisma.company.findUnique({
        where: { companyCode: companyCode },
      });
      if (!company) {
        throw new Error('Company not found');
      }

      const users = await prisma.user.findMany({
        where:{
          userMappings:{
            some:{
              companyId: company.id
            }
          }
        },
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
        // Relation fields were removed
      });

      // Fetch history for these pending onboardings to get initiator/approver
      const pendingEmails = pendingOnboardings.map((onb: any) => (onb.data as any)?.basicDetails?.email).filter(Boolean);
      
      const histories = await prisma.userHistory.findMany({
        where: {
          email: { in: pendingEmails },
        },
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map history info for easy lookup
      const historyMap = new Map();
      histories.forEach((h) => {
        const key = `${h.email}_${h.event}`;
        if (!historyMap.has(key)) {
          historyMap.set(key, h);
        }
      });

      const enhancedPending = pendingOnboardings.map((onb: any) => {
        const email = (onb.data as any)?.basicDetails?.email;
        const init = historyMap.get(`${email}_INITIATE`);
        const approve = historyMap.get(`${email}_APPROVE`);
        return {
          ...onb,
          initiator: init?.user || null,
          approver: approve?.user || null,
        };
      });

      res.status(200).json({
        users,
        pendingOnboardings: enhancedPending,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, status } = req.body;
      await prisma.userMapping.updateMany({
        where: { userId },
        data: { status },
      });
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
