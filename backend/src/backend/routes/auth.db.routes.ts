import { Router } from 'express';
import { AuthDbController } from '../modules/auth/auth.db.modules';

const router = Router();

// router.post('/register', AuthDbController.register);
// router.post('/login', AuthDbController.login);
// router.post('/refresh', AuthDbController.refreshToken);
// router.post('/logout', AuthDbController.logout);
// router.post('/verify-session', AuthDbController.verifySession);
// router.post('/me', AuthDbController.getMe);
router.post('/get-by-id', AuthDbController.getById);
router.post('/get-by-email', AuthDbController.getByEmail);
router.post('/activity/get', AuthDbController.getActivity);
router.post('/activity/get-by-token', AuthDbController.getActivityByToken);
router.post('/activity/delete', AuthDbController.deleteActivity);
router.post('/activity/upsert', AuthDbController.upsertActivity);
router.post('/user/create', AuthDbController.createUser);

export default router;
