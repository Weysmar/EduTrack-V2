import { Router } from 'express';
import authRoutes from './authRoutes';
import courseRoutes from './courseRoutes';
import itemRoutes from './itemRoutes';
import folderRoutes from './folderRoutes';
import flashcardRoutes from './flashcardRoutes';
import quizRoutes from './quizRoutes';
import summaryRoutes from './summaryRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/items', itemRoutes);
router.use('/folders', folderRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/summaries', summaryRoutes);
router.use('/quizzes', quizRoutes);

export default router;
