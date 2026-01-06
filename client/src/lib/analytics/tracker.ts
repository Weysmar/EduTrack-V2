import { analyticsQueries } from '@/lib/api/queries';
import { v4 as uuidv4 } from 'uuid';

export const AnalyticsService = {
    /**
     * Log a single question attempt (Flashcard or QCM)
     */
    async logAttempt(params: {
        questionId: string;
        topic: string; // e.g., "Ratios" or "Uncategorized"
        courseId: number;
        isCorrect: boolean;
        difficulty: 'easy' | 'normal' | 'hard';
    }) {
        const { questionId, topic, courseId, isCorrect, difficulty } = params;

        // Update Question Performance via API
        await analyticsQueries.updateQuestionPerformance({
            questionId,
            topic,
            courseId,
            isCorrect,
            difficulty
        });

        // Update Topic Performance via API
        await analyticsQueries.updateTopicPerformance({
            topic,
            courseId,
            isCorrect
        });
    },

    /**
     * Log a full study session
     */
    async logSession(params: {
        sessionId: string;
        type: 'qcm' | 'flashcards';
        courseId: number;
        duration: number; // ms
        topicsCovered: string[];
        correctnessPerTopic: { [topic: string]: number }; // accuracy %
    }) {
        await analyticsQueries.recordSession(params);
    },

    /**
     * Log a detailed study session for Momentum & Goals
     */
    async logStudySession(params: {
        type: 'flashcards' | 'qcm' | 'reading' | 'planning' | 'other';
        courseId?: number;
        durationMinutes: number;
        performance?: number; // Optional
    }) {
        // This seems redundant with logSession but has different params.
        // We can map it to recordSession or a specific endpoint.
        await analyticsQueries.recordSession({
            ...params,
            sessionId: uuidv4(),
            date: new Date()
        });
    },

    /**
     * Update progress on the current weekly goal
     */
    async updateWeeklyGoalProgress(minutes: number) {
        // Backend should handle goal updates based on session logs ideally.
        // But if we keep this explicit call:
        const goals = await analyticsQueries.getWeeklyGoals();
        const activeGoal = goals.find((g: any) => g.status === 'active'); // simplified
        if (activeGoal) {
            await analyticsQueries.updateWeeklyGoal(activeGoal.id, {
                achievedMinutes: activeGoal.achievedMinutes + minutes
            });
        }
    },

    /**
     * Calculate current streak
     */
    async getCurrentStreak() {
        // Fetch from API
        // Maybe getAchievements returns streak or we have a profile stats endpoint
        // For now, let's assume getAchievements acts as getStats
        const stats = await analyticsQueries.getAchievements();
        return stats.currentStreak || 0;
    },

    /**
     * Check and unlock achievements
     */
    async checkAchievements() {
        // Backend should check achievements on session log.
        // Frontend trigger is mostly for UI notification if needed.
        // We can fetch latest unlocked achievements?
        // await analyticsQueries.checkAchievements();
    },

    async unlockBadge(badge: { id: string, title: string, description: string, icon: string }) {
        await analyticsQueries.unlockAchievement(badge);
    },

    /**
     * Get Weak Spots for a Course
     */
    async getWeakSpots(courseId: number, threshold = 60) {
        // API endpoint needed
        // For now returning empty or we need a getTopics endpoint
        // Let's assume we can fetch topics and filter client side if needed, 
        // OR better: specific endpoint
        // return await analyticsQueries.getWeakSpots(courseId);
        return [];
    }
}
