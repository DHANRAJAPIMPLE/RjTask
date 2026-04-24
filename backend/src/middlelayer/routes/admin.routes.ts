import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

/**
 * COMPANY ROUTES LOGIC:
 * Defines endpoints for retrieving organizational data.
 * Logic:
 * 1. Protection: All routes here are wrapped with 'authMiddleware'.
 * 2. Unauthenticated users (no valid JWT) are blocked before they reach the controller.
 */
const router = Router();
router.use(authMiddleware);

router.post('/groups', CompanyController.getGroupCompanies);

export default router;
