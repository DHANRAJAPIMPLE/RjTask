import { Router } from 'express';
import { RolesDbController } from '../modules/roles/roles.db.modules.ts';

const router = Router();

router.post('/upsert-role', RolesDbController.upsertRole);
router.post('/fetch-all', RolesDbController.fetchAllRoles);

export default router;
