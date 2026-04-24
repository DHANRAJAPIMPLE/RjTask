import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HashUtil } from '../../../shared/utils/hash.util';

export class OnboardingDbController {
  private static normalizeCodeNamePart(value: string): string {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.slice(0, 8).padEnd(8, 'X');
  }

  private static formatCodeDatePart(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}${month}${year}`;
  }

  private static async generateUniqueCompanyCode(
    companyName: string,
  ): Promise<string> {
    const namePart = this.normalizeCodeNamePart(companyName);
    const datePart = this.formatCodeDatePart(new Date());
    const baseCode = `${namePart}${datePart}`;
    let code = baseCode;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.company.findUnique({
        where: { companyCode: code },
      });
      const existingOnboarding = await prisma.companyOnboarding.findUnique({
        where: { companyCode: code },
      });
      if (!existing && !existingOnboarding) {
        isUnique = true;
      } else {
        code = `${baseCode}${counter}`;
        counter++;
      }
    }
    return code;
  }

  private static async generateUniqueGroupCode(
    groupName: string,
  ): Promise<string> {
    const namePart = this.normalizeCodeNamePart(groupName);
    const datePart = this.formatCodeDatePart(new Date());
    const baseCode = `${namePart}${datePart}`;
    let code = baseCode;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.groupCompany.findUnique({
        where: { groupCode: code },
      });
      if (!existing) {
        isUnique = true;
      } else {
        code = `${baseCode}${counter}`;
        counter++;
      }
    }
    return code;
  }

  static async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { group, company, signatories, initiatorId } = req.body;

      // 1. Handle Group Code
      let finalGroupCode = group.groupCode;
      if (!finalGroupCode && group.name) {
        finalGroupCode = await OnboardingDbController.generateUniqueGroupCode(
          group.name,
        );
      }

      // 2. Handle Company Code
      let finalCompanyCode = company.companyCode;
      // Check if provided code already exists in master or pending onboarding
      if (finalCompanyCode) {
        const existingInMaster = await prisma.company.findUnique({
          where: { companyCode: finalCompanyCode },
        });
        const existingInOnboarding = await prisma.companyOnboarding.findUnique({
          where: { companyCode: finalCompanyCode },
        });

        if (existingInMaster || existingInOnboarding) {
          // If it exists, generate a new unique one to avoid conflicts
          finalCompanyCode =
            await OnboardingDbController.generateUniqueCompanyCode(
              company.name,
            );
        }
      } else {
        // No code provided, generate one
        finalCompanyCode =
          await OnboardingDbController.generateUniqueCompanyCode(company.name);
      }

      await prisma.companyOnboarding.create({
        data: {
          initiatorId,
          companyCode: finalCompanyCode,
          groupCode: finalGroupCode,
          data: {
            group,
            company,
            signatories,
          },
          status: 'pending',
        },
      });

      res.status(201).json({
        message: 'Onboarding initiated successfully',
        companyCode: finalCompanyCode,
        groupCode: finalGroupCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async action(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action, remark, approverId } = req.body;

      const onboarding = await prisma.companyOnboarding.findUnique({
        where: { id },
      });

      if (!onboarding) {
        return res.status(404).json({ error: 'Onboarding request not found' });
      }

      if (onboarding.status !== 'pending') {
        return res
          .status(400)
          .json({ error: 'Onboarding request already processed' });
      }

      if (action === 'reject') {
        await prisma.companyOnboarding.update({
          where: { id },
          data: {
            status: 'rejected',
            approverId,
            approvedAt: new Date(),
            approvalRemark: remark,
          },
        });
        return res.status(200).json({ message: 'Onboarding request rejected' });
      }

      // APPROVE LOGIC
      const data = onboarding.data as {
        group: { name: string; remarks?: string };
        company: {
          name: string;
          gst: string;
          address: string;
          brand: string;
          ieCode: string;
          registeredAt?: string | Date;
        };
        signatories: {
          email: string;
          name: string;
          phone: string;
          designation: string;
          employeeId?: string;
        }[];
      };
      const { group, company, signatories } = data;
      const groupCode = onboarding.groupCode;

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        let groupId = '';

        // 1. Handle Group
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

        // 2. Create Company
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

        // 3. Map Company to Group (if group exists)
        if (groupId) {
          await tx.companyMapping.create({
            data: {
              companyId: newCompany.id,
              groupId: groupId,
            },
          });
        }

        // 4. Create Root Org Structure Node
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

        // 5. Create Signatories (Users), Mappings, and Access
        for (const sig of signatories) {
          let user = await tx.user.findUnique({ where: { email: sig.email } });

          if (!user) {
            // Create a default password for new users (they should reset it)
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

          // Create User Mapping
          await tx.userMapping.create({
            data: {
              userId: user.id,
              companyId: newCompany.id,
              status: 'active',
              designation: sig.designation,
              employeeId: sig.employeeId || '',
            },
          });

          // Create User Access (Permissions) - Set as Global for Company Signatories
          await tx.userAccess.create({
            data: {
              userId: user.id,
              roleCode: null, // Default role for initial company users
              nodeId: rootNode.id,
              accessType: null,
              companyId: newCompany.id,
              isGlobalAccess: true,
            },
          });
        }

        // 6. Update Onboarding Status
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

      res
        .status(200)
        .json({ message: 'Onboarding request approved and data populated' });
    } catch (error) {
      next(error);
    }
  }

  static async initiateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { basicDetails, permissions, initiatorId } = req.body;
      const { email, reportingManager } = basicDetails;

      // 1. Validate reporting manager exists and get their company info
      const manager = await prisma.user.findUnique({
        where: { email: reportingManager },
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

      if (!manager) {
        return res
          .status(400)
          .json({ error: 'Reporting manager email not found' });
      }

      // 2. Check if user already exists in master table
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: 'User already exists in master table' });
      }

      // 3. Determine Company and Group Code
      let companyCode: string | undefined;
      let groupCode: string | undefined;

      // Priority 1: Use manager's company/group
      const managerMapping = manager.userMappings[0];
      if (managerMapping && managerMapping.company) {
        companyCode = managerMapping.company.companyCode;
        // Check if company has mappings to get group code
        const compMapping = managerMapping.company.companyMappings?.[0];
        if (compMapping && compMapping.group) {
          groupCode = compMapping.group.groupCode;
        }
      }

      // Priority 2: If manager mapping not found, use initiator's company/group
      if (!companyCode) {
        const initiatorMapping = await prisma.userMapping.findFirst({
          where: { userId: initiatorId },
          include: {
            company: {
              include: {
                companyMappings: {
                  include: { group: true },
                },
              },
            },
          },
        });

        if (initiatorMapping && initiatorMapping.company) {
          companyCode = initiatorMapping.company.companyCode;
          const compMapping = initiatorMapping.company.companyMappings?.[0];
          if (compMapping && compMapping.group) {
            groupCode = compMapping.group.groupCode;
          }
        }
      }

      await prisma.userOnboarding.create({
        data: {
          initiatorId,
          companyCode: companyCode,
          groupCode: groupCode,
          data: {
            basicDetails,
            permissions,
          },
          status: 'pending',
        },
      });

      res.status(201).json({
        message: 'User onboarding initiated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async actionUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action, remark, approverId } = req.body;

      const onboarding = await prisma.userOnboarding.findUnique({
        where: { id },
      });

      if (!onboarding) {
        return res
          .status(404)
          .json({ error: 'User onboarding request not found' });
      }

      if (onboarding.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
      }

      if (action === 'reject') {
        await prisma.userOnboarding.update({
          where: { id },
          data: {
            status: 'rejected',
            approverId,
            approvedAt: new Date(),
            approvalRemark: remark,
          },
        });
        return res.status(200).json({ message: 'User onboarding rejected' });
      }

      // APPROVE LOGIC
      const data = onboarding.data as {
        basicDetails: {
          name: string;
          email: string;
          phone: string;
          reportingManager: string;
          designation: string;
          employeeId: string;
        };
        permissions: {
          accessType: string;
          roleName: string;
          nodePath: string;
        }[];
      };
      const { basicDetails, permissions } = data;
      const { name, email, phone, reportingManager, designation, employeeId } =
        basicDetails;

      await prisma.$transaction(async (tx) => {
        // 1. Get Manager ID
        const manager = await tx.user.findUnique({
          where: { email: reportingManager },
          include: {
            userMappings: {
              include: { company: true },
            },
          },
        });
        if (!manager) throw new Error('Manager not found');

        // 2. Get Company ID from code or manager's mapping
        let company;
        if (onboarding.companyCode) {
          company = await tx.company.findUnique({
            where: { companyCode: onboarding.companyCode },
          });
        }

        // Fallback: If companyCode was null in onboarding record, get it from manager
        if (!company && manager.userMappings[0]) {
          company = manager.userMappings[0].company;
        }

        if (!company) throw new Error('Company not found');

        // 3. Create/Update User
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

        // 4. Create User Mapping
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

        // 5. Create User Access (Permissions)
        if (Array.isArray(permissions)) {
          for (const perm of permissions) {
            const { accessType, roleName, nodePath } = perm;

            // Find role by name
            const role = await tx.roles.findUnique({
              where: { roleName: roleName },
            });

            // Find node by path
            const node = await tx.orgStructure.findUnique({
              where: { nodePath: nodePath },
            });

            if (role && node) {
              await tx.userAccess.create({
                data: {
                  userId: user.id,
                  roleCode: role.roleCode,
                  nodeId: node.id,
                  accessType: accessType,
                  companyId: company.id,
                  isGlobalAccess: false,
                },
              });
            } else {
              console.warn(
                `Could not create access for role ${roleName} or node ${nodePath}: Role found: ${!!role}, Node found: ${!!node}`,
              );
            }
          }
        }

        // 6. Update Onboarding
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

      res.status(200).json({ message: 'User approved and onboarded' });
    } catch (error) {
      next(error);
    }
  }
}
