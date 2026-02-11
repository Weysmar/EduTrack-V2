import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth';

const DAILY_AI_LIMIT = 100;

export const aiRateLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: { aiGenerationsCount: true, lastAccessed: true }
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Optional: Reset counter daily
        const lastAccess = new Date(profile.lastAccessed);
        const now = new Date();
        const daysSinceLastAccess = Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24));

        let currentCount = profile.aiGenerationsCount || 0;

        // Reset if more than 24h since last access
        if (daysSinceLastAccess >= 1) {
            await prisma.profile.update({
                where: { id: userId },
                data: { aiGenerationsCount: 0 }
            });
            currentCount = 0;
        }

        // Check limit
        if (currentCount >= DAILY_AI_LIMIT) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `Vous avez atteint votre limite quotidienne de ${DAILY_AI_LIMIT} générations IA. Réessayez demain.`,
                limit: DAILY_AI_LIMIT,
                current: currentCount,
                resetAt: new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString()
            });
        }

        next();
    } catch (error) {
        console.error('[AI Rate Limit] Error:', error);
        next(); // Fail open (allow request if rate limit check fails)
    }
};
