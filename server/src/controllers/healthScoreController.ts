import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { HealthScoreService } from '../services/healthScoreService';

export const getHealthScore = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const result = await HealthScoreService.calculateScore(profileId);
        res.json(result);
    } catch (error: any) {
        console.error('[HealthScore] Error:', error);
        res.status(500).json({ error: 'Failed to calculate health score', details: error.message });
    }
};
