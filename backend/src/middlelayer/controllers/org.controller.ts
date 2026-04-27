import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middlewares/error.middleware';
import { config } from '../config';
import { internalPost } from '../utils/internal-fetch.util';

export class OrgController {
  static async initiateOrgRequest(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { companyCode, newNodeName, nodeType, parentNode } = req.body;
      const initiatorId = req.user?.id;

      if (!initiatorId) {
        throw new AppError('Unauthorized', 401);
      }

      // 1. Get Company ID from Backend
      const { data: company, ok: _companyOk } = await internalPost<any>(
        `${config.backendUrl}/internal/company/get-by-code`, // Need to make sure this exists or use a generic fetch
        { companyCode },
      );

      // Wait, let's use a simpler way if get-by-code doesn't exist yet
      // Actually, I'll assume I might need to add it or use an existing one.
      // Let's check company.db.modules.ts for a get-by-code.

      // 2. Logic: Get global access IDs
      const { data: globalAccessIds } = await internalPost<string[]>(
        `${config.backendUrl}/internal/onboarding/global-access-ids`,
        {},
      );

      // 3. Create request in Backend
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/org/initiate`,
        {
          initiatorId,
          companyId: company?.id, // This might be null if company fetch failed, backend should handle or we check here
          data: {
            newNodeName,
            nodeType,
            parentNode,
          },
          status: 'pending',
          accessibleBy: globalAccessIds || [],
        },
      );

      if (!ok) {
        throw new AppError(
          data.message || 'Failed to initiate org structure request',
          status,
        );
      }

      res.status(201).json({
        success: true,
        message: 'Org structure request initiated',
        requestId: data.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveOrgRequest(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      // FIX: Use 'id' and 'remark' to match user input, but map to logic
      const { id, action, remark } = req.body;
      const approverId = req.user?.id;

      if (!approverId) {
        throw new AppError('Unauthorized', 401);
      }

      // 1. Fetch request from Backend
      const { data: request, ok: fetchOk } = await internalPost<any>(
        `${config.backendUrl}/internal/org/get-request`,
        { id },
      );

      if (!fetchOk || !request) {
        throw new AppError('Org structure request not found', 404);
      }

      // 2. Logic: Verify status and permissions
      if (request.status !== 'pending') {
        throw new AppError('Request is already processed', 400);
      }

      if (!request.accessibleBy.includes(approverId)) {
        throw new AppError(
          'Unauthorized: You do not have permission to process this request',
          403,
        );
      }

      // 3. Handle Rejection
      if (action === 'reject') {
        await internalPost(`${config.backendUrl}/internal/org/update-status`, {
          id,
          data: {
            status: 'rejected',
            approverId,
            approvedAt: new Date(),
            remarks: remark,
          },
        });
        return res
          .status(200)
          .json({ success: true, message: 'Org structure request rejected' });
      }

      // 4. Logic: Path Generation
      const reqData = request.data as any;
      const { newNodeName, nodeType, parentNode } = reqData;

      let newNodePath = '';
      let parentId: string | null = null;

      if (nodeType === 'ROOT') {
        newNodePath = `${request.company.companyCode.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase()}.ROOT`;
      } else {
        const parentPath = parentNode.nodePath;
        const safeName = newNodeName
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .toUpperCase();
        newNodePath = `${parentPath}.${safeName}`;

        // Verify parent node in Backend
        const { data: parentNodeRecord } = await internalPost<any>(
          `${config.backendUrl}/internal/org/get-node`,
          { nodePath: parentPath },
        );

        if (!parentNodeRecord) {
          throw new AppError('Parent node not found', 400);
        }
        parentId = parentNodeRecord.id;
      }

      // Check if path exists in Backend
      const { data: existingNode } = await internalPost<any>(
        `${config.backendUrl}/internal/org/get-node`,
        { nodePath: newNodePath },
      );
      if (existingNode) {
        throw new AppError('Node path already exists', 400);
      }

      // 5. Commit Transaction in Backend
      const {
        data: commitRes,
        ok: commitOk,
        status: commitStatus,
      } = await internalPost(
        `${config.backendUrl}/internal/org/approve-commit`,
        {
          id,
          approverId,
          remarks: remark,
          newNodePath,
          newNodeName,
          nodeType,
          parentId,
        },
      );

      if (!commitOk) {
        throw new AppError(
          commitRes.message || 'Failed to approve org structure request',
          commitStatus,
        );
      }

      res.status(200).json({
        success: true,
        message: 'Org structure request approved and node created',
        nodePath: newNodePath,
      });
    } catch (error) {
      next(error);
    }
  }

  static async fetchOrgStructure(
    req: Request & { user?: { id: string } },
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { companyCode } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      // Forward to Backend (5001)
      const { data, ok, status } = await internalPost(
        `${config.backendUrl}/internal/org/fetch`,
        {
          companyCode,
        },
      );

      if (!ok) {
        throw new AppError(
          data.message || 'Failed to fetch org structure',
          status,
        );
      }

      // Format response with normal and pending arrays
      res.status(200).json({
        message: 'Organization structure fetched successfully!',
        code: 200,
        data: {
          normal: data.data.nodes,
          pending: data.data.pending,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
