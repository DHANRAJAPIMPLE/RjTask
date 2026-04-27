import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UserController } from '../controllers/user.controller';
import { OrgController } from '../controllers/org.controller';
import { RoleController } from '../controllers/role.controller';

/**
 * ADMIN ROUTES LOGIC:
 * Defines endpoints for system-wide administrative tasks.
 */
const router = Router();
router.use(authMiddleware);

// -------------company routes------------------------------
router.post('/groups', CompanyController.getGroupCompanies);
// ----------------------------------------------------------

// -------------user routes----------------------------------
router.post('/user/fetch-all', UserController.fetchAllUsers);
router.post('/user/initiate', UserController.initiateUserOnboarding);
router.post('/user/action', UserController.actionUserOnboarding);
// ----------------------------------------------------------

//--------------org routes-----------------------------------
router.post('/org/initiate', OrgController.initiateOrgRequest);
router.post('/org/approve', OrgController.approveOrgRequest);
router.post('/org/fetch', OrgController.fetchOrgStructure);
// ----------------------------------------------------------

// --------------roles routes--------------------------------
router.post('/role/fetch-all', RoleController.fetchAllRoles);
// ----------------------------------------------------------

export default router;
