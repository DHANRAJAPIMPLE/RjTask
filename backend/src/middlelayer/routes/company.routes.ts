import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { OnboardingController } from '../controllers/onboarding.controller';
import { OrgStructureController } from '../controllers/org.controller';
import { RolesController } from '../controllers/roles.controller';
import { UserController } from '../controllers/user.controller';



const router = Router();
router.use(authMiddleware);

// -------------company routes------------------------------
router.post('/initiate',OnboardingController.initiateCompanyOnboarding);
router.post('/action', OnboardingController.actionCompanyOnboarding);
// ----------------------------------------------------------

// -------------user routes----------------------------------
router.post('/user/initiate', OnboardingController.initiateUserOnboarding);
router.post('/user/action', OnboardingController.actionUserOnboarding);
router.post('/user/fetch-all-users', UserController.fetchAllUsers);
// ----------------------------------------------------------


//--------------org routes-----------------------------------
router.post('/org/initiate', OrgStructureController.initiateOrgRequest);
router.post('/org/approve', OrgStructureController.approveOrgRequest);
router.post('/org/fetch', OrgStructureController.fetchOrgStructure);
// ----------------------------------------------------------

// --------------roles routes--------------------------------
router.post('/role/fetch-all', RolesController.fetchAllRoles);
// ----------------------------------------------------------




export default router;
