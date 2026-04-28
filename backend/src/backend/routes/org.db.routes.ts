import { Router } from 'express';
import { OrgStructureDbController } from '../modules/org/org.db.modules';

const router = Router();

router.post('/initiate', OrgStructureDbController.initiateRequest);
router.post('/get-request', OrgStructureDbController.getOrgRequestById);
router.post('/get-node', OrgStructureDbController.getOrgNodeByPath);
router.post('/action', OrgStructureDbController.updateOrgRequestStatus);

router.post('/fetch', OrgStructureDbController.fetchStructure);

export default router;
