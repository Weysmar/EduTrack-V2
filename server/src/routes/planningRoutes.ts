import { Router } from 'express';
import { generatePlan } from '../controllers/planningController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/generate', generatePlan);

export default router;
