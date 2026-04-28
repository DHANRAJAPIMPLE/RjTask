import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HashUtil } from '../../../shared/utils/hash.util';
import { AccessUtil } from '../../utils/access.util';
import { AppError } from '../../middlewares/error.middleware';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

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
    const { initiatorId, ...onboardingData } = req.body;
    const companyCode = onboardingData.companyCode;

    const onboarding = await prisma.$transaction(async (tx) => {
      const onb = await tx.companyOnboarding.create({
        data: onboardingData,
      });
      if (initiatorId && companyCode) {
        await tx.companyHistory.create({
          data: {
            companyCode,
            event: 'INITIATE',
            eventUserId: initiatorId,
          },
        });

        // Add history for each signatory
        const signatories = (onboardingData.data as any)?.signatories || [];
        for (const sig of signatories) {
          if (sig.email) {
            await tx.userHistory.create({
              data: {
                email: sig.email,
                event: 'INITIATE',
                eventUserId: initiatorId,
              },
            });
          }
        }
      }
      return onb;
    });
    res.status(201).json(onboarding);
  }

  static async createUserOnboarding(req: Request, res: Response) {
    const { initiatorId, ...onboardingData } = req.body;
    const email = onboardingData.data?.basicDetails?.email;

    const onboarding = await prisma.$transaction(async (tx) => {
      const onb = await tx.userOnboarding.create({
        data: onboardingData,
      });
      if (initiatorId && email) {
        await tx.userHistory.create({
          data: {
            email,
            event: 'INITIATE',
            eventUserId: initiatorId,
          },
        });
      }
      return onb;
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

  static async handleCompanyOnboardingStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, action, approverId, remark } = req.body;
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch onboarding
        const onboarding = await tx.companyOnboarding.findUnique({
          where: { id },
        });

        if (!onboarding) {
          throw new AppError('Onboarding request not found', 404);
        }

        if (onboarding.status !== 'pending') {
          throw new AppError('Onboarding request already processed', 400);
        }

        // Optional: permission check (if stored)
        if (
          onboarding.accessibleBy &&
          !onboarding.accessibleBy.includes(approverId)
        ) {
          throw new AppError('Unauthorized to process this request', 403);
        }

        // =========================
        // 🔴 REJECT FLOW
        // =========================
        if (action === 'rejected') {
          await tx.companyOnboarding.update({
            where: { id },
            data: {
              status: 'rejected',
              approvalRemark: remark,
            },
          });

          if (onboarding.companyCode) {
            await tx.companyHistory.create({
              data: {
                companyCode: onboarding.companyCode,
                event: 'REJECT',
                eventUserId: approverId,
              },
            });

            // Add history for each signatory
            const signatories = (onboarding.data as any)?.signatories || [];
            for (const sig of signatories) {
              if (sig.email) {
                await tx.userHistory.create({
                  data: {
                    email: sig.email,
                    event: 'REJECT',
                    eventUserId: approverId,
                  },
                });
              }
            }
          }

          return { message: 'Onboarding rejected successfully' };
        }

        // =========================
        // 🟢 APPROVE FLOW
        // =========================

        const data = onboarding.data as any;
        const { group, company, signatories } = data;

        let groupId = '';

        // 2. Create or fetch group
        if (onboarding.groupCode) {
          let groupObj = await tx.groupCompany.findUnique({
            where: { groupCode: onboarding.groupCode },
          });

          if (!groupObj && group) {
            groupObj = await tx.groupCompany.create({
              data: {
                name: group.name,
                groupCode: onboarding.groupCode,
                status: 'ACTIVE',
                remarks: group.remarks || '',
              },
            });
          }

          if (groupObj) groupId = groupObj.id;
        }

        // 3. Create company
        let newCompany;
        try {
          newCompany = await tx.company.create({
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
              status: 'ACTIVE',
            },
          });
        } catch (error: any) {
          if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'unique field';
            throw new AppError(
              `A company with this ${field} already exists.`,
              400,
            );
          }
          throw error;
        }

        // 4. Map company to group
        if (groupId) {
          await tx.companyMapping.create({
            data: {
              companyId: newCompany.id,
              groupId,
            },
          });
        }

        // 5. Create root org node
        const nodePath = (onboarding.companyCode as string)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();

        const rootNode = await tx.orgStructure.create({
          data: {
            companyId: newCompany.id,
            nodePath,
            nodeName: company.name,
            nodeType: 'ROOT',
            parentId: null,
          },
        });

        // 6. Handle signatories
        for (const sig of signatories) {
          let user = await tx.user.findUnique({
            where: { email: sig.email },
          });

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
              status: 'ACTIVE',
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

          // 6.2 Add User History for signatory approval
          await tx.userHistory.create({
            data: {
              email: sig.email,
              event: 'APPROVE',
              eventUserId: approverId,
            },
          });
        }

        // 7. Update onboarding status
        await tx.companyOnboarding.update({
          where: { id },
          data: {
            status: 'approved',
            approvalRemark: remark,
          },
        });

        // 8. History
        if (onboarding.companyCode) {
          await tx.companyHistory.create({
            data: {
              companyCode: onboarding.companyCode,
              event: 'APPROVE',
              eventUserId: approverId,
            },
          });
        }

        return {
          message: 'Onboarding approved and company created successfully',
          companyId: newCompany.id,
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async handleUserOnboardingStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id, status, approverId, remark } = req.body;

      const onboarding = await prisma.userOnboarding.findUnique({
        where: { id },
      });

      if (!onboarding) {
        throw new AppError('User onboarding request not found', 404);
      }

      const data = onboarding.data as any;
      const { basicDetails, permissions } = data || {};
      const {
        name,
        email,
        phone,
        reportingManager,
        designation,
        employeeId,
      } = basicDetails || {};

      await prisma.$transaction(async (tx) => {
        // =========================
        // ✅ APPROVED FLOW
        // =========================
        if (status === 'approve') {
          const manager = await tx.user.findUnique({
            where: { email: reportingManager },
            include: {
              userMappings: {
                include: { company: true },
              },
            },
          });

          if (!manager) throw new AppError('Manager not found', 404);

          let company;
          if (onboarding.companyCode) {
            company = await tx.company.findUnique({
              where: { companyCode: onboarding.companyCode },
            });
          }

          if (!company && manager.userMappings[0]) {
            company = manager.userMappings[0].company;
          }

          if (!company) throw new AppError('Company not found', 404);

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
              status: 'ACTIVE',
              designation,
              employeeId,
            },
          });

          if (Array.isArray(permissions)) {
            for (const perm of permissions) {
              const { accessType, roleName, nodePath } = perm;

              const role = await tx.roles.findUnique({
                where: { roleName },
              });

              const node = await tx.orgStructure.findUnique({
                where: { nodePath },
              });

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
              approvalRemark: remark,
            },
          });

          if (email && approverId) {
            await tx.userHistory.create({
              data: {
                email,
                event: 'APPROVE',
                eventUserId: approverId,
              },
            });
          }
        }

        // =========================
        // ❌ REJECTED FLOW
        // =========================
        else if (status === 'reject') {
          const updated = await tx.userOnboarding.update({
            where: { id },
            data: {
              status: 'rejected',
              approvalRemark: remark,
            },
          });

          const userEmail = (updated.data as any)?.basicDetails?.email;

          if (approverId && userEmail) {
            await tx.userHistory.create({
              data: {
                email: userEmail,
                event: 'REJECT',
                eventUserId: approverId,
              },
            });
          }
        }

        // =========================
        // ⚠️ INVALID STATUS
        // =========================
        else {
          throw new AppError('Invalid status', 400);
        }
      });

      res.status(200).json({
        message: `User onboarding ${status}d successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}
