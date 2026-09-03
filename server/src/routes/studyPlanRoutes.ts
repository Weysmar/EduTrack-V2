import { Router } from 'express';
import { createStudyPlan, getStudyPlans, getStudyTasks, updateStudyTask } from '../controllers/studyPlanController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStudyPlans);
router.post('/', createStudyPlan);
router.get('/tasks', getStudyTasks);
router.put('/tasks/:taskId', updateStudyTask);

export default router;
