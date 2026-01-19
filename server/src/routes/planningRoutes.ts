import { Router } from 'express';
import { generatePlan } from '../controllers/planningController';
import { authenticate } from '../middleware/auth';
import { aiRateLimit } from '../middleware/aiRateLimit';

const router = Router();

router.use(authenticate);
router.post('/generate', aiRateLimit, generatePlan);

export default router;
