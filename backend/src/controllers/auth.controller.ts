import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { HashUtil } from '../utils/hash.util';
import { TokenUtil } from '../utils/token.util';
import { AppError } from '../middlewares/error.middleware';
import requestIp from 'request-ip';

const prisma = new PrismaClient();

export class AuthController {
  /**
   * REGISTER LOGIC: Handles new user account creation.
   * Logic includes:
   * 1. Data validation (checking required fields).
   * 2. Checking for existing users in the database to prevent duplicates.
   * 3. Hashing the plain-text password for secure storage.
   * 4. Creating a new User record in the database using Prisma.
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, phone } = req.body;

      // Logic: Validate required fields are present in request body
      if (!email || !password || !name || !phone) {
        throw new AppError('Missing required fields', 400);
      }

      // DB Logic: Query the database to check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new AppError('User already exists', 400);
      }

      // Logic: Securely hash the password before storing it in the database
      const hashedPassword = await HashUtil.hash(password);

      // DB Logic: Store the new user record in the database
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
        },
      });

      // Response: Send success status and non-sensitive user info
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * LOGIN LOGIC: Authenticates users and manages active sessions.
   * Logic includes:
   * 1. Credentials verification (hashing and DB lookup).
   * 2. Active Session Management: Checks if the user is already logged in elsewhere.
   * 3. Force Login Flow: Implements a one-time token mechanism to kick existing sessions.
   * 4. Session Versioning: Tracks session versions (v1, v2...) to invalidate stolen tokens.
   * 5. Cookie Management: Setting secure, HTTP-only JWT and refresh tokens.
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, system } = req.body; // Logic: 'system' flag indicates normal (0) or force (1) login
      const ip = requestIp.getClientIp(req) || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // if (!email || !password) {
      //   throw new AppError('Email and password required', 400);
      // }

      // DB Logic: Retrieve the user record from the database for verification
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Logic: Verify the provided password against the stored hashed version
      const isPasswordValid = await HashUtil.verify(user.password, password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // DB Logic: Find the most recent active session/activity for this user
      const existingActivity = await prisma.user_activity.findFirst({
        where: { user_id: user.id }
      });

      // Session Logic: Check if an active, non-expired session already exists
     
      if (existingActivity && existingActivity.expiry_at && existingActivity.expiry_at > new Date() && existingActivity.refresh_token) {
        if (system === 0) {
          // Logic Flow: Detected existing session, but user didn't request a 'force' login yet.
          // We generate a unique, one-time token to authorize a force login in the next step.
          const forceLogToken = HashUtil.generateRandomToken(64);
          const forceLogTokenHash = HashUtil.hashToken(forceLogToken);

          // DB Logic: Update activity with the hashed force login token for later verification
          await prisma.user_activity.update({
            where: { id: existingActivity.id },
            data: { force_log_token: forceLogTokenHash }
          });

          // Logic: Clear existing session cookies to prepare for potential re-login
          // res.clearCookie('accessToken');
          // res.clearCookie('refreshToken');
          // res.clearCookie('versionHash');

          // Response: Return 409 Conflict with the one-time token for the frontend to confirm
          return res.status(409).json({
            message: 'User already logged in another device',
            status: 1,
            forceLogToken, 
          });
        }

        // Logic Flow: User confirmed force login (system === 1).
        // we must validate the one-time force_log_token provided by the frontend.
        const { force_log_token } = req.body;

        if (!force_log_token) {
          throw new AppError('Force login token required', 400);
        }

        // Logic: Hash the provided token and compare it with the one stored in DB
        const providedTokenHash = HashUtil.hashToken(force_log_token);
        if (!existingActivity.force_log_token || existingActivity.force_log_token !== providedTokenHash) {
          throw new AppError('Invalid force login token', 401);
        }
        // Verification success - logic continues to create a fresh session below.
      }

      // Logic: Generate a new unique refresh token for this session
      const refreshToken = HashUtil.generateRandomToken(32);
      const refreshTokenHash = HashUtil.hashToken(refreshToken);

      // Versioning Logic: Increment session version (v1 -> v2) if a previous session existed.
      // This allows the system to detect if a specific version is being re-used/hijacked.
      let nextVersion = 'v1';
      if (existingActivity && existingActivity.version) {
        const currentVersionNumber = parseInt(existingActivity.version.replace('v', ''), 10);
        nextVersion = `v${isNaN(currentVersionNumber) ? 1 : currentVersionNumber + 1}`;
      }
      const versionHash = HashUtil.hashToken(nextVersion);

      // Logic: Define session expiry time (5 hours from now)
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 5);

      if (existingActivity) {
        // DB Logic: Update the existing activity record with new session data (rotating tokens)
        await prisma.user_activity.update({
          where: { id: existingActivity.id },
          data: {
            refresh_token: refreshTokenHash,
            version: nextVersion,
            ip_address: ip,
            user_agent: userAgent,
            expiry_at: expiryAt,
            force_log_token: null, // Logic: Consume/clear the force login token after use
          }
        });
      } else {
        // DB Logic: No previous activity found, creating a brand new session entry
        await prisma.user_activity.create({
          data: {
            user_id: user.id,
            refresh_token: refreshTokenHash,
            version: nextVersion,
            ip_address: ip,
            user_agent: userAgent,
            expiry_at: expiryAt,
          }
        });
      }

      // Logic: Generate a signed JWT Access Token containing non-sensitive payload
      const accessToken = TokenUtil.generateAccessToken({ userId: user.id });

      // Logic: Set HTTP-only cookies for tokens. 
      // httpOnly prevents client-side JS access (XSS protection).
      // secure ensures cookies are only sent over HTTPS.
      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 });
      res.cookie('versionHash', versionHash, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 });

      res.status(200).json({
        message: 'Login successful',
        user: {
          name: user.name,
          email: user.email,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * REFRESH TOKEN LOGIC: Generates new tokens when access token expires.
   * Logic includes:
   * 1. Extracting tokens from cookies or headers.
   * 2. Decoding (not necessarily verifying) the expired access token to identify the user.
   * 3. DB Verification: Ensuring the refresh token in the request matches the hashed one in DB.
   * 4. Version Check: Comparing session versions to detect potential hijacks.
   * 5. Token Rotation: Issuing brand new tokens (AT and RT) and invalidating the old RT.
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic: Retrieve tokens from request cookies or headers
      const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      const refreshToken = req.cookies?.refreshToken ;
      
      if (!refreshToken) {
        throw new AppError('Unauthorized - Refresh token missing', 401);
      }

      let userId: string | null = null;

      // Logic: If access token exists, decode it to identify user (even if expired)
      if (accessToken) {
        const decoded = TokenUtil.decodeToken(accessToken) as any;
        userId = decoded?.userId;
      }

      // Logic Fallback: If no access token, we must search for the user by the refresh token hash
      if (!userId) {
        const refreshTokenHash = HashUtil.hashToken(refreshToken);
        const activityByToken = await prisma.user_activity.findFirst({
          where: { refresh_token: refreshTokenHash }
        });
        userId = activityByToken?.user_id || null;
      }

      if (!userId) {
        throw new AppError('Unauthorized - Invalid session', 401);
      }


      // DB Logic: Find the session record for this user to verify refresh token
      const activity = await prisma.user_activity.findFirst({
        where: { user_id: userId },
        include: { user: true }
      });

      // Verification Logic: Check if session exists and has a valid token
      if (!activity || !activity.refresh_token) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('versionHash');
        throw new AppError('Unauthorized - Invalid token', 401);
      }

      // Logic: Hashing provided refresh token to compare with the hashed one in DB
      const refreshTokenHash = HashUtil.hashToken(refreshToken);

      // Security Logic: If RT hash doesn't match DB, it means user is logged out or RT is stolen/reused.
      if (activity.refresh_token !== refreshTokenHash) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('versionHash');
        throw new AppError('User already logged in another device', 401);
      }

      // Logic: Verify session hasn't expired according to DB timestamp
      if (activity.expiry_at && activity.expiry_at < new Date()) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('versionHash');
        throw new AppError('Unauthorized - Invalid token', 401);
      }

      // Versioning Logic: Increment session version during refresh (v2 -> v3)
      const version = activity.version || 'v0';
      const currentVersionNumber = parseInt(version.replace('v', ''), 10);
      const nextVersion = `v${isNaN(currentVersionNumber) ? 1 : currentVersionNumber + 1}`;
      const versionHash = HashUtil.hashToken(nextVersion);

      // Token Rotation Logic: Issue fresh tokens for improved security
      const newRefreshToken = HashUtil.generateRandomToken(32);
      const newRefreshTokenHash = HashUtil.hashToken(newRefreshToken);
      const newAccessToken = TokenUtil.generateAccessToken({ userId: activity.user_id });

      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 5);

      // DB Logic: Persist new session state (tokens, version, expiry) in database
      await prisma.user_activity.update({
        where: { id: activity.id },
        data: {
          refresh_token: newRefreshTokenHash,
          version: nextVersion,
          expiry_at: expiryAt,
        }
      });

      // Logic: Update client cookies with fresh tokens
      res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
      res.cookie('versionHash', versionHash, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000  });

      res.status(200).json({ message: 'Token refreshed' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * LOGOUT LOGIC: Ends user session and invalidates tokens.
   * Logic includes:
   * 1. Removing tokens from DB (clearing refresh hashes).
   * 2. Clearing cookies in the client's browser.
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        throw new AppError('Refresh token missing', 401);
      }

      // Logic: Convert plain RT to hash to find relevant session record
      const hash = HashUtil.hashToken(refreshToken);

      // DB Logic: Clear sensitive session data from database effectively logging user out everywhere using this token
      const result = await prisma.user_activity.updateMany({ 
        where: { refresh_token: hash },
        data: { refresh_token: null, version: null, expiry_at: null }
      });

      // Logic: If no record was updated, it means the token was invalid or already invalidated
      if (result.count === 0) {
        throw new AppError('Invalid or expired session', 401);
      }

      // Logic: Instruct browser to delete session cookies ONLY on success
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('versionHash');

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}

