import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HashUtil } from '../../../shared/utils/hash.util';

export class OnboardingDbController {
  private static normalizeCodeNamePart(value: string): string {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return normalized.slice(0, 8).padEnd(8, "X");
  }

  private static formatCodeDatePart(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}${month}${year}`;
  }

  private static async generateUniqueCompanyCode(companyName: string): Promise<string> {
    const namePart = this.normalizeCodeNamePart(companyName);
    const datePart = this.formatCodeDatePart(new Date());
    let baseCode = `${namePart}${datePart}`;
    let code = baseCode;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.company.findUnique({ where: { company_code: code } });
      const existingOnboarding = await prisma.company_onboarding.findUnique({ where: { company_code: code } });
      if (!existing && !existingOnboarding) {
        isUnique = true;
      } else {
        code = `${baseCode}${counter}`;
        counter++;
      }
    }
    return code;
  }

  private static async generateUniqueGroupCode(groupName: string): Promise<string> {
    const namePart = this.normalizeCodeNamePart(groupName);
    const datePart = this.formatCodeDatePart(new Date());
    let baseCode = `${namePart}${datePart}`;
    let code = baseCode;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.group_company.findUnique({ where: { group_code: code } });
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
      const { group_name, group_code: providedGroupCode, remarks_code, companies, signatories, initiator_id } = req.body;

      // Validation logic for group_code as per request
      let finalGroupCode = providedGroupCode;
      if (!finalGroupCode && group_name) {
        finalGroupCode = await OnboardingDbController.generateUniqueGroupCode(group_name);
      } else if (!finalGroupCode && !group_name) {
        finalGroupCode = undefined; // Will be stored as null in DB if field allows
      }

      // Generate unique company code
      const companyCode = await OnboardingDbController.generateUniqueCompanyCode(companies.legal_name);

      const onboarding = await prisma.company_onboarding.create({
        data: {
          initiator_id,
          company_code: companyCode,
          group_code: finalGroupCode,
          data: {
            group_name,
            remarks_code,
            companies,
            signatories
          },
          status: 'pending'
        }
      });

      res.status(201).json({
        message: 'Onboarding initiated successfully',
        onboarding_id: onboarding.id,
        company_code: companyCode,
        group_code: finalGroupCode
      });
    } catch (error) {
      next(error);
    }
  }

  static async action(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action, remark, approver_id } = req.body;

      const onboarding = await prisma.company_onboarding.findUnique({
        where: { id }
      });

      if (!onboarding) {
        return res.status(404).json({ error: 'Onboarding request not found' });
      }

      if (onboarding.status !== 'pending') {
        return res.status(400).json({ error: 'Onboarding request already processed' });
      }

      if (action === 'reject') {
        await prisma.company_onboarding.update({
          where: { id },
          data: {
            status: 'rejected',
            approver_id,
            approved_at: new Date(),
            approval_remark: remark
          }
        });
        return res.status(200).json({ message: 'Onboarding request rejected' });
      }

      // APPROVE LOGIC
      const data = onboarding.data as any;
      const { companies, signatories, group_name } = data;
      const group_code = onboarding.group_code;

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        let groupId = '';

        // 1. Handle Group
        if (group_code) {
          let group = await tx.group_company.findUnique({ where: { group_code } });
          if (!group && group_name) {
            group = await tx.group_company.create({
              data: {
                name: group_name,
                group_code: group_code,
                remarks: data.remarks_code
              }
            });
          }
          if (group) groupId = group.id;
        }

        // 2. Create Company
        const company = await tx.company.create({
          data: {
            legal_name: companies.legal_name,
            gst_number: companies.gst,
            address: companies.address,
            brand_name: companies.brandname,
            iecode: companies.iecode,
            company_code: onboarding.company_code,
          }
        });

        // 3. Map Company to Group (if group exists)
        if (groupId) {
          await tx.company_mapping.create({
            data: {
              company_id: company.id,
              group_id: groupId
            }
          });
        }

        // 4. Create Signatories (Users) and Mappings
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
                password: defaultPassword
              }
            });
          }

          // Create User Mapping
          await tx.user_mapping.create({
            data: {
              user_id: user.id,
              company_id: company.id,
              status: 'active',
              designation: sig.designation,
              employee_id: sig.employeeId || '',
            }
          });
        }

        // 5. Update Onboarding Status
        await tx.company_onboarding.update({
          where: { id },
          data: {
            status: 'approved',
            approver_id,
            approved_at: new Date(),
            approval_remark: remark
          }
        });
      });

      res.status(200).json({ message: 'Onboarding request approved and data populated' });
    } catch (error) {
      next(error);
    }
  }

  static async initiateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, reporting_manager_email, designations, employee_Id, initiator_id } = req.body;

      // 1. Validate reporting manager exists
      const manager = await prisma.user.findUnique({ where: { email: reporting_manager_email } });
      if (!manager) {
        return res.status(400).json({ error: 'Reporting manager email not found' });
      }

      // 2. Check if user already exists in master table
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists in master table' });
      }

      // 3. Get initiator's company and group info
      const initiatorMapping = await prisma.user_mapping.findFirst({
        where: { user_id: initiator_id },
        include: {
          company: {
            include: {
              company_mappings: {
                include: {
                  group: true
                }
              }
            }
          }
        }
      });

      const companyCode = initiatorMapping?.company.company_code;
      const groupCode = initiatorMapping?.company.company_mappings[0]?.group.group_code;

      const onboarding = await prisma.user_onboarding.create({
        data: {
          initiator_id,
          company_code: companyCode,
          group_code: groupCode,
          data: {
            name,
            email,
            phone,
            reporting_manager_email,
            designations,
            employee_Id
          },
          status: 'pending'
        }
      });

      res.status(201).json({
        message: 'User onboarding initiated successfully',
        onboarding_id: onboarding.id
      });
    } catch (error) {
      next(error);
    }
  }

  static async actionUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, action, remark, approver_id } = req.body;

      const onboarding = await prisma.user_onboarding.findUnique({
        where: { id }
      });

      if (!onboarding) {
        return res.status(404).json({ error: 'User onboarding request not found' });
      }

      if (onboarding.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
      }

      if (action === 'reject') {
        await prisma.user_onboarding.update({
          where: { id },
          data: {
            status: 'rejected',
            approver_id,
            approved_at: new Date(),
            approval_remark: remark
          }
        });
        return res.status(200).json({ message: 'User onboarding rejected' });
      }

      // APPROVE LOGIC
      const data = onboarding.data as any;
      const { name, email, phone, reporting_manager_email, designations, employee_Id } = data;

      await prisma.$transaction(async (tx) => {
        // 1. Get Manager ID
        const manager = await tx.user.findUnique({ where: { email: reporting_manager_email } });
        if (!manager) throw new Error('Manager not found');

        // 2. Get Company ID from code
        const company = await tx.company.findUnique({ where: { company_code: onboarding.company_code || '' } });
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
              password: defaultPassword
            }
          });
        }

        // 4. Create User Mapping
        await tx.user_mapping.create({
          data: {
            user_id: user.id,
            company_id: company.id,
            reporting_manager: manager.id,
            status: 'active',
            designation: designations,
            employee_id: employee_Id,
          }
        });

        // 5. Update Onboarding
        await tx.user_onboarding.update({
          where: { id },
          data: {
            status: 'approved',
            approver_id,
            approved_at: new Date(),
            approval_remark: remark
          }
        });
      });

      res.status(200).json({ message: 'User approved and onboarded' });
    } catch (error) {
      next(error);
    }
  }
}
