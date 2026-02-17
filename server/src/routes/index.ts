import { Router } from 'express';
import authRoutes from './authRoutes';
import courseRoutes from './courseRoutes';
import itemRoutes from './itemRoutes';
import folderRoutes from './folderRoutes';
import flashcardRoutes from './flashcardRoutes';
import quizRoutes from './quizRoutes';
import summaryRoutes from './summaryRoutes';
import storageRoutes from './storageRoutes';
import aiRoutes from './aiRoutes';
import extractionRoutes from './extractionRoutes';
import { authenticate as authMiddleware } from '../middleware/auth';

import planningRoutes from './planningRoutes';
import studyPlanRoutes from './studyPlanRoutes';
import profileRoutes from './profileRoutes';

import analyticsRoutes from './analyticsRoutes';
import mindmapRoutes from './mindmapRoutes';
import financeRoutes from './financeRoutes';
import calendarRoutes from './calendarRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/courses', courseRoutes);
router.use('/items', itemRoutes);
router.use('/folders', folderRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/summaries', summaryRoutes);
router.use('/quizzes', quizRoutes);
router.use('/storage', storageRoutes);
router.use('/ai', aiRoutes);
router.use('/extract', extractionRoutes);
router.use('/planning', planningRoutes);
router.use('/plans', studyPlanRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/mindmaps', mindmapRoutes);
router.use('/finance', authMiddleware, financeRoutes);
router.use('/calendar', calendarRoutes);

export default router;
