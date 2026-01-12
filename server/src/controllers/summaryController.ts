import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getSummary = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id; // Use id directly as it corresponds to Profile.id
        const { itemId } = req.query;

        if (!itemId) {
            return res.status(400).json({ error: "ItemId required" });
        }

        const summary = await prisma.summary.findFirst({
            where: {
                profileId: userId, // Use userId
                itemId: String(itemId)
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(summary || null);
    } catch (error) {
        console.error("Get Summary Error:", error);
        res.status(500).json({ error: "Failed to fetch summary" });
    }
};

export const saveSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { itemId, itemType, content, stats, options } = req.body;
        // Use req.user.id because that's what's in the token and it IS the profile ID
        const profileId = req.user?.id;

        if (!profileId) return res.status(401).json({ error: "Profile not found" });

        // Delete existing?
        await prisma.summary.deleteMany({
            where: {
                profileId,
                itemId,
                itemType
            }
        });

        const summary = await prisma.summary.create({
            data: {
                profileId,
                itemId,
                itemType,
                content,
                stats,
                options
            }
        });

        res.json(summary);
    } catch (error) {
        console.error("Save Summary Error:", error);
        res.status(500).json({ error: "Failed to save summary" });
    }
};
