import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class UserDbController {
  static async fetchAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic: Fetch all users with their related mappings, company, and access details
      const users = await prisma.user.findMany({
        include: {
          userMappings: {
            include: {
              company: {
                select: {
                  brandName: true,
                  companyCode: true,
                },
              },
              manager: {
                select: {
                  name: true,
                  email: true,
                },
              },
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

      // Helper to format date as DD-MM-YYYY
      const formatDate = (date: Date | null) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const result = {
        activeUsers: [] as any[],
        pendingUsers: [] as any[],
        inactiveUsers: [] as any[],
      };

      users.forEach((u) => {
        // If user has no mapping, treat as inactive with all their accesses (if any)
        if (u.userMappings.length === 0) {
          const primaryRoles = u.userAccesses
            .filter((a) => a.accessType === 'PRIMARY')
            .map((a) => ({
              roleCategory: a.role?.category || 'N/A',
              roleSubCategory: a.role?.subCategory || 'N/A',
              roleName: a.role?.roleName || 'N/A',
              nodeName: a.orgStructure?.nodeName || 'N/A',
              nodePath: a.orgStructure?.nodePath || 'N/A',
              accessType: 'PRIMARY',
            }));

          const secondaryRoles = u.userAccesses
            .filter((a) => a.accessType === 'SECONDARY')
            .map((a) => ({
              roleCategory: a.role?.category || 'N/A',
              roleSubCategory: a.role?.subCategory || 'N/A',
              roleName: a.role?.roleName || 'N/A',
              nodeName: a.orgStructure?.nodeName || 'N/A',
              nodePath: a.orgStructure?.nodePath || 'N/A',
              accessType: 'SECONDARY',
            }));

          result.inactiveUsers.push({
            uuid: u.id,
            basicDetails: {
              name: u.name,
              email: u.email,
              phone: u.phone,
              companyOnboardingDate: formatDate(u.createdAt),
              designation: 'N/A',
              reportingManager: 'N/A',
            },
            primary: primaryRoles,
            secondary: secondaryRoles,
          });
        } else {
          u.userMappings.forEach((m) => {
            // Filter accesses by companyId of the mapping
            const companyAccesses = u.userAccesses.filter(
              (a) => a.companyId === m.companyId,
            );

            const primaryRoles = companyAccesses
              .filter((a) => a.accessType === 'PRIMARY')
              .map((a) => ({
                roleCategory: a.role?.category || 'N/A',
                roleSubCategory: a.role?.subCategory || 'N/A',
                roleName: a.role?.roleName || 'N/A',
                nodeName: a.orgStructure?.nodeName || 'N/A',
                nodePath: a.orgStructure?.nodePath || 'N/A',
                accessType: 'PRIMARY',
              }));

            const secondaryRoles = companyAccesses
              .filter((a) => a.accessType === 'SECONDARY')
              .map((a) => ({
                roleCategory: a.role?.category || 'N/A',
                roleSubCategory: a.role?.subCategory || 'N/A',
                roleName: a.role?.roleName || 'N/A',
                nodeName: a.orgStructure?.nodeName || 'N/A',
                nodePath: a.orgStructure?.nodePath || 'N/A',
                accessType: 'SECONDARY',
              }));

            const userData = {
              uuid: u.id,
              basicDetails: {
                name: u.name,
                email: u.email,
                phone: u.phone,
                companyOnboardingDate: formatDate(m.createdAt),
                designation: m.designation,
                reportingManager: m.manager?.email || 'N/A',
              },
              primary: primaryRoles,
              secondary: secondaryRoles,
            };

            if (m.status === 'active') {
              result.activeUsers.push(userData);
            } else {
              result.inactiveUsers.push(userData);
            }
          });
        }
      });

      // Logic: Fetch pending user onboardings
      const pendingOnboardings = await prisma.userOnboarding.findMany({
        where: { status: 'pending' },
      });

      pendingOnboardings.forEach((onb) => {
        const data = onb.data as any;
        const basic = data?.basicDetails || {};
        const permissions = data?.permissions || [];

        const primary = permissions
          .filter((p: any) => p.accessType === 'PRIMARY')
          .map((p: any) => ({
            roleCategory: p.roleCategory || 'N/A',
            roleSubCategory: p.roleSubCategory || 'N/A',
            roleName: p.roleName || 'N/A',
            nodeName: p.nodeName || 'N/A',
            nodePath: p.nodePath || 'N/A',
            accessType: 'PRIMARY',
          }));

        const secondary = permissions
          .filter((p: any) => p.accessType === 'SECONDARY')
          .map((p: any) => ({
            roleCategory: p.roleCategory || 'N/A',
            roleSubCategory: p.roleSubCategory || 'N/A',
            roleName: p.roleName || 'N/A',
            nodeName: p.nodeName || 'N/A',
            nodePath: p.nodePath || 'N/A',
            accessType: 'SECONDARY',
          }));

        result.pendingUsers.push({
          uuid: onb.id,
          basicDetails: {
            name: basic.name || 'N/A',
            email: basic.email || 'N/A',
            phone: basic.phone || 'N/A',
            companyOnboardingDate: formatDate(onb.createdAt),
            designation: basic.designation || 'N/A',
            reportingManager: basic.reportingManager || 'N/A',
          },
          primary,
          secondary,
        });
      });

      res.status(200).json({
        message: 'Users fetched successfully!',
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
