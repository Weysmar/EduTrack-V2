import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MonthlyReportService } from '../services/monthlyReportService';

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid year or month parameters' });
        }

        const report = await MonthlyReportService.generateReport(profileId, month, year);
        res.json(report);
    } catch (error: any) {
        console.error('[Report] Error:', error);
        res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
};
