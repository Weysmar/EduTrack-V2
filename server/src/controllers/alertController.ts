import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AlertEngine } from '../services/alertEngine';

export const getAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const alerts = await prisma.financeAlert.findMany({
            where: { profileId, isDismissed: false },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(alerts);
    } catch (error: any) {
        console.error('[Alerts] Get Error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        await prisma.financeAlert.updateMany({
            where: { id, profileId },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error('[Alerts] Read Error:', error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
};

export const dismissAlert = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        await prisma.financeAlert.updateMany({
            where: { id, profileId },
            data: { isDismissed: true }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error('[Alerts] Dismiss Error:', error);
        res.status(500).json({ error: 'Failed to dismiss alert' });
    }
};

export const checkAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const count = await AlertEngine.checkAlerts(profileId);
        res.json({ newAlerts: count });
    } catch (error: any) {
        console.error('[Alerts] Check Error:', error);
        res.status(500).json({ error: 'Failed to check alerts' });
    }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const count = await prisma.financeAlert.count({
            where: { profileId, isRead: false, isDismissed: false }
        });
        res.json({ count });
    } catch (error: any) {
        console.error('[Alerts] Unread Count Error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};
