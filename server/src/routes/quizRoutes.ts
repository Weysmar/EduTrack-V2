import { Router } from 'express';
import { getQuizzes, getQuiz, createQuiz, deleteQuiz, submitQuizResult } from '../controllers/quizController';
import { authenticate } from '../middleware/auth';
import { aiRateLimit } from '../middleware/aiRateLimit';

const router = Router();

router.use(authenticate);

router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.post('/', aiRateLimit, createQuiz);
router.delete('/:id', deleteQuiz);
router.post('/:id/submit', submitQuizResult);

export default router;
