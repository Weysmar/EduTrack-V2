import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AutoRuleEngine } from '../services/autoRuleEngine';

// --- CRUD ---

export const getRules = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const rules = await prisma.autoCategorizeRule.findMany({
            where: { profileId },
            orderBy: { priority: 'asc' }
        });
        res.json(rules);
    } catch (error: any) {
        console.error('[Rules] Get Error:', error);
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
};

export const createRule = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { name, conditions, categoryName, priority } = req.body;

        if (!name || !conditions || !categoryName) {
            return res.status(400).json({ error: 'Name, conditions, and categoryName are required' });
        }

        // Validate conditions format
        if (!Array.isArray(conditions) || conditions.length === 0) {
            return res.status(400).json({ error: 'At least one condition is required' });
        }

        const rule = await prisma.autoCategorizeRule.create({
            data: {
                profileId,
                name,
                conditions,
                categoryName,
                priority: priority || 0
            }
        });

        res.status(201).json(rule);
    } catch (error: any) {
        console.error('[Rules] Create Error:', error);
        res.status(500).json({ error: 'Failed to create rule', details: error.message });
    }
};

export const updateRule = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;
        const { name, conditions, categoryName, priority, isActive } = req.body;

        const rule = await prisma.autoCategorizeRule.updateMany({
            where: { id, profileId },
            data: {
                ...(name !== undefined && { name }),
                ...(conditions !== undefined && { conditions }),
                ...(categoryName !== undefined && { categoryName }),
                ...(priority !== undefined && { priority }),
                ...(isActive !== undefined && { isActive })
            }
        });

        if (rule.count === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const updated = await prisma.autoCategorizeRule.findFirst({ where: { id, profileId } });
        res.json(updated);
    } catch (error: any) {
        console.error('[Rules] Update Error:', error);
        res.status(500).json({ error: 'Failed to update rule', details: error.message });
    }
};

export const deleteRule = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        const result = await prisma.autoCategorizeRule.deleteMany({
            where: { id, profileId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('[Rules] Delete Error:', error);
        res.status(500).json({ error: 'Failed to delete rule', details: error.message });
    }
};

// --- Test Rule ---

export const testRule = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { conditions } = req.body;

        if (!Array.isArray(conditions) || conditions.length === 0) {
            return res.status(400).json({ error: 'At least one condition is required' });
        }

        const result = await AutoRuleEngine.testRule(profileId, conditions);
        res.json(result);
    } catch (error: any) {
        console.error('[Rules] Test Error:', error);
        res.status(500).json({ error: 'Failed to test rule', details: error.message });
    }
};
