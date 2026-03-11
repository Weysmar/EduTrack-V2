import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SavingsGoalService } from '../services/savingsGoalService';

// GET /api/finance/goals
export const getGoals = async (req: AuthRequest, res: Response) => {
    try {
        const goals = await SavingsGoalService.getGoals(req.user!.id);
        res.json(goals);
    } catch (error) {
        console.error('Get Goals Error:', error);
        res.status(500).json({ message: 'Error fetching savings goals' });
    }
};

// POST /api/finance/goals
export const createGoal = async (req: AuthRequest, res: Response) => {
    try {
        const { name, targetAmount, deadline, icon, color } = req.body;
        if (!name || !targetAmount) {
            return res.status(400).json({ message: 'Name and targetAmount are required' });
        }
        const goal = await SavingsGoalService.createGoal(req.user!.id, {
            name,
            targetAmount: Number(targetAmount),
            deadline,
            icon,
            color
        });
        res.status(201).json(goal);
    } catch (error) {
        console.error('Create Goal Error:', error);
        res.status(500).json({ message: 'Error creating savings goal' });
    }
};

// PUT /api/finance/goals/:id
export const updateGoal = async (req: AuthRequest, res: Response) => {
    try {
        const goal = await SavingsGoalService.updateGoal(req.user!.id, req.params.id, req.body);
        res.json(goal);
    } catch (error: any) {
        console.error('Update Goal Error:', error);
        if (error.message === 'Goal not found') {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.status(500).json({ message: 'Error updating savings goal' });
    }
};

// DELETE /api/finance/goals/:id
export const deleteGoal = async (req: AuthRequest, res: Response) => {
    try {
        await SavingsGoalService.deleteGoal(req.user!.id, req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete Goal Error:', error);
        if (error.message === 'Goal not found') {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.status(500).json({ message: 'Error deleting savings goal' });
    }
};

// GET /api/finance/goals/:id/projection
export const getGoalProjection = async (req: AuthRequest, res: Response) => {
    try {
        const projection = await SavingsGoalService.getProjection(req.user!.id, req.params.id);
        res.json(projection);
    } catch (error: any) {
        console.error('Get Projection Error:', error);
        if (error.message === 'Goal not found') {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.status(500).json({ message: 'Error getting projection' });
    }
};

// POST /api/finance/goals/recalculate
export const recalculateGoals = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SavingsGoalService.recalculateProgress(req.user!.id);
        res.json(result);
    } catch (error) {
        console.error('Recalculate Goals Error:', error);
        res.status(500).json({ message: 'Error recalculating goals' });
    }
};

// GET /api/finance/savings-rate
export const getSavingsRate = async (req: AuthRequest, res: Response) => {
    try {
        const rate = await SavingsGoalService.getSavingsRate(req.user!.id);
        res.json(rate);
    } catch (error) {
        console.error('Savings Rate Error:', error);
        res.status(500).json({ message: 'Error calculating savings rate' });
    }
};
