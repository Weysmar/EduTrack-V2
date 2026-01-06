import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
// import { authenticate } from '../middleware/auth'; 

const router = Router();

// Retrieve Weekly Goals
router.get('/goals', AnalyticsController.getWeeklyGoals);

// Create Weekly Goal
router.post('/goals', AnalyticsController.createWeeklyGoal);

// Update Weekly Goal
router.put('/goals/:id', AnalyticsController.updateWeeklyGoal);

// Record Session
router.post('/sessions', AnalyticsController.recordSession);

// Update Performances
router.post('/topics', AnalyticsController.updateTopicPerformance);
router.post('/questions', AnalyticsController.updateQuestionPerformance);

// Achievements
router.get('/achievements', AnalyticsController.getAchievements);
router.post('/achievements', AnalyticsController.unlockAchievement);

export default router;
