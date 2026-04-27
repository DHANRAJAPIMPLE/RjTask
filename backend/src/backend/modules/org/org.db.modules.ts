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

  static async updateOrgRequestStatus(req: Request, res: Response) {
    const { id, data } = req.body;
    const updated = await prisma.orgStructureReq.update({
      where: { id },
      data,
    });
    res.json(updated);
  }

  // --- Transactional Commit Operations ---

  static async approveOrgRequestCommit(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const {
        id,
        approverId,
        remarks,
        newNodePath,
        newNodeName,
        nodeType,
        parentId,
      } = req.body;

      await prisma.$transaction([
        prisma.orgStructure.create({
          data: {
            companyId: (
              await prisma.orgStructureReq.findUnique({ where: { id } })
            )?.companyId as string,
            nodePath: newNodePath,
            nodeName: newNodeName,
            nodeType: nodeType,
            parentId: parentId,
          },
        }),
        prisma.orgStructureReq.update({
          where: { id },
          data: {
            status: 'approved',
            approverId,
            approvedAt: new Date(),
            remarks,
          },
        }),
      ]);

      res
        .status(200)
        .json({ success: true, message: 'Org structure approved' });
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
      // Simplified: Just create the record
      const request = await prisma.orgStructureReq.create({
        data: req.body,
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
      });

      // Map to remove internal IDs and match user's desired format
      const safeNodes = nodes.map((node) => ({
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        nodePath: node.nodePath,
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
