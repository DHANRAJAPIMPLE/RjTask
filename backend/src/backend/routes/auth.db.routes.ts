import { Router } from 'express';
import { AuthDbController } from '../modules/auth/auth.db.modules';

const router = Router();

router.post('/get-by-id', AuthDbController.getById);
router.post('/get-by-email', AuthDbController.getByEmail);
router.post('/get-by-email', AuthDbController.getByEmail);
router.post('/activity/get', AuthDbController.getActivity);
router.post('/activity/get-by-token', AuthDbController.getActivityByToken);
router.post('/activity/delete', AuthDbController.deleteActivity);
router.post('/activity/upsert', AuthDbController.upsertActivity);
router.post('/user/create', AuthDbController.createUser);

export default router;
