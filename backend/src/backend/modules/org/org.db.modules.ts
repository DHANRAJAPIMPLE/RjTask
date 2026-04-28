import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

export class OrgStructureDbController {
  // --- Internal Atomic Operations ---

  static async getOrgRequestById(req: Request, res: Response) {
    const { id } = req.body;
    const request = await prisma.orgStructureReq.findUnique({
      where: { id },
      include: { company: true },
    });
    res.json(request);
  }

  static async getOrgNodeByPath(req: Request, res: Response) {
    const { nodePath } = req.body;
    const node = await prisma.orgStructure.findUnique({
      where: { nodePath },
    });
    res.json(node);
  }



  // --- Transactional Commit Operations ---

static async updateOrgRequestStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const {
      id,
      status, // 'approved' | 'rejected'
      approverId,
      remarks,
      newNodePath,
      newNodeName,
      nodeType,
      parentId,
    } = req.body;

    if (!id || !status) {
      throw new Error('id and status are required');
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.orgStructureReq.findUnique({
        where: { id },
        include: { company: true },
      });

      if (!request) throw new Error('Request not found');

      // ✅ REJECT FLOW
      if (status === 'rejected') {
        const updated = await tx.orgStructureReq.update({
          where: { id },
          data: {
            status: 'rejected',
            remarks,
          },
        });

        if (approverId) {
          await tx.orgHistory.create({
            data: {
              companyCode: request.company.companyCode,
              event: 'REJECT',
              eventUserId: approverId,
            },
          });
        }

        return updated;
      }

      // ✅ APPROVE FLOW
      if (status === 'approved') {
        // validate required fields for approval
        if (!newNodePath || !newNodeName || !nodeType) {
          throw new Error('Missing node details for approval');
        }

        // create org node
        await tx.orgStructure.create({
          data: {
            companyId: request.companyId,
            nodePath: newNodePath,
            nodeName: newNodeName,
            nodeType: nodeType,
            parentId: parentId || null,
          },
        });

        // update request
        const updated = await tx.orgStructureReq.update({
          where: { id },
          data: {
            status: 'approved',
            remarks,
          },
        });

        // history
        await tx.orgHistory.create({
          data: {
            companyCode: request.company.companyCode,
            event: 'APPROVE',
            eventUserId: approverId,
          },
        });

        return updated;
      }

      throw new Error('Invalid status value');
    });

    res.status(200).json({
      success: true,
      message:
        status === 'approved'
          ? 'Org structure approved'
          : 'Org structure rejected',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

  static async initiateRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { initiatorId, companyId, ...rest } = req.body;
      const request = await prisma.$transaction(async (tx) => {
        const reqRecord = await tx.orgStructureReq.create({
          data: {
            ...rest,
            companyId: companyId,
          },
          include: { company: true },
        });

        await tx.orgHistory.create({
          data: {
            companyCode: reqRecord.company.companyCode,
            event: 'INITIATE',
            eventUserId: initiatorId,
          },
        });
        return reqRecord;
      });
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  }

  static async fetchStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyCode } = req.body;

      const company = await prisma.company.findUnique({
        where: { companyCode: companyCode },
      });

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: 'Company not found' });
      }

      const nodes = await prisma.orgStructure.findMany({
        where: { companyId: company.id },
        orderBy: { nodePath: 'asc' },
      });

      // Fetch pending requests for this company
      const pendingRequests = await prisma.orgStructureReq.findMany({
        where: {
          companyId: company.id,
          status: 'pending',
        },
        include: {
          // No longer using initiator/approver relations as they were removed
        },
      });

      // Map to remove internal IDs and match user's desired format
      const safeNodes = nodes.map((node) => ({
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        nodePath: node.nodePath,
        initiatorName: null,
        initiatorEmail: null,
        initiatedDate: null,
        approverName: null,
        approverEmail: null,
        approvedDate: null,
      }));

      res.status(200).json({
        message: 'Organization structure fetched successfully!',
        code: 200,
        data: {
          nodes: safeNodes,
          pending: pendingRequests,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
