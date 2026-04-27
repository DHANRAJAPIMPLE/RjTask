import { Router } from 'express';
import { CompanyDbController } from '../modules/company/company.db.modules';

const router = Router();

router.post('/my-companies', CompanyDbController.getMyCompanies);
router.post('/groups', CompanyDbController.getGroupCompanies);
router.post('/get-by-code', CompanyDbController.getCompanyByCode);

export default router;
