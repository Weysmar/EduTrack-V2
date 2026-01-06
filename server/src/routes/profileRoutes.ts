import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', getProfile);
router.put('/:id', updateProfile);

export default router;
