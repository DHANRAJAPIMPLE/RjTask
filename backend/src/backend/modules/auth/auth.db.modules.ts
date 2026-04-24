import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { HashUtil } from '../../../shared/utils/hash.util';

/**
 * AUTH DB MODULE HELPERS:
 */
const bumpVersion = (currentVersion: string | null | undefined): string => {
  const num = parseInt((currentVersion ?? 'v0').replace('v', ''), 10);
  return `v${isNaN(num) ? 1 : num + 1}`;
};

const hoursFromNow = (hours: number): Date => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
};

export class AuthDbController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, phone } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await HashUtil.hash(password);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
        },
      });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        action,
        ip,
        userAgent,
        forceLogToken: providedForceLogToken,
      } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userMappings: {
            include: {
              company: {
                include: {
                  companyMappings: {
                    include: {
                      group: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await HashUtil.verify(user.password, password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const existingActivity = await prisma.userActivity.findFirst({
        where: { userId: user.id },
      });

      if (
        existingActivity &&
        existingActivity.expiryAt &&
        existingActivity.expiryAt > new Date() &&
        existingActivity.refreshToken
      ) {
        if (action === 0) {
          const forceLogToken = HashUtil.generateRandomToken(64);
          const forceLogTokenHash = HashUtil.hashToken(forceLogToken);

          await prisma.userActivity.update({
            where: { id: existingActivity.id },
            data: { forceLogToken: forceLogTokenHash },
          });

          return res.status(409).json({
            message: 'User already logged in another device',
            status: 1,
            forceLogToken,
          });
        }

        if (!providedForceLogToken) {
          return res.status(400).json({ error: 'Force login token required' });
        }

        const providedTokenHash = HashUtil.hashToken(providedForceLogToken);
        if (
          !existingActivity.forceLogToken ||
          existingActivity.forceLogToken !== providedTokenHash
        ) {
          return res.status(401).json({ error: 'Invalid force login token' });
        }
      }

      const refreshToken = HashUtil.generateRandomToken(32);
      const refreshTokenHash = HashUtil.hashToken(refreshToken);

      const nextVersion = bumpVersion(existingActivity?.version);
      const versionHash = HashUtil.hashToken(nextVersion);

      const expiryAt = hoursFromNow(24);

      if (existingActivity) {
        await prisma.userActivity.update({
          where: { id: existingActivity.id },
          data: {
            refreshToken: refreshTokenHash,
            version: nextVersion,
            ipAddress: ip,
            userAgent: userAgent,
            expiryAt: expiryAt,
            forceLogToken: null,
          },
        });
      } else {
        await prisma.userActivity.create({
          data: {
            userId: user.id,
            refreshToken: refreshTokenHash,
            version: nextVersion,
            ipAddress: ip,
            userAgent: userAgent,
            expiryAt: expiryAt,
          },
        });
      }

      // Logic: Group companies by their respective groups for the response
      const groupsMap = new Map<string, Record<string, unknown>>();

      user.userMappings.forEach((um) => {
        const company = {
          legalName: um.company.legalName,
          brandName: um.company.brandName,
          companyCode: um.company.companyCode,
        };

        um.company.companyMappings.forEach((cm) => {
          if (cm.group) {
            const groupCode = cm.group.groupCode;
            if (!groupsMap.has(groupCode)) {
              groupsMap.set(groupCode, {
                groupName: cm.group.name,
                groupCode: cm.group.groupCode,
                companies: [],
              });
            }
            const groupObj = groupsMap.get(groupCode);
            const companies = groupObj?.companies as Record<string, unknown>[];
            if (!companies.some((c) => c.companyCode === company.companyCode)) {
              companies.push(company);
            }
          }
        });
      });

      const groups = Array.from(groupsMap.values());

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          groups,
        },
        tokens: {
          refreshToken,
          versionHash,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, userId: providedUserId } = req.body;

      if (!refreshToken) {
        return res
          .status(401)
          .json({ error: 'Unauthorized - Refresh token missing' });
      }

      let userId = providedUserId;

      if (!userId) {
        const refreshTokenHash = HashUtil.hashToken(refreshToken);
        const activityByToken = await prisma.userActivity.findFirst({
          where: { refreshToken: refreshTokenHash },
        });
        userId = activityByToken?.userId || null;
      }

      if (!userId) {
        return res
          .status(401)
          .json({ error: 'Unauthorized - Invalid session' });
      }

      const activity = await prisma.userActivity.findFirst({
        where: { userId: userId },
        include: { user: true },
      });

      if (!activity || !activity.refreshToken) {
        return res
          .status(401)
          .json({ error: 'Unauthorized - Invalid token', clearCookies: true });
      }

      const refreshTokenHash = HashUtil.hashToken(refreshToken);
      if (activity.refreshToken !== refreshTokenHash) {
        return res.status(401).json({
          error: 'User already logged in another device',
          clearCookies: true,
        });
      }

      if (activity.expiryAt && activity.expiryAt < new Date()) {
        return res
          .status(401)
          .json({ error: 'Unauthorized - Invalid token', clearCookies: true });
      }

      const nextVersion = bumpVersion(activity.version);
      const versionHash = HashUtil.hashToken(nextVersion);

      const newRefreshToken = HashUtil.generateRandomToken(32);
      const newRefreshTokenHash = HashUtil.hashToken(newRefreshToken);

      const expiryAt = hoursFromNow(24);

      await prisma.userActivity.update({
        where: { id: activity.id },
        data: {
          refreshToken: newRefreshTokenHash,
          version: nextVersion,
          expiryAt: expiryAt,
        },
      });

      res.status(200).json({
        userId: activity.userId,
        tokens: {
          refreshToken: newRefreshToken,
          versionHash,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({ error: 'Unauthorized - User ID missing' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
          userMappings: {
            include: {
              company: {
                select: {
                  legalName: true,
                  brandName: true,
                  companyCode: true,
                  companyMappings: {
                    include: {
                      group: {
                        select: {
                          name: true,
                          groupCode: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Logic: Group companies by their respective groups
      const groupsMap = new Map<string, Record<string, unknown>>();

      user.userMappings.forEach((um) => {
        const company = {
          legalName: um.company.legalName,
          brandName: um.company.brandName,
          companyCode: um.company.companyCode,
        };

        um.company.companyMappings.forEach((cm) => {
          if (cm.group) {
            const groupCode = cm.group.groupCode;
            if (!groupsMap.has(groupCode)) {
              groupsMap.set(groupCode, {
                groupName: cm.group.name,
                groupCode: cm.group.groupCode,
                companies: [],
              });
            }
            // Logic: Avoid duplicate companies in the same group
            const groupObj = groupsMap.get(groupCode);
            const companies = groupObj?.companies as Record<string, unknown>[];
            if (!companies.some((c) => c.companyCode === company.companyCode)) {
              companies.push(company);
            }
          }
        });
      });

      const groups = Array.from(groupsMap.values());

      res.status(200).json({
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          groups,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token missing' });
      }

      const hash = HashUtil.hashToken(refreshToken);

      const result = await prisma.userActivity.updateMany({
        where: { refreshToken: hash },
        data: { refreshToken: null, version: null, expiryAt: null },
      });

      if (result.count === 0) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async verifySession(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, refreshToken, versionHashFromCookie } = req.body;

      const activity = await prisma.userActivity.findFirst({
        where: userId
          ? { userId: userId }
          : { refreshToken: HashUtil.hashToken(refreshToken) },
      });

      if (!activity || !activity.refreshToken) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      const dbVersionHash = activity.version
        ? HashUtil.hashToken(activity.version)
        : null;

      if (dbVersionHash !== versionHashFromCookie) {
        return res
          .status(401)
          .json({ error: 'User already logged in another device' });
      }

      if (activity.expiryAt && activity.expiryAt < new Date()) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      if (
        refreshToken &&
        activity.refreshToken !== HashUtil.hashToken(refreshToken)
      ) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      res.status(200).json({
        isValid: true,
        userId: activity.userId,
      });
    } catch (error) {
      next(error);
    }
  }
}
