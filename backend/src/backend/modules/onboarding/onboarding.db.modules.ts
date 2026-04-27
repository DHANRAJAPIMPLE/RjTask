import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HashUtil } from '../../../shared/utils/hash.util';
import { AccessUtil } from '../../utils/access.util';

export class OnboardingDbController {
  // --- Internal Atomic Operations ---

  static async checkCompanyCode(req: Request, res: Response) {
    const { code } = req.body;
    const existingInMaster = await prisma.company.findUnique({
      where: { companyCode: code },
    });
    const existingInOnboarding = await prisma.companyOnboarding.findUnique({
      where: { companyCode: code },
    });
    res.json({ exists: !!existingInMaster || !!existingInOnboarding });
  }

  static async checkGroupCode(req: Request, res: Response) {
    const { code } = req.body;
    const existing = await prisma.groupCompany.findUnique({
      where: { groupCode: code },
    });
    res.json({ exists: !!existing });
  }

  static async getManagerInfo(req: Request, res: Response) {
    const { email } = req.body;
    const manager = await prisma.user.findUnique({
      where: { email },
      include: {
        userMappings: {
          include: {
            company: {
              include: {
                companyMappings: {
                  include: { group: true },
                },
              },
            },
          },
        },
      },
    });
    res.json(manager);
  }

  static async getUserByEmail(req: Request, res: Response) {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    res.json(user);
  }

  static async getGlobalAccessUserIds(req: Request, res: Response) {
    const userIds = await AccessUtil.getGlobalAccessUserIds();
    res.json(userIds);
  }

  // --- Create Operations ---

  static async createCompanyOnboarding(req: Request, res: Response) {
    const onboarding = await prisma.companyOnboarding.create({
      data: req.body,
    });
    res.status(201).json(onboarding);
  }

  static async createUserOnboarding(req: Request, res: Response) {
    const onboarding = await prisma.userOnboarding.create({
      data: req.body,
    });
    res.status(201).json(onboarding);
  }

  // --- Get Operations ---

  static async getCompanyOnboardingById(req: Request, res: Response) {
    const { id } = req.body;
    const onboarding = await prisma.companyOnboarding.findUnique({
      where: { id },
    });
    res.json(onboarding);
  }

  static async getUserOnboardingById(req: Request, res: Response) {
    const { id } = req.body;
    const onboarding = await prisma.userOnboarding.findUnique({
      where: { id },
    });
    res.json(onboarding);
  }

  // --- Status Update Operations ---

  static async updateCompanyOnboardingStatus(req: Request, res: Response) {
    const { id, data } = req.body;
    const updated = await prisma.companyOnboarding.update({
      where: { id },
      data,
    });
    res.json(updated);
  }

  static async updateUserOnboardingStatus(req: Request, res: Response) {
    const { id, data } = req.body;
    const updated = await prisma.userOnboarding.update({
      where: { id },
      data,
    });
    res.json(updated);
  }

  // --- Transactional Commit Operations (Keep as atomic transactions) ---

  static async approveCompanyOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, approverId, remark } = req.body;

      const onboarding = await prisma.companyOnboarding.findUnique({
        where: { id },
      });

      if (!onboarding) throw new Error('Onboarding request not found');

      const data = onboarding.data as any;
      const { group, company, signatories } = data;
      const groupCode = onboarding.groupCode;

      await prisma.$transaction(async (tx) => {
        let groupId = '';

        if (groupCode) {
          let groupObj = await tx.groupCompany.findUnique({
            where: { groupCode },
          });
          if (!groupObj && group) {
            groupObj = await tx.groupCompany.create({
              data: {
                name: group.name,
                groupCode: groupCode,
                remarks: group.remarks || '',
              },
            });
          }
          if (groupObj) groupId = groupObj.id;
        }

        const newCompany = await tx.company.create({
          data: {
            legalName: company.name,
            gstNumber: company.gst,
            address: company.address,
            brandName: company.brand,
            iecode: company.ieCode,
            companyCode: onboarding.companyCode as string,
            registrationDate: company.registeredAt
              ? new Date(company.registeredAt)
              : new Date(),
          },
        });

        if (groupId) {
          await tx.companyMapping.create({
            data: {
              companyId: newCompany.id,
              groupId: groupId,
            },
          });
        }

        const nodePath = (onboarding.companyCode as string)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();
        const rootNode = await tx.orgStructure.create({
          data: {
            companyId: newCompany.id,
            nodePath: nodePath,
            nodeName: company.name,
            nodeType: 'ROOT',
            parentId: null,
          },
        });

        for (const sig of signatories) {
          let user = await tx.user.findUnique({ where: { email: sig.email } });

          if (!user) {
            const defaultPassword = await HashUtil.hash('Welcome@123');
            user = await tx.user.create({
              data: {
                email: sig.email,
                name: sig.name,
                phone: sig.phone,
                password: defaultPassword,
              },
            });
          }

          await tx.userMapping.create({
            data: {
              userId: user.id,
              companyId: newCompany.id,
              status: 'active',
              designation: sig.designation,
              employeeId: sig.employeeId || '',
            },
          });

          await tx.userAccess.create({
            data: {
              userId: user.id,
              roleCode: null,
              nodeId: rootNode.id,
              accessType: null,
              companyId: newCompany.id,
              isGlobalAccess: true,
            },
          });
        }

        await tx.companyOnboarding.update({
          where: { id },
          data: {
            status: 'approved',
            approverId,
            approvedAt: new Date(),
            approvalRemark: remark,
          },
        });
      });

      res.status(200).json({ message: 'Onboarding approved' });
    } catch (error) {
      next(error);
    }
  }

  static async approveUserOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, approverId, remark } = req.body;

      const onboarding = await prisma.userOnboarding.findUnique({
        where: { id },
      });

      if (!onboarding) throw new Error('User onboarding request not found');

      const data = onboarding.data as any;
      const { basicDetails, permissions } = data;
      const { name, email, phone, reportingManager, designation, employeeId } =
        basicDetails;

      await prisma.$transaction(async (tx) => {
        const manager = await tx.user.findUnique({
          where: { email: reportingManager },
          include: {
            userMappings: {
              include: { company: true },
            },
          },
        });
        if (!manager) throw new Error('Manager not found');

        let company;
        if (onboarding.companyCode) {
          company = await tx.company.findUnique({
            where: { companyCode: onboarding.companyCode },
          });
        }

        if (!company && manager.userMappings[0]) {
          company = manager.userMappings[0].company;
        }

        if (!company) throw new Error('Company not found');

        let user = await tx.user.findUnique({ where: { email } });
        if (!user) {
          const defaultPassword = await HashUtil.hash('Welcome@123');
          user = await tx.user.create({
            data: {
              email,
              name,
              phone,
              password: defaultPassword,
            },
          });
        }

        await tx.userMapping.create({
          data: {
            userId: user.id,
            companyId: company.id,
            reportingManager: manager.id,
            status: 'active',
            designation: designation,
            employeeId: employeeId,
          },
        });

        if (Array.isArray(permissions)) {
          for (const perm of permissions) {
            const { accessType, roleName, nodePath } = perm;
            const role = await tx.roles.findUnique({ where: { roleName } });
            const node = await tx.orgStructure.findUnique({ where: { nodePath } });

            if (role && node) {
              await tx.userAccess.create({
                data: {
                  userId: user.id,
                  roleCode: role.roleCode,
                  nodeId: node.id,
                  accessType,
                  companyId: company.id,
                  isGlobalAccess: false,
                },
              });
            }
          }
        }

        await tx.userOnboarding.update({
          where: { id },
          data: {
            status: 'approved',
            approverId,
            approvedAt: new Date(),
            approvalRemark: remark,
          },
        });
      });

      res.status(200).json({ message: 'User onboarded' });
    } catch (error) {
      next(error);
    }
  }
}
