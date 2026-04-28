import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../../shared/middlewares/error.middleware';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';

export class AdminController {
  private static formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  static async getGroupCompanies(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // 1. Fetch raw data from Backend (5001)
      const { data, ok, status } = await internalPost<any>(
        `${config.backendCompanyUrl}/groups`,
      );

      if (!ok) {
        throw new AppError(data.error || 'Failed to fetch groups', status);
      }

      const { groups, soloCompanies, pendingOnboardings } = data;

      const active: any[] = [];
      const inactive: any[] = [];
      const pending: any[] = [];

      // 2. Process Groups
      groups.forEach((g: any) => {
        const groupEntry = {
          groupdetails: {
            groupcode: g.groupCode,
            groupname: g.name,
          },
          comapnydetails: g.companyMappings.map((cm: any) => ({
            companycode: cm.company.companyCode,
            name: cm.company.legalName,
            gst: cm.company.gstNumber,
            brand: cm.company.brandName,
            iecode: cm.company.iecode || '',
            registration: AdminController.formatDate(cm.company.registrationDate),
            address: cm.company.address || '',
          })),
          signatories: [] as any[],
        };

        // Collect unique signatories from all companies in the group
        const signatoryMap = new Map();
        g.companyMappings.forEach((cm: any) => {
          if (cm.company?.userMappings) {
            cm.company.userMappings.forEach((um: any) => {
              if (um.user && !signatoryMap.has(um.user.email)) {
                signatoryMap.set(um.user.email, {
                  name: um.user.name,
                  email: um.user.email,
                  phone: um.user.phone,
                  designation: um.designation,
                  employeeId: um.employeeId,
                });
              }
            });
          }
        });
        groupEntry.signatories = Array.from(signatoryMap.values());

        if (g.status === 'active') {
          active.push(groupEntry);
        } else {
          inactive.push(groupEntry);
        }
      });

      // 3. Process Solo Companies
      soloCompanies.forEach((c: any) => {
        const soloEntry = {
          groupdetails: {
            groupcode: '',
            groupname: '',
          },
          comapnydetails: [
            {
              companycode: c.companyCode,
              name: c.legalName,
              gst: c.gstNumber,
              brand: c.brandName,
              iecode: c.iecode || '',
              registration: AdminController.formatDate(c.registrationDate),
              address: c.address || '',
            },
          ],
          signatories: (c.userMappings || []).map((um: any) => ({
            name: um.user.name,
            email: um.user.email,
            phone: um.user.phone,
            designation: um.designation,
            employeeId: um.employeeId,
          })),
        };

        if (c.status === 'active') {
          active.push(soloEntry);
        } else {
          inactive.push(soloEntry);
        }
      });

      // 4. Process Pending Onboardings
      const pendingGroups: Record<string, any> = {};
      pendingOnboardings.forEach((onb: any) => {
        const onbData = onb.data || {};
        const group = onbData.group || {};
        const company = onbData.company || {};
        const signatories = onbData.signatories || [];
        const groupCode = onb.groupCode || 'SOLO_PENDING';

        if (!pendingGroups[groupCode]) {
          pendingGroups[groupCode] = {
            groupdetails: {
              groupcode: onb.groupCode || '',
              groupname: group.name || 'Pending Group',
            },
            comapnydetails: [],
            signatories: [],
          };
        }

        pendingGroups[groupCode].comapnydetails.push({
          companycode: onb.companyCode,
          name: company.name || '',
          gst: company.gst || '',
          brand: company.brand || '',
          iecode: company.ieCode || '',
          registration: company.registeredAt
            ? AdminController.formatDate(company.registeredAt)
            : '',
          address: company.address || '',
          initiatorName: onb.initiator?.name || 'N/A',
          initiatorEmail: onb.initiator?.email || 'N/A',
          initiatedDate: AdminController.formatDate(onb.createdAt),
          approverName: onb.approver?.name || 'N/A',
          approverEmail: onb.approver?.email || 'N/A',
          approvedDate: onb.approvedAt ? AdminController.formatDate(onb.approvedAt) : 'N/A',
        });

        // Add signatories if not already there
        signatories.forEach((s: any) => {
          if (!pendingGroups[groupCode].signatories.some((existing: any) => existing.email === s.email)) {
            pendingGroups[groupCode].signatories.push({
              name: s.name || '',
              email: s.email || '',
              phone: s.phone || '',
              designation: s.designation || '',
              employeeId: s.employeeId || '',
            });
          }
        });
      });
      pending.push(...Object.values(pendingGroups));

      // 5. Final Response
      res.status(200).json({
        message: 'Companies fetched successfully!',
        companies: {
          active,
          pending,
          inactive,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
