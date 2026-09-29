import { Request, Response } from 'express';
import { socketService } from '../services/socketService';
import { storageService } from '../services/storageService';

import { prisma } from '../lib/prisma';
interface AuthRequest extends Request {
    user?: { id: string };
}

// GET /api/courses?page=1&limit=20
export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const where = { profileId: req.user!.id };

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                where,
                include: {
                    folder: true,
                    _count: { select: { items: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.course.count({ where })
        ]);

        res.json({
            courses,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error });
    }
};

// GET /api/courses/:id
export const getCourse = async (req: AuthRequest, res: Response) => {
    try {
        console.log(`[DEBUG] GetCourse: ${req.params.id} for user ${req.user?.id}`);
        const course = await prisma.course.findFirst({
            where: { id: req.params.id, profileId: req.user!.id },
            include: { folder: true, items: true }
        });

        if (!course) {
            console.log(`[DEBUG] Course not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        console.error('[DEBUG] Error fetching course:', error);
        res.status(500).json({ message: 'Error fetching course', error });
    }
};

// POST /api/courses
export const createCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, color, icon, folderId, isFavorite } = req.body;

        const course = await prisma.course.create({
            data: {
                profileId: req.user!.id,
                title,
                description: description || '',
                color: color || '#3b82f6',
                icon: icon || '📚',
                folderId,
                isFavorite: isFavorite || false
            }
        });

        // Notify clients
        socketService.emitToProfile(req.user!.id, 'course:created', course);

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error creating course', error });
    }
};

// PUT /api/courses/:id
export const updateCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, color, icon, folderId, isFavorite } = req.body;

        const course = await prisma.course.updateMany({
            where: { id: req.params.id, profileId: req.user!.id },
            data: {
                title,
                description,
                color,
                icon,
                folderId,
                isFavorite
            }
        });

        if (course.count === 0) return res.status(404).json({ message: 'Course not found' });

        const updatedCourse = await prisma.course.findUnique({ where: { id: req.params.id } });

        // Notify clients
        socketService.emitToProfile(req.user!.id, 'course:updated', updatedCourse);

        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: 'Error updating course', error });
    }
};

// DELETE /api/courses/:id
// Deleting a course is a hard, unrecoverable delete of every item it contains (the trash/soft-delete
// system only exists at the item level — a course's items don't go through it). Since that cascade
// used to bypass application cleanup entirely, it left the physical files in storage forever
// (never removed) and orphaned Summary/FlashcardSet rows (no DB-level FK on those, so no cascade
// cleans them up either). We now clean up both explicitly before letting the cascade delete run,
// mirroring what permanentDeleteItem already does for a single item.
export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const course = await prisma.course.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!course) return res.status(404).json({ message: 'Course not found' });

        const items = await prisma.item.findMany({
            where: { courseId: course.id },
            select: { id: true, storageKey: true }
        });

        for (const item of items) {
            if (item.storageKey) {
                await storageService.deleteFile(item.storageKey).catch(err =>
                    console.warn('Failed to delete physical file during course deletion:', err)
                );
            }
        }

        const itemIds = items.map(i => i.id);
        if (itemIds.length > 0) {
            await prisma.summary.deleteMany({
                where: { OR: [{ itemId: { in: itemIds } }, { generatedItemId: { in: itemIds } }] }
            }).catch(() => {});

            await prisma.flashcardSet.deleteMany({
                where: { itemId: { in: itemIds } }
            }).catch(() => {});
        }

        const result = await prisma.course.deleteMany({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (result.count === 0) return res.status(404).json({ message: 'Course not found' });

        // Notify clients
        socketService.emitToProfile(req.user!.id, 'course:deleted', { id: req.params.id });

        res.json({ message: 'Course deleted', itemsDeleted: items.length });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error });
    }
};
