import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { incrementAIGeneration } from './profileController';

import { prisma } from '../lib/prisma';

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
                OR: [
                    { itemId: String(itemId) },
                    { generatedItemId: String(itemId) },
                    { id: String(itemId) }
                ]
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
        if (generatedItemId === itemId) {
            generatedItemId = undefined;
        }

        // Fetch source item title for naming
        let sourceTitle = "Document";
        if (itemId) {
            const sourceItem = await prisma.item.findUnique({
                where: { id: itemId },
                select: { title: true, fileName: true }
            });
            if (sourceItem) {
                sourceTitle = sourceItem.title || sourceItem.fileName || "Document";
            } else if (itemType === 'course' || (courseId && itemId === courseId)) {
                const targetCourseId = courseId || itemId;
                const course = await prisma.course.findUnique({
                    where: { id: targetCourseId },
                    select: { title: true }
                });
                if (course?.title) sourceTitle = course.title;
            }
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

        // Lookup summary by primary key id, or fallback to itemId / generatedItemId
        let summary = await prisma.summary.findUnique({
            where: { id }
        });

        if (!summary) {
            summary = await prisma.summary.findFirst({
                where: {
                    profileId,
                    OR: [
                        { itemId: id },
                        { generatedItemId: id }
                    ]
                }
            });
        }

        if (!summary) return res.status(404).json({ error: "Summary not found" });
        if (summary.profileId !== profileId) return res.status(403).json({ error: "Forbidden" });

        // CRITICAL SAFETY CHECK: NEVER delete the source item (summary.itemId)!
        // Only delete the standalone item if generatedItemId is defined and DIFFERENT from itemId
        if (summary.generatedItemId && summary.generatedItemId !== summary.itemId && summary.generatedItemId !== id) {
            await prisma.item.delete({
                where: { id: summary.generatedItemId }
            }).catch(e => console.warn("Generated item already deleted or missing", e));
        }

        // If the 'id' parameter was the standalone item itself, delete it
        if (id === summary.generatedItemId) {
            await prisma.item.delete({
                where: { id }
            }).catch(e => console.warn("Generated item already deleted", e));
        }

        await prisma.summary.delete({
            where: { id: summary.id }
        });

        res.json({ message: "Summary deleted successfully" });
    } catch (error) {
        console.error("Delete Summary Error:", error);
        res.status(500).json({ error: "Failed to delete summary" });
    }
};
