import type { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import { HashUtil } from '../utils/hash.util';
import { AppError } from './error.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * AUTH MIDDLEWARE LOGIC:
 * This middleare intercepts requests to protected routes to verify the user's identity.
 * Logic:
 * 1. Token Extraction: Look for JWT in cookies or Authorization header.
 * 2. Verification: Check if the access token is valid and not expired.
 * 3. Silent Refresh Flow: If expired, try to use the Refresh Token to auto-issue a new session.
 * 4. Hijack Prevention: Compare the session version in the cookie against the DB record.
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Logic: Retrieve token from HTTP-only cookie (preferred) or Bearer header
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    // Fallback logic if token is completely missing
    if (!token) {
      const refreshToken = req.cookies?.refreshToken;
      const versionHashFromCookie = req.cookies?.versionHash;

      // Logic: If both refresh token and version are present, attempt recovery
      if (refreshToken && versionHashFromCookie) {
        const refreshTokenHash = HashUtil.hashToken(refreshToken);

        // DB Logic: Find the session record by looking up the refresh token hash
        const activity = await prisma.user_activity.findFirst({
          where: { refresh_token: refreshTokenHash }
        });

        const dbVersionHash = activity?.version ? HashUtil.hashToken(activity.version) : null;

        /**
         * Security Logic:
         * 1. Check if activity exists.
         * 2. Verify Session Version matches cookie (hijack prevention).
         * 3. Verify session hasn't expired.
         */
        if (activity && dbVersionHash === versionHashFromCookie && (!activity.expiry_at || activity.expiry_at > new Date())) {
          // Logic Flow: Session recovered via Refresh Token!
          const newAccessToken = TokenUtil.generateAccessToken({ userId: activity.user_id });
          res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 1000 });
          
          req.user = { id: activity.user_id };
          return next();
        }
      }

      // Logic: If recovery failed or no refresh token, block access
      throw new AppError('Unauthorized - No token provided', 401);
    }

    let decoded: any;
    try {
      // Logic: Attempt to cryptographically verify the JWT signature
      decoded = TokenUtil.verifyAccessToken(token);
    } catch (err: any) {
      // Logic: Handle specific JWT expiration error to attempt a 'Silent Refresh'
      if (err.name === 'TokenExpiredError') {
        
        // Logic: Access token died, check if we have a refresh token to stay logged in
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
          clearAuthCookies(res);
          throw new AppError('Unauthorized - Invalid token', 401);
        }

        // Logic: Extract the user ID from the expired token (ignores expiration)
        const expiredPayload = TokenUtil.decodeToken(token) as any;
        if (!expiredPayload || !expiredPayload.userId) {
          clearAuthCookies(res);
          throw new AppError('Unauthorized - Invalid token', 401);
        }

        // DB Logic: Fetch the session activity from the database to verify the RT
        const activity = await prisma.user_activity.findFirst({
          where: { user_id: expiredPayload.userId }
        });

        // Logic: Compute hashes for comparison
        const refreshTokenHash = HashUtil.hashToken(refreshToken);
        const versionHashFromCookie = req.cookies?.versionHash;
        const dbVersionHash = activity?.version ? HashUtil.hashToken(activity.version) : null;

        /**
         * Security Logic:
         * 1. Refresh token must match the hashed version stored in DB.
         * 2. Session Version must match the one in the browser cookie.
         * If versions mismatch, it implies another device has logged in, kicking this one out.
         */
        if (!activity || !activity.refresh_token || activity.refresh_token !== refreshTokenHash || dbVersionHash !== versionHashFromCookie) {
          clearAuthCookies(res);
          const msg = (activity && dbVersionHash !== versionHashFromCookie) ? 'User already logged in another device' : 'Unauthorized - Invalid token';
          throw new AppError(msg, 401);
        }

        // Logic: Ensure the refresh session itself hasn't expired in the database
        if (activity.expiry_at && activity.expiry_at < new Date()) {
          clearAuthCookies(res);
          throw new AppError('Unauthorized - Invalid token', 401);
        }

        // Logic Flow: Silent refresh succeeded!
        // We generate a fresh access token and update the client-side cookie immediately.
        const newAccessToken = TokenUtil.generateAccessToken({ userId: expiredPayload.userId });
        res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 1000 });
        
        // Logic: Inject user identity into the request object for the controller to use
        req.user = { id: expiredPayload.userId };
        return next(); // Proceed to the protected route
      }
      throw err; // Logic: If error wasn't expiration, throw it up
    }

    /**
     * NORMAL VALIDATION LOGIC:
     * Logic used when the access token is still cryptographically valid.
     */
    const activity = await prisma.user_activity.findFirst({
      where: { user_id: decoded.userId }
    });

    const versionHashFromCookie = req.cookies?.versionHash;
    const dbVersionHash = activity?.version ? HashUtil.hashToken(activity.version) : null;

    // Logic: Verify session exists in DB and wasn't manually cleared (logout)
    if (!activity || !activity.refresh_token) {
      clearAuthCookies(res);
      throw new AppError('Unauthorized - Invalid token', 401);
    }

    // Logic: Version check ensures this session is the 'current' active one
    if (dbVersionHash !== versionHashFromCookie) {
      clearAuthCookies(res);
      throw new AppError('User already logged in another device', 401);
    }

    // Logic: Expiry check against DB timestamp
    if (activity.expiry_at && activity.expiry_at < new Date()) {
      clearAuthCookies(res);
      throw new AppError('Unauthorized - Invalid token', 401);
    }

    // Logic: Success! Inject user info.
    req.user = { id: decoded.userId };
    next();

  } catch (error) {
    // Logic: Cleanup cookies on any auth failure
    clearAuthCookies(res);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Unauthorized - Invalid token', 401));
    }
  }
};


/**
 * UTILS LOGIC: Clear all authentication cookies from the browser.
 */
const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('versionHash');
};

