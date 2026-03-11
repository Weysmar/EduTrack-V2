import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { RecurringDetectionService } from '../services/recurringDetectionService';

// GET /api/finance/recurring
export const getRecurring = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const recurring = await prisma.recurringTransaction.findMany({
            where: { profileId, isActive: true },
            orderBy: [{ type: 'asc' }, { averageAmount: 'desc' }]
        });

        res.json(recurring);
    } catch (error) {
        console.error('Get Recurring Error:', error);
        res.status(500).json({ message: 'Error fetching recurring transactions' });
    }
};

// POST /api/finance/recurring/detect
export const detectRecurring = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const result = await RecurringDetectionService.detectRecurrences(profileId);
        res.json(result);
    } catch (error) {
        console.error('Detect Recurring Error:', error);
        res.status(500).json({ message: 'Error detecting recurring transactions' });
    }
};

// PUT /api/finance/recurring/:id
export const updateRecurring = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;
        const { isPaused, category, isActive } = req.body;

        const existing = await prisma.recurringTransaction.findFirst({
            where: { id, profileId }
        });
        if (!existing) {
            return res.status(404).json({ message: 'Recurring transaction not found' });
        }

        const updated = await prisma.recurringTransaction.update({
            where: { id },
            data: {
                ...(isPaused !== undefined && { isPaused }),
                ...(category !== undefined && { category }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update Recurring Error:', error);
        res.status(500).json({ message: 'Error updating recurring transaction' });
    }
};

// DELETE /api/finance/recurring/:id
export const deleteRecurring = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        const existing = await prisma.recurringTransaction.findFirst({
            where: { id, profileId }
        });
        if (!existing) {
            return res.status(404).json({ message: 'Recurring transaction not found' });
        }

        await prisma.recurringTransaction.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Recurring Error:', error);
        res.status(500).json({ message: 'Error deleting recurring transaction' });
    }
};
