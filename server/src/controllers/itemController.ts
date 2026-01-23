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

        res.set('Cache-Control', 'no-store');
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error });
    }
};

// GET /api/items/:id
export const getItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching item', error });
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

            // Generate Thumbnail
            const thumbnailBuffer = await storageService.generateThumbnail(req.file);
            if (thumbnailBuffer) {
                const thumbFile = {
                    ...req.file,
                    buffer: thumbnailBuffer,
                    originalname: `thumb-${req.file.originalname.split('.')[0]}.webp`,
                    mimetype: 'image/webp'
                } as Express.Multer.File;

                const thumbUpload = await storageService.uploadFile(thumbFile);
                // We could add thumbnailUrl to item data here
                // But I need to define thumbnailUrl variable first
            }
        }

        let thumbnailUrl = null;
        if (req.file) {
            const thumbnailBuffer = await storageService.generateThumbnail(req.file);
            if (thumbnailBuffer) {
                const thumbFile = {
                    ...req.file,
                    buffer: thumbnailBuffer,
                    originalname: `thumb-${req.file.originalname.replace(/\.[^/.]+$/, "")}.webp`,
                    mimetype: 'image/webp'
                } as Express.Multer.File;

                const thumbUpload = await storageService.uploadFile(thumbFile);
                thumbnailUrl = thumbUpload.url;
            }
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
                fileSize: fileSize ? parseInt(String(fileSize)) : null,
                thumbnailUrl
            }
        });

        socketService.emitToProfile(req.user!.id, 'item:created', item);

        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Error creating item', error });
    }
};

// PUT /api/items/:id
export const updateItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        const updateData: any = { ...req.body };

        // Sanitize data: remove 'file' property which comes from FormData implies by multer/body-parser but is not in Prisma schema
        console.log("Before sanitize:", Object.keys(updateData));
        delete updateData.file;
        console.log("After sanitize:", Object.keys(updateData));

        // Ensure fileSize is Int if present (from body, before potential overwrite)
        if (updateData.fileSize && typeof updateData.fileSize === 'string') {
            updateData.fileSize = parseInt(updateData.fileSize, 10);
        }

        // Handle File Replacement
        if (req.file) {
            // Delete old file and thumbnail if exists
            if (item.storageKey) {
                await storageService.deleteFile(item.storageKey).catch(err =>
                    console.error("Failed to delete old file during update:", err)
                );
            }
            // Logic to delete old thumbnail? We don't verify if it exists but usually it shares a pattern or we should have stored key. 
            // For now, simpler to just upload new. Optimally we should store thumbnailKey.

            // Upload new file
            const uploadResult = await storageService.uploadFile(req.file);
            updateData.fileUrl = uploadResult.url;
            updateData.storageKey = uploadResult.key;
            updateData.fileName = req.file.originalname;
            updateData.fileSize = req.file.size;
            updateData.fileType = req.file.mimetype;

            // Generate Thumbnail
            const thumbnailBuffer = await storageService.generateThumbnail(req.file);
            if (thumbnailBuffer) {
                const thumbFile = {
                    ...req.file,
                    buffer: thumbnailBuffer,
                    originalname: `thumb-${req.file.originalname.replace(/\.[^/.]+$/, "")}.webp`,
                    mimetype: 'image/webp'
                } as Express.Multer.File;

                const thumbUpload = await storageService.uploadFile(thumbFile);
                updateData.thumbnailUrl = thumbUpload.url;
            } else {
                updateData.thumbnailUrl = null; // Reset if not an image or fails
            }
        }

        const updatedItem = await prisma.item.update({
            where: { id: req.params.id },
            data: updateData
        });

        socketService.emitToProfile(req.user!.id, 'item:updated', updatedItem);

        res.json(updatedItem);
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ message: 'Error updating item', error });
    }
};

// DELETE /api/items/:id
export const deleteItem = async (req: AuthRequest, res: Response) => {
    try {
        // BYPASS PROFILE CHECK FOR GHOST ITEMS
        const item = await prisma.item.findUnique({
            where: { id: req.params.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.storageKey) {
            await storageService.deleteFile(item.storageKey);
        }

        // Cascade delete: Remove any Summary linked to this item as generatedItemId
        await prisma.summary.deleteMany({
            where: { generatedItemId: item.id }
        });

        await prisma.item.delete({ where: { id: item.id } });

        socketService.emitToProfile(req.user!.id, 'item:deleted', { id: item.id, courseId: item.courseId });

        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
    }
};

// POST /api/items/bulk/delete
export const bulkDeleteItems = async (req: AuthRequest, res: Response) => {
    try {
        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        // 1. Find items (BYPASS PROFILE CHECK to fix ghost items)
        const items = await prisma.item.findMany({
            where: {
                id: { in: itemIds }
            }
        });

        if (items.length === 0) {
            console.log("Bulk delete: Items not found in DB, assuming already deleted.");
            // Return success to allow frontend to update/invalidate cache
            return res.json({ message: 'Items already deleted', count: 0 });
        }

        const validIds = items.map(i => i.id);

        // 2. Delete files from storage
        const deletePromises = items
            .filter(item => item.storageKey)
            .map(item => storageService.deleteFile(item.storageKey!));

        await Promise.allSettled(deletePromises);

        // 3. Cascade delete summaries
        // A. Delete summaries where this item was the GENERATED item (e.g. deleting a Note/Summary)
        await prisma.summary.deleteMany({
            where: {
                generatedItemId: { in: validIds }
            }
        });

        // B. Delete summaries where this item was the SOURCE item (e.g. deleting a PDF)
        await prisma.summary.deleteMany({
            where: {
                itemId: { in: validIds }
            }
        });

        // C. Delete FlashcardSets linked to this item
        await prisma.flashcardSet.deleteMany({
            where: {
                itemId: { in: validIds }
            }
        });

        // 4. Delete from DB with Fallback Strategy
        try {
            await prisma.item.deleteMany({
                where: {
                    id: { in: validIds }
                }
            });
        } catch (error) {
            console.error("Bulk deleteMany failed, switching to sequential deletion:", error);
            // Fallback: Delete one by one to isolate the problematic item
            let deletedCount = 0;
            const errors = [];

            for (const id of validIds) {
                try {
                    await prisma.item.delete({ where: { id } });
                    deletedCount++;
                } catch (e: any) {
                    console.error(`Failed to delete item ${id}:`, e.message);
                    errors.push({ id, error: e.message });
                }
            }

            if (deletedCount === 0) {
                throw new Error(`Failed to delete items. Errors: ${JSON.stringify(errors)}`);
            }
            console.log(`Sequential delete finished. Deleted: ${deletedCount}/${validIds.length}`);
        }

        // 4. Notify client
        socketService.emitToProfile(req.user!.id, 'items:bulk-deleted', { ids: validIds });

        console.log(`Bulk deleted ${validIds.length} items`);
        res.json({ message: 'Items deleted successfully', count: validIds.length });
    } catch (error) {
        console.error('Error bulk deleting items:', error);
        res.status(500).json({ message: 'Error deleting items', error });
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
