import { Router } from 'express';
import { OnboardingDbController } from '../modules/onboarding/onboarding.db.modules';

const router = Router();

// --- Company Onboarding ---
router.post('/company/check-code', OnboardingDbController.checkCompanyCode);
router.post('/group/check-code', OnboardingDbController.checkGroupCode);
router.post('/company/create', OnboardingDbController.createCompanyOnboarding);
router.post('/company/get', OnboardingDbController.getCompanyOnboardingById);
router.post('/company/action', OnboardingDbController.handleCompanyOnboardingStatus);


// --- User Onboarding ---
router.post('/user/check-manager', OnboardingDbController.getManagerInfo);
router.post('/user/check-exists', OnboardingDbController.getUserByEmail);
router.post('/user/create', OnboardingDbController.createUserOnboarding);
router.post('/user/get', OnboardingDbController.getUserOnboardingById);
router.post('/user/action', OnboardingDbController.handleUserOnboardingStatus);


router.post('/global-access-ids',OnboardingDbController.getGlobalAccessUserIds);

export default router;
