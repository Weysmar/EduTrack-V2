import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
// import { authenticate } from '../middleware/auth'; 

const router = Router();


// Record Session
router.get('/sessions', AnalyticsController.getSessions);
router.post('/sessions', AnalyticsController.recordSession);

// Update Performances
router.post('/topics', AnalyticsController.updateTopicPerformance);
router.post('/questions', AnalyticsController.updateQuestionPerformance);

// Achievements
router.get('/achievements', AnalyticsController.getAchievements);
router.post('/achievements', AnalyticsController.unlockAchievement);

export default router;
