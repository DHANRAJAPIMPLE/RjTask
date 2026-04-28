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
        users,
        pendingOnboardings,
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
