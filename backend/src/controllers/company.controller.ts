import type { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

const prisma = new PrismaClient();

export class CompanyController {
  /**
   * GET MY COMPANIES LOGIC: Fetches companies linked specifically to the logged-in user.
   * Logic:
   * 1. Extract user ID from the request (injected by auth middleware).
   * 2. DB Logic: Query 'user_mapping' table including the 'company' details.
   * 3. Data Transformation: Filter and map the results to a clean company list format.
   */
  static async getMyCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      // DB Logic: Use Prisma to find all mappings for this user and include the related company fields
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

      // Data Logic: Transform the flat DB list into a simple array of company objects
      const companies = userMappings.map((m) => ({
        company_code: m.company.company_code,
        brand_name: m.company.brand_name,
      }));

      // Response: Send the mapped list to the frontend
      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET GROUP COMPANIES LOGIC: Fetches all cluster groups and their child companies.
   * Logic:
   * 1. DB Logic: Query 'group_company' table.
   * 2. Relationship Loading: Deeply include company mappings and the company records themselves.
   * 3. Nesting Logic: Manually restructure the flat DB joins into a nested JSON tree.
   */
  static async getGroupCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // DB Logic: Fetch all group companies and their company mappings in one go
      const groups = await prisma.group_company.findMany({
        include: {
          company_mappings: {
            include: {
              company: {
                select: {
                  company_code: true,
                  brand_name: true,
                },
              },
            },
          },
        },
      });

      // Data logic: Format the nested prisma response into a clean structure for the frontend
      const result = groups.map((g) => ({
        group_name: g.name,
        group_code: g.group_code,
        companies: g.company_mappings.map((cm) => ({
          company_code: cm.company.company_code,
          brand_name: cm.company.brand_name,
        })),
      }));

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

