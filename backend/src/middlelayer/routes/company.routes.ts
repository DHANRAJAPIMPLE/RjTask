import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { OrgController } from '../controllers/org.controller';
import { RoleController } from '../controllers/role.controller';
import { UserController } from '../controllers/user.controller';

const router = Router();
router.use(authMiddleware);

// -------------company routes------------------------------
router.post('/initiate', CompanyController.initiateCompanyOnboarding);
router.post('/action', CompanyController.actionCompanyOnboarding);
// ----------------------------------------------------------

// -------------user routes----------------------------------
router.post('/user/initiate', UserController.initiateUserOnboarding);
router.post('/user/action', UserController.actionUserOnboarding);
router.post('/user/fetch-all-users', UserController.fetchAllUsers);
// ----------------------------------------------------------


//--------------org routes-----------------------------------
router.post('/org/initiate', OrgController.initiateOrgRequest);
router.post('/org/approve', OrgController.approveOrgRequest);
router.post('/org/fetch', OrgController.fetchOrgStructure);
// ----------------------------------------------------------

// --------------roles routes--------------------------------
router.post('/role/create', RoleController.createRoles);
router.post('/role/fetch-all', RoleController.fetchAllRoles);
// ----------------------------------------------------------

export default router;
