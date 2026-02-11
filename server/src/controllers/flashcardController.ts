import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { socketService } from '../services/socketService';
import { incrementAIGeneration } from './profileController';

// GET /api/flashcards?courseId=xx
export const getFlashcardSets = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const where: any = { profileId: req.user!.id };
        if (courseId) where.courseId = String(courseId);

        const sets = await prisma.flashcardSet.findMany({
            where,
            include: { flashcards: true }, // Include cards? Or fetch separately?
            orderBy: { createdAt: 'desc' }
        });
        res.json(sets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flashcard sets', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};

// GET /api/flashcards/:id
export const getFlashcardSet = async (req: AuthRequest, res: Response) => {
    try {
        const set = await prisma.flashcardSet.findFirst({
            where: { id: req.params.id, profileId: req.user!.id },
            include: { flashcards: true }
        });
        if (!set) return res.status(404).json({ message: 'Set not found' });
        res.json(set);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flashcard set', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};

// POST /api/flashcards
export const createFlashcardSet = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, courseId, itemId, cards } = req.body; // cards optional initial array

        const set = await prisma.flashcardSet.create({
            data: {
                profileId: req.user!.id,
                name,
                description,
                courseId,
                itemId,
                count: cards ? cards.length : 0,
                flashcards: cards ? {
                    create: cards.map((c: any) => ({
                        front: c.front,
                        back: c.back,
                        nextReview: new Date(),
                        interval: 1,
                        easeFactor: 2.5
                    }))
                } : undefined
            },
            include: { flashcards: true }
        });

        // Increment AI counter if cards were generated (they contain AI-generated content)
        if (cards && cards.length > 0) {
            await incrementAIGeneration(req.user!.id);
        }

        socketService.emitToProfile(req.user!.id, 'flashcardSet:created', set);
        res.status(201).json(set);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating flashcard set', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};

// DELETE /api/flashcards/:id
export const deleteFlashcardSet = async (req: AuthRequest, res: Response) => {
    try {
        const set = await prisma.flashcardSet.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });
        if (!set) return res.status(404).json({ message: 'Set not found' });

        await prisma.flashcardSet.delete({ where: { id: set.id } });

        socketService.emitToProfile(req.user!.id, 'flashcardSet:deleted', { id: set.id, courseId: set.courseId });
        res.json({ message: 'Set deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting set', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};

// POST /api/flashcards/:id/study
// Update study progress for multiple cards
export const updateStudyProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { updates } = req.body; // Array of { cardId, easeFactor, interval, nextReview }
        const setId = req.params.id;

        // Verify ownership access to set slightly redundant if we trust cardIds, but safer
        const set = await prisma.flashcardSet.findFirst({ where: { id: setId, profileId: req.user!.id } });
        if (!set) return res.status(403).json({ message: 'Access denied' });

        const operations = updates.map((u: any) =>
            prisma.flashcard.update({
                where: { id: u.cardId },
                data: {
                    easeFactor: u.easeFactor,
                    interval: u.interval,
                    nextReview: u.nextReview,
                    lastReviewed: new Date()
                }
            })
        );

        await prisma.$transaction(operations);

        // Update set statistics (mastered count)
        // Simple logic: If interval > 21 days (mature), count as mastered? Or based on user logic.
        // Let's just recount "mastered" based on interval > 21
        const masteredCount = await prisma.flashcard.count({
            where: { setId, interval: { gt: 21 } }
        });

        await prisma.flashcardSet.update({
            where: { id: setId },
            data: { mastered: masteredCount }
        });

        socketService.emitToProfile(req.user!.id, 'flashcardSet:updated', { id: setId }); // Trigger refetch
        res.json({ message: 'Progress updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating progress', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};
