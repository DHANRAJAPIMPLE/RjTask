import type { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import { mapAuthError } from '../utils/error-mapper.util';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';
import { clearAuthCookies } from '../utils/cookie.util';
import { HashUtil } from '../../shared/utils/hash.util';

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * AUTH MIDDLEWARE LOGIC:
 * Refactored to forward verification to the Backend Database Service (5001).
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      

    if (!token) {
      const refreshToken = req.cookies?.refreshToken;
      const versionHashFromCookie = req.cookies?.versionHash;

      if (refreshToken && versionHashFromCookie) {
        const refreshTokenHash = HashUtil.hashToken(refreshToken);
        const { data: activity, ok } = await internalPost<any>(
          `${config.backendAuthUrl}/activity/get-by-token`,
          { refreshTokenHash },
        );

        if (ok && activity && activity.refreshToken) {
          const dbVersionHash = activity.version
            ? HashUtil.hashToken(activity.version)
            : null;

          if (
            dbVersionHash === versionHashFromCookie &&
            (!activity.expiryAt || new Date(activity.expiryAt) > new Date())
          ) {
            const newAccessToken = TokenUtil.generateAccessToken({
              userId: activity.userId,
            });
            res.cookie('accessToken', newAccessToken, {
              ...config.cookieOptions,
              maxAge: config.accessTokenMaxAge,
            });

            req.user = { id: activity.userId };
            return next();
          }
        }
      }

      throw new AppError(mapAuthError('Unauthorized - No token provided'), 401);
    }

    let decoded: { userId: string };
    try {
      decoded = TokenUtil.verifyAccessToken(token) as { userId: string };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken;
        const versionHashFromCookie = req.cookies?.versionHash;

        if (!refreshToken) {
          clearAuthCookies(res);
          throw new AppError(mapAuthError('Unauthorized - Invalid token'), 401);
        }

        const expiredPayload = TokenUtil.decodeToken(token) as {
          userId: string;
        } | null;
        if (!expiredPayload || !expiredPayload.userId) {
          clearAuthCookies(res);
          throw new AppError(mapAuthError('Unauthorized - Invalid token'), 401);
        }

        const { data: activity, ok } = await internalPost<any>(
          `${config.backendAuthUrl}/activity/get`,
          { userId: expiredPayload.userId },
        );

        const refreshTokenHash = HashUtil.hashToken(refreshToken);
        const dbVersionHash =
          activity && activity.version ? HashUtil.hashToken(activity.version) : null;

        if (
          !ok ||
          !activity ||
          activity.refreshToken !== refreshTokenHash ||
          dbVersionHash !== versionHashFromCookie ||
          (activity.expiryAt && new Date(activity.expiryAt) < new Date())
        ) {
          clearAuthCookies(res);
          throw new AppError(
            mapAuthError('Unauthorized - Session expired or invalid'),
            401,
          );
        }

        const newAccessToken = TokenUtil.generateAccessToken({
          userId: expiredPayload.userId,
        });
        res.cookie('accessToken', newAccessToken, {
          ...config.cookieOptions,
          maxAge: config.accessTokenMaxAge,
        });

        req.user = { id: expiredPayload.userId };
        return next();
      }
      throw err;
    }

    // Normal Validation: verify the still-valid token with Backend for session check
    const versionHashFromCookie = req.cookies?.versionHash;
    const { data: activity, ok } = await internalPost<any>(
      `${config.backendAuthUrl}/activity/get`,
      { userId: decoded.userId },
    );

    const dbVersionHash =
      activity && activity.version ? HashUtil.hashToken(activity.version) : null;

    if (
      !ok ||
      !activity ||
      dbVersionHash !== versionHashFromCookie ||
      (activity.expiryAt && new Date(activity.expiryAt) < new Date())
    ) {
      clearAuthCookies(res);
      throw new AppError(
        mapAuthError('Unauthorized - Session changed or expired'),
        401,
      );
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    clearAuthCookies(res);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(mapAuthError('Unauthorized - Invalid token'), 401));
    }
  }
};
