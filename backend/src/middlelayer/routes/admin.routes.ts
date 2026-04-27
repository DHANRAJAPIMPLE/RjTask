import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';


/**
 * ADMIN ROUTES LOGIC:
 * Defines endpoints for system-wide administrative tasks.
 */
const router = Router();
router.use(authMiddleware);

// -------------company routes------------------------------
router.post('/groups', CompanyController.getGroupCompanies);
// ----------------------------------------------------------



export default router;
