import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class CompanyDbController {
  private static formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day},${month},${year}`;
  }

  static async getMyCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;

      const userMappings = await prisma.user_mapping.findMany({
        where: { user_id: userId },
        include: {
          company: {
            select: {
              company_code: true,
              brand_name: true,
            },
          },
        },
      });

      const companies = userMappings.map((m) => ({
        company_code: m.company.company_code,
        brand_name: m.company.brand_name,
      }));

      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }

  static async getGroupCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Fetch groups and their companies
      const groups = await prisma.group_company.findMany({
        include: {
          company_mappings: {
            include: {
              company: true,
            },
          },
        },
      });

      // 2. Fetch companies NOT in any group
      const allCompanies = await prisma.company.findMany({
        include: {
          company_mappings: true
        }
      });
      const soloCompanies = allCompanies.filter(c => c.company_mappings.length === 0);

      // 3. Fetch pending onboarding records
      const pendingOnboardings = await prisma.company_onboarding.findMany({
        where: { status: 'pending' }
      });

      const result: any[] = [];

      // Add grouped companies
      groups.forEach((g) => {
        result.push({
          group_name: g.name,
          group_code: g.group_code,
          companies: g.company_mappings.map((cm) => ({
            legal_name: cm.company.legal_name,
            gst: cm.company.gst_number,
            iecode: cm.company.iecode,
            register_date: CompanyDbController.formatDate(cm.company.registration_date),
            address: cm.company.address,
            company_code: cm.company.company_code,
            brand_name: cm.company.brand_name,
          })),
        });
      });

      // Add solo companies (group_name: null, group_code: null)
      soloCompanies.forEach((c) => {
        result.push({
          group_name: null,
          group_code: null,
          companies: {
            legal_name: c.legal_name,
            gst: c.gst_number,
            iecode: c.iecode,
            register_date: CompanyDbController.formatDate(c.registration_date),
            address: c.address,
            company_code: c.company_code,
            brand_name: c.brand_name,
          }
        });
      });

      // Add pending onboardings
      pendingOnboardings.forEach((onb) => {
        const data = onb.data as any;
        const comp = data.companies || {};
        result.push({
          group_name: data.group_name || null,
          group_code: onb.group_code || null,
          status: 'pending',
          companies: {
            legal_name: comp.legal_name,
            gst: comp.gst,
            iecode: comp.iecode,
            register_date: CompanyDbController.formatDate(comp.register_date || new Date()), // Use current date if not set in JSON
            address: comp.address,
            company_code: onb.company_code,
            brand_name: comp.brandname || comp.brand_name,
          }
        });
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
