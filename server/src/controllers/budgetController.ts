import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const budgets = await prisma.budget.findMany({
            where: { profileId: userId },
            include: {
                category: true
            }
        });

        res.json(budgets);
    } catch (error) {
        console.error('Get budgets error:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { categoryId, amount, period } = req.body;

        if (!categoryId || !amount) {
            return res.status(400).json({ error: 'Category ID and amount are required' });
        }

        // Check availability of category
        const category = await prisma.transactionCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if budget already exists for this category
        const existingBudget = await prisma.budget.findFirst({
            where: {
                profileId: userId,
                categoryId: categoryId
            }
        });

        if (existingBudget) {
            return res.status(400).json({ error: 'Budget already exists for this category' });
        }

        const budget = await prisma.budget.create({
            data: {
                profileId: userId,
                categoryId,
                amount,
                period: period || 'MONTHLY'
            },
            include: {
                category: true
            }
        });

        res.json(budget);
    } catch (error) {
        console.error('Create budget error:', error);
        res.status(500).json({ error: 'Failed to create budget' });
    }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const { amount, period } = req.body;

        const budget = await prisma.budget.findUnique({
            where: { id }
        });

        if (!budget || budget.profileId !== userId) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        const updatedBudget = await prisma.budget.update({
            where: { id },
            data: {
                amount: amount !== undefined ? amount : undefined,
                period: period !== undefined ? period : undefined
            },
            include: {
                category: true
            }
        });

        res.json(updatedBudget);
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({ error: 'Failed to update budget' });
    }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const budget = await prisma.budget.findUnique({
            where: { id }
        });

        if (!budget || budget.profileId !== userId) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        await prisma.budget.delete({
            where: { id }
        });

        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({ error: 'Failed to delete budget' });
    }
};
