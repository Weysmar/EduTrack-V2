import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
interface AuthRequest extends Request {
    user?: { id: string };
}

// GET /api/folders
export const getFolders = async (req: AuthRequest, res: Response) => {
    try {
        const folders = await prisma.folder.findMany({
            where: { profileId: req.user!.id },
            include: {
                children: true,
                courses: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(folders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching folders', error });
    }
};

// GET /api/folders/:id
export const getFolder = async (req: AuthRequest, res: Response) => {
    try {
        const folder = await prisma.folder.findFirst({
            where: {
                id: req.params.id,
                profileId: req.user!.id
            },
            include: {
                children: true,
                courses: true
            }
        });

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching folder', error });
    }
};


// POST /api/folders
export const createFolder = async (req: AuthRequest, res: Response) => {
    try {
        const { name, parentId } = req.body;

        const folder = await prisma.folder.create({
            data: {
                profileId: req.user!.id,
                name,
                parentId: parentId || null
            }
        });

        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: 'Error creating folder', error });
    }
};

// PUT /api/folders/:id
export const updateFolder = async (req: AuthRequest, res: Response) => {
    try {
        const { name, parentId } = req.body;

        const folder = await prisma.folder.updateMany({
            where: { id: req.params.id, profileId: req.user!.id },
            data: {
                name,
                parentId
            }
        });

        if (folder.count === 0) return res.status(404).json({ message: 'Folder not found' });

        // Fetch updated to return
        const updated = await prisma.folder.findFirst({ where: { id: req.params.id } });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating folder', error });
    }
};

// DELETE /api/folders/:id
export const deleteFolder = async (req: AuthRequest, res: Response) => {
    try {
        const result = await prisma.folder.deleteMany({
            where: { id: req.params.id, profileId: req.user!.id }
        });

        if (result.count === 0) return res.status(404).json({ message: 'Folder not found' });
        res.json({ message: 'Folder deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting folder', error });
    }
};
