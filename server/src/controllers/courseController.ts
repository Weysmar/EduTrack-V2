import { Request, Response } from 'express';
import { socketService } from '../services/socketService';

import { prisma } from '../lib/prisma';
interface AuthRequest extends Request {
    user?: { id: string };
}

// GET /api/courses
export const getCourses = async (req: AuthRequest, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            where: { profileId: req.user!.id },
            include: {
                folder: true,
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(courses);
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
export const deleteCourse = async (req: AuthRequest, res: Response) => {
    try {
        const result = await prisma.course.deleteMany({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (result.count === 0) return res.status(404).json({ message: 'Course not found' });

        // Notify clients
        socketService.emitToProfile(req.user!.id, 'course:deleted', { id: req.params.id });

        res.json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error });
    }
};
