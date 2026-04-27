import { Router } from 'express';
import { UserDbController } from '../modules/user/user.db.modules';

const router = Router();

router.post('/fetch-all', UserDbController.fetchAllUsers);
router.post('/update-status', UserDbController.updateUserStatus);

export default router;
