import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/storageService';
import { socketService } from '../services/socketService';

const prisma = new PrismaClient();
interface AuthRequest extends Request {
    user?: { id: string };
    file?: Express.Multer.File;
}

// GET /api/items?courseId=xxx
export const getItems = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;

        const where: any = {
            profileId: req.user!.id
        };
        if (courseId) {
            where.courseId = String(courseId);
        }

        const items = await prisma.item.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error });
    }
};

// POST /api/items
export const createItem = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Creating item with body:', req.body);
        const { courseId, type, title, content, status, difficulty, tags } = req.body;
        let fileUrl = null;
        let storageKey = null;
        let fileName = null;
        let fileSize = null;

        if (req.file) {
            const uploadResult = await storageService.uploadFile(req.file);
            fileUrl = uploadResult.url;
            storageKey = uploadResult.key;
            fileName = req.file.originalname;
            fileSize = req.file.size;
        }

        const item = await prisma.item.create({
            data: {
                profileId: req.user!.id,
                courseId,
                type: type || 'note',
                title,
                content,
                status,
                difficulty,
                tags: tags ? JSON.parse(tags) : [],
                fileUrl,
                storageKey,
                fileName,
                fileSize: fileSize ? parseInt(String(fileSize)) : null
            }
        });

        socketService.emitToProfile(req.user!.id, 'item:created', item);

        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Error creating item', error });
    }
};

// DELETE /api/items/:id
export const deleteItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.storageKey) {
            await storageService.deleteFile(item.storageKey);
        }

        await prisma.item.delete({ where: { id: item.id } });

        socketService.emitToProfile(req.user!.id, 'item:deleted', { id: item.id, courseId: item.courseId });

        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
    }
};

// POST /api/items/:id/upload
export const uploadItemFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.storageKey) {
            await storageService.deleteFile(item.storageKey);
        }

        const { url, key } = await storageService.uploadFile(req.file);

        const updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: {
                fileUrl: url,
                storageKey: key,
                fileName: req.file.originalname,
                fileSize: req.file.size
            }
        });

        socketService.emitToProfile(req.user!.id, 'item:updated', updatedItem);

        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading file', error });
    }
};
