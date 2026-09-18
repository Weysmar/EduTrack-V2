import { Request, Response } from 'express';
import { storageService } from '../services/storageService';
import { socketService } from '../services/socketService';
import { addOrUpdateExerciseAgendaTask, removeExerciseAgendaTask } from '../services/agendaService';

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
interface AuthRequest extends Request {
    user?: { id: string };
    file?: Express.Multer.File;
}

// GET /api/items?courseId=xxx&page=1&limit=20
export const getItems = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            profileId: req.user!.id,
            deletedAt: null
        };
        if (courseId) {
            where.courseId = String(courseId);
        }

        const [items, total] = await Promise.all([
            prisma.item.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.item.count({ where })
        ]);

        res.set('Cache-Control', 'no-store');
        res.json({
            items,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error });
    }
};

// GET /api/items/:id
export const getItem = async (req: AuthRequest, res: Response) => {
    try {
        let item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        // Fallback: If not found directly, check if the ID corresponds to a Summary or Course summary
        if (!item) {
            const summary = await prisma.summary.findFirst({
                where: {
                    profileId: req.user!.id,
                    OR: [
                        { id: req.params.id },
                        { generatedItemId: req.params.id },
                        { itemId: req.params.id }
                    ]
                }
            });

            if (summary) {
                // If summary has a generatedItemId, try finding it
                if (summary.generatedItemId) {
                    item = await prisma.item.findFirst({
                        where: { id: summary.generatedItemId, profileId: req.user!.id }
                    });
                }

                // If still no item, recreate the standalone summary item
                if (!item) {
                    let courseTitle = "Cours";
                    if (summary.courseId) {
                        const course = await prisma.course.findUnique({
                            where: { id: summary.courseId },
                            select: { title: true }
                        });
                        if (course?.title) courseTitle = course.title;
                    }

                    item = await prisma.item.create({
                        data: {
                            id: summary.generatedItemId || undefined,
                            profileId: req.user!.id,
                            courseId: summary.courseId || "",
                            type: 'summary',
                            title: `Résumé : ${courseTitle}`,
                            content: summary.content,
                            status: 'generated'
                        }
                    });

                    // Update summary with generatedItemId
                    await prisma.summary.update({
                        where: { id: summary.id },
                        data: { generatedItemId: item.id }
                    });
                }
            }
        }

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
        const { courseId, type, title, content, status, difficulty, tags, dueDate } = req.body;
        let fileUrl = req.body.fileUrl || null;
        let storageKey = null;
        let fileName = req.body.fileName || null;
        let fileSize = null;

        let thumbnailUrl = req.body.thumbnailUrl || null;
        let fileType = req.body.fileType || (type === 'link' ? 'text/html' : null);

        if (!req.file && type === 'link' && fileUrl) {
            try {
                const parsed = new URL(fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`);
                const domain = parsed.hostname.replace(/^www\./, '');
                if (!fileName) fileName = domain;
                if (!thumbnailUrl) {
                    thumbnailUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                }
            } catch {}
        }

        if (req.file) {
            const uploadResult = await storageService.uploadFile(req.file);
            fileUrl = uploadResult.url;
            storageKey = uploadResult.key;
            fileName = req.file.originalname;
            fileSize = req.file.size;
            fileType = req.file.mimetype;

            // Generate Thumbnail for images
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

        const parsedDueDate = dueDate ? new Date(dueDate) : null;

        const item = await prisma.item.create({
            data: {
                profileId: req.user!.id,
                courseId,
                type: type || 'note',
                title,
                content,
                status,
                difficulty,
                dueDate: (parsedDueDate && !isNaN(parsedDueDate.getTime())) ? parsedDueDate : null,
                tags: tags ? (typeof tags === 'string' ? (tags.startsWith('[') ? JSON.parse(tags) : [tags]) : tags) : [],
                fileUrl,
                storageKey,
                fileName,
                fileType,
                fileSize: fileSize ? parseInt(String(fileSize)) : null,
                thumbnailUrl
            }
        });

        // Automatically add to Agenda if it's an exercise with a due date
        if (item.type === 'exercise' && item.dueDate) {
            try {
                await addOrUpdateExerciseAgendaTask({
                    profileId: req.user!.id,
                    description: `Exercice : ${item.title}`,
                    date: item.dueDate,
                    courseId: item.courseId,
                    itemId: item.id
                });
            } catch (err) {
                console.error("[ItemController] Failed to auto-add exercise to agenda:", err);
            }
        }

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

        if (updateData.dueDate !== undefined) {
            if (updateData.dueDate) {
                const parsed = new Date(updateData.dueDate);
                updateData.dueDate = isNaN(parsed.getTime()) ? null : parsed;
            } else {
                updateData.dueDate = null;
            }
        }

        const updatedItem = await prisma.item.update({
            where: { id: req.params.id },
            data: updateData
        });

        // Sync with agenda if exercise
        if (updatedItem.type === 'exercise') {
            if (updatedItem.dueDate) {
                await addOrUpdateExerciseAgendaTask({
                    profileId: req.user!.id,
                    description: `Exercice : ${updatedItem.title}`,
                    date: updatedItem.dueDate,
                    courseId: updatedItem.courseId,
                    itemId: updatedItem.id
                }).catch(err => console.error("[ItemController] Error updating exercise in agenda:", err));
            } else {
                await removeExerciseAgendaTask(updatedItem.id, req.user!.id).catch(err => console.error("[ItemController] Error removing exercise from agenda:", err));
            }
        }

        socketService.emitToProfile(req.user!.id, 'item:updated', updatedItem);

        res.json(updatedItem);
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ message: 'Error updating item', error });
    }
};

// PUT /api/items/:id/annotations
export const updateItemAnnotations = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        const { annotations } = req.body;

        const updated = await prisma.item.update({
            where: { id: item.id },
            data: { annotations: (annotations !== undefined ? annotations : Prisma.JsonNull) as Prisma.InputJsonValue }
        });

        socketService.emitToProfile(req.user!.id, 'item:annotated', {
            id: item.id,
            annotations: updated.annotations
        });

        res.json({ message: 'Annotations saved successfully', annotations: updated.annotations });
    } catch (error) {
        console.error('Error saving item annotations:', error);
        res.status(500).json({ message: 'Error saving annotations', error });
    }
};

// DELETE /api/items/:id (Soft delete)
export const deleteItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.type === 'exercise') {
            await removeExerciseAgendaTask(item.id, req.user!.id).catch(() => {});
        }

        // Soft delete: keep the physical file and mark deletedAt
        const updated = await prisma.item.update({
            where: { id: item.id },
            data: { deletedAt: new Date() }
        });

        socketService.emitToProfile(req.user!.id, 'item:deleted', { id: item.id, courseId: item.courseId });

        res.json({ message: 'Item moved to trash', item: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
    }
};

// POST /api/items/bulk/delete (Bulk soft delete)
export const bulkDeleteItems = async (req: AuthRequest, res: Response) => {
    try {
        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        // 1. Find items to verify ownership
        const items = await prisma.item.findMany({
            where: {
                id: { in: itemIds },
                profileId: req.user!.id
            }
        });

        if (items.length === 0) {
            return res.json({ message: 'Items already deleted', count: 0 });
        }

        const validIds = items.map(i => i.id);

        // 2. Soft delete items (files remain safe on disk)
        await prisma.item.updateMany({
            where: {
                id: { in: validIds },
                profileId: req.user!.id
            },
            data: { deletedAt: new Date() }
        });

        // 3. Remove exercises from agenda
        for (const item of items) {
            if (item.type === 'exercise') {
                await removeExerciseAgendaTask(item.id, req.user!.id).catch(() => {});
            }
        }

        // 4. Notify client
        socketService.emitToProfile(req.user!.id, 'items:bulk-deleted', { ids: validIds });

        res.json({ message: 'Items moved to trash', count: validIds.length });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting items', error });
    }
};

// POST /api/items/:id/restore
export const restoreItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        const restored = await prisma.item.update({
            where: { id: item.id },
            data: { deletedAt: null }
        });

        if (restored.type === 'exercise' && restored.dueDate) {
            await addOrUpdateExerciseAgendaTask({
                profileId: req.user!.id,
                description: `Exercice : ${restored.title}`,
                date: restored.dueDate,
                courseId: restored.courseId,
                itemId: restored.id
            }).catch(() => {});
        }

        socketService.emitToProfile(req.user!.id, 'item:created', restored);

        res.json({ message: 'Item restored successfully', item: restored });
    } catch (error) {
        res.status(500).json({ message: 'Error restoring item', error });
    }
};

// GET /api/items/trash
export const getTrashItems = async (req: AuthRequest, res: Response) => {
    try {
        const items = await prisma.item.findMany({
            where: {
                profileId: req.user!.id,
                deletedAt: { not: null }
            },
            include: {
                course: {
                    select: { id: true, title: true, color: true, icon: true }
                }
            },
            orderBy: { deletedAt: 'desc' }
        });

        res.json({ items });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trash items', error });
    }
};

// DELETE /api/items/:id/permanent
export const permanentDeleteItem = async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.item.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.storageKey) {
            await storageService.deleteFile(item.storageKey).catch(err => {
                console.warn('Error deleting physical file:', err);
            });
        }

        if (item.type === 'exercise') {
            await removeExerciseAgendaTask(item.id, req.user!.id).catch(() => {});
        }

        // Clean up linked summaries and flashcard sets
        await prisma.summary.deleteMany({
            where: {
                OR: [
                    { itemId: item.id },
                    { generatedItemId: item.id }
                ]
            }
        }).catch(() => {});

        await prisma.flashcardSet.deleteMany({
            where: { itemId: item.id }
        }).catch(() => {});

        await prisma.item.delete({ where: { id: item.id } });

        res.json({ message: 'Item permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error permanently deleting item', error });
    }
};

// POST /api/items/trash/empty
export const emptyTrash = async (req: AuthRequest, res: Response) => {
    try {
        const trashedItems = await prisma.item.findMany({
            where: {
                profileId: req.user!.id,
                deletedAt: { not: null }
            }
        });

        for (const item of trashedItems) {
            if (item.storageKey) {
                await storageService.deleteFile(item.storageKey).catch(() => {});
            }
        }

        const ids = trashedItems.map(i => i.id);
        await prisma.item.deleteMany({
            where: { id: { in: ids } }
        });

        res.json({ message: 'Trash emptied', count: trashedItems.length });
    } catch (error) {
        res.status(500).json({ message: 'Error emptying trash', error });
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

// POST /api/items/preview-url
export const getUrlPreview = async (req: AuthRequest, res: Response) => {
    try {
        let { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }
        url = url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        let domain = '';
        let origin = '';
        try {
            const parsedUrl = new URL(url);
            domain = parsedUrl.hostname.replace(/^www\./, '');
            origin = parsedUrl.origin;
        } catch {
            return res.status(400).json({ message: 'Invalid URL format' });
        }

        let title = domain;
        let description = '';
        let image = '';
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
                    const html = await response.text();

                    // OpenGraph & standard title
                    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
                                  html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
                    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                    if (ogTitle && ogTitle[1]) {
                        title = ogTitle[1].trim();
                    } else if (titleTag && titleTag[1]) {
                        title = titleTag[1].trim();
                    }

                    // OpenGraph description
                    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
                                 html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
                    if (ogDesc && ogDesc[1]) {
                        description = ogDesc[1].trim();
                    }

                    // OpenGraph / Twitter image
                    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                                html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
                    if (ogImg && ogImg[1]) {
                        let imgUrl = ogImg[1].trim();
                        if (imgUrl.startsWith('//')) {
                            imgUrl = 'https:' + imgUrl;
                        } else if (imgUrl.startsWith('/')) {
                            imgUrl = origin + imgUrl;
                        } else if (!imgUrl.startsWith('http')) {
                            imgUrl = origin + '/' + imgUrl;
                        }
                        image = imgUrl;
                    }
                }
            }
        } catch (fetchErr: any) {
            console.warn('[itemController] Preview fetch failed for:', url, (fetchErr as any)?.message || fetchErr);
        }

        const decodeEntities = (text: string): string => {
            return text
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&#39;/g, "'")
                .replace(/&rsquo;/g, "'")
                .replace(/&nbsp;/g, ' ');
        };

        title = decodeEntities(title);
        description = decodeEntities(description);

        return res.json({
            url,
            domain,
            title,
            description,
            image: image || favicon,
            favicon
        });
    } catch (err: any) {
        console.error('[itemController] Error in getUrlPreview:', err);
        return res.status(500).json({ message: 'Error previewing URL', error: (err as any)?.message });
    }
};
