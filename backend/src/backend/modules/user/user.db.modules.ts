import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class UserDbController {
  static async fetchAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic: Fetch all user mappings with their related user, company, and manager details
      const mappings = await prisma.user_mapping.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          company: {
            select: {
              brand_name: true,
            },
          },
          manager: {
            select: {
              name: true,
            },
          },
        },
      });

      // Logic: Group users into active and inactive categories
      const result = {
        ative: [] as any[],
        inactive: [] as any[],
      };

      mappings.forEach((m) => {
        const userData = {
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          createAT: m.create_at.toISOString().split('T')[0],
          'copamny name': m.company.brand_name,
          reportingmanger: m.manager?.name || 'N/A',
          designations: m.designation,
          'empoyee-id': m.employee_id,
        };

        if (m.status === 'active') {
          result.ative.push(userData);
        } else {
          result.inactive.push(userData);
        }
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
