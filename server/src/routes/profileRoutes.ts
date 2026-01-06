import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/:id', getProfile);
router.put('/:id', updateProfile);

export default router;
