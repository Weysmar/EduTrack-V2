import { Router } from 'express';
import {
    createStudyPlan,
    getStudyPlans,
    getStudyTasks,
    updateStudyTask,
    createStudyTask,
    deleteStudyTask
} from '../controllers/studyPlanController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStudyPlans);
router.post('/', createStudyPlan);
router.get('/tasks', getStudyTasks);
router.post('/tasks', createStudyTask);
router.put('/tasks/:taskId', updateStudyTask);
router.delete('/tasks/:taskId', deleteStudyTask);

export default router;
