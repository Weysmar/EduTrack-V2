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
import searchRoutes from './searchRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profiles', authMiddleware, profileRoutes);
router.use('/courses', authMiddleware, courseRoutes);
router.use('/items', authMiddleware, itemRoutes);
router.use('/folders', authMiddleware, folderRoutes);
router.use('/flashcards', authMiddleware, flashcardRoutes);
router.use('/summaries', authMiddleware, summaryRoutes);
router.use('/quizzes', authMiddleware, quizRoutes);
router.use('/storage', storageRoutes);
router.use('/ai', authMiddleware, aiRoutes);
router.use('/extract', authMiddleware, extractionRoutes);
router.use('/planning', authMiddleware, planningRoutes);
router.use('/plans', authMiddleware, studyPlanRoutes);
router.use('/analytics', authMiddleware, analyticsRoutes);
router.use('/mindmaps', authMiddleware, mindmapRoutes);
router.use('/finance', authMiddleware, financeRoutes);
router.use('/calendar', authMiddleware, calendarRoutes);
router.use('/search', authMiddleware, searchRoutes);

export default router;
