import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { incrementAIGeneration } from './profileController';

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
        const { itemId, itemType, content, stats, options, courseId } = req.body;
        // Use req.user.id because that's what's in the token and it IS the profile ID
        const profileId = req.user?.id;

        if (!profileId) return res.status(401).json({ error: "Profile not found" });

        // 1. Check if summary exists to get generatedItemId
        const existingSummary = await prisma.summary.findFirst({
            where: {
                profileId,
                itemId,
                itemType
            }
        });

        // 2. Resolve or Create the Standalone Item
        let generatedItemId = existingSummary?.generatedItemId;

        // Fetch source item title for naming
        let sourceTitle = "Document";
        if (itemId) {
            const sourceItem = await prisma.item.findUnique({
                where: { id: itemId },
                select: { title: true, fileName: true }
            });
            if (sourceItem) sourceTitle = sourceItem.title || sourceItem.fileName || "Document";
        }

        const summaryTitle = `Résumé : ${sourceTitle}`;

        if (generatedItemId) {
            // Update existing Item
            await prisma.item.update({
                where: { id: generatedItemId },
                data: {
                    content,
                    title: summaryTitle,
                    updatedAt: new Date()
                }
            }).catch(async () => {
                // If update fails (e.g. item deleted), recreate it
                generatedItemId = undefined;
            });
        }

        if (!generatedItemId) {
            // Create new Item
            const newItem = await prisma.item.create({
                data: {
                    profileId,
                    courseId: courseId || (existingSummary?.courseId) || "", // Should have courseId
                    type: 'summary',
                    title: summaryTitle,
                    content: content,
                    status: 'generated'
                }
            });
            generatedItemId = newItem.id;
        }

        // 3. Upsert Summary Record with link to Item
        // Delete existing to handle upsert cleanly or just update
        // Logic from before was deleteMany, but we want to preserve ID if possible? 
        // Actually the previous logic was deleteMany then create. Let's stick to that but keeping the link maybe?
        // No, let's use upsert or just deleteMany as before but pass generatedItemId.

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
                courseId,
                itemId,
                itemType,
                content,
                stats,
                options,
                generatedItemId // Link to the standalone item
            }
        });

        // Increment AI counter for summary generation
        await incrementAIGeneration(profileId);

        res.json(summary);
    } catch (error) {
        console.error("Save Summary Error:", error);
        res.status(500).json({ error: "Failed to save summary" });
    }
};

export const getSummaries = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const profileId = req.user?.id;

        if (!profileId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { profileId };
        if (courseId) {
            where.courseId = String(courseId);
        }

        const summaries = await prisma.summary.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(summaries);
    } catch (error) {
        console.error("Get Summaries Error:", error);
        res.status(500).json({ error: "Failed to fetch summaries" });
    }

};

export const deleteSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user?.id;

        if (!profileId) return res.status(401).json({ error: "Unauthorized" });

        const summary = await prisma.summary.findUnique({
            where: { id }
        });

        if (!summary) return res.status(404).json({ error: "Summary not found" });
        if (summary.profileId !== profileId) return res.status(403).json({ error: "Forbidden" });

        // Optionally delete the generated item linked to this summary
        if (summary.generatedItemId) {
            await prisma.item.delete({
                where: { id: summary.generatedItemId }
            }).catch(e => console.error("Failed to delete generated item linked to summary", e));
        }

        await prisma.summary.delete({
            where: { id }
        });

        res.json({ message: "Summary deleted successfully" });
    } catch (error) {
        console.error("Delete Summary Error:", error);
        res.status(500).json({ error: "Failed to delete summary" });
    }
};
