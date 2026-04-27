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

      // 2. Apply formatting and business logic in Middle Layer
      const responseBody = {
        message: 'Companies fetched successfully!',
        companies: {
          active: groups.map((g: any) => ({
            groupDetails: {
              groupCode: g.groupCode,
              groupName: g.name,
            },
            companyDetails: g.companyMappings.map((cm: any) => ({
              companyCode: cm.company.companyCode,
              name: cm.company.legalName,
              gst: cm.company.gstNumber,
              brand: cm.company.brandName,
              ieCode: cm.company.iecode || '',
              registration: AdminController.formatDate(
                cm.company.registrationDate,
              ),
              address: cm.company.address || '',
            })),
          })),
          pending: [] as Record<string, unknown>[],
          inactive: [
            {
              groupDetails: {
                groupCode: '',
                groupName: '',
              },
              companyDetails: soloCompanies.map((c: any) => ({
                companyCode: c.companyCode,
                name: c.legalName,
                gst: c.gstNumber,
                brand: c.brandName,
                ieCode: c.iecode || '',
                registration: AdminController.formatDate(c.registrationDate),
                address: c.address || '',
              })),
            },
          ],
        },
      };

      // Group pending onboardings by groupCode
      const pendingGroups: Record<string, Record<string, unknown>> = {};
      pendingOnboardings.forEach((onb: any) => {
        const onbData = onb.data as {
          group?: { name?: string };
          company?: {
            name?: string;
            gst?: string;
            brand?: string;
            ieCode?: string;
            registeredAt?: string | Date;
            address?: string;
          };
        };
        const group = onbData?.group || {};
        const company = onbData?.company || {};
        const groupCode = onb.groupCode || 'PENDING_SOLO';

        if (!pendingGroups[groupCode]) {
          pendingGroups[groupCode] = {
            groupDetails: {
              groupCode: onb.groupCode || '',
              groupName: group.name || 'Pending Group',
            },
            companyDetails: [],
          };
        }

        const details = pendingGroups[groupCode].companyDetails as Record<
          string,
          unknown
        >[];

        details.push({
          id: onb.id,
          companyCode: onb.companyCode,
          name: company.name || '',
          gst: company.gst || '',
          brand: company.brand || '',
          ieCode: company.ieCode || '',
          registration: company.registeredAt
            ? AdminController.formatDate(company.registeredAt)
            : '',
          address: company.address || '',
        });
      });

      responseBody.companies.pending = Object.values(pendingGroups);

      res.status(200).json(responseBody);
    } catch (error) {
      next(error);
    }
  }
}
