import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CashflowForecastService } from '../services/cashflowForecastService';

export const getForecast = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const days = Math.min(Math.max(parseInt(req.query.days as string) || 90, 7), 365);

        const forecast = await CashflowForecastService.generateForecast(profileId, days);
        res.json(forecast);
    } catch (error: any) {
        console.error('[Forecast] Error:', error);
        res.status(500).json({ error: 'Failed to generate forecast', details: error.message });
    }
};
