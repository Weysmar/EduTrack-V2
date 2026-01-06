import { Router } from 'express';
import { createStudyPlan, getStudyPlans } from '../controllers/studyPlanController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStudyPlans);
router.post('/', createStudyPlan);

export default router;
