import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
    user?: { id: string };
}

export const searchAll = async (req: AuthRequest, res: Response) => {
    try {
        const queryVal = req.query.q;
        if (typeof queryVal !== 'string') {
            return res.json([]);
        }
        
        const query = queryVal.trim();
        if (!query) {
            return res.json([]);
        }

        const profileId = req.user!.id;
        const lowerQuery = query.toLowerCase();

        // Parallel searches for efficiency
        const [courses, folders, items] = await Promise.all([
            prisma.course.findMany({
                where: {
                    profileId,
                    title: { contains: lowerQuery, mode: 'insensitive' }
                },
                take: 10
            }),
            prisma.folder.findMany({
                where: {
                    profileId,
                    name: { contains: lowerQuery, mode: 'insensitive' }
                },
                take: 10
            }),
            prisma.item.findMany({
                where: {
                    profileId,
                    OR: [
                        { title: { contains: lowerQuery, mode: 'insensitive' } },
                        { content: { contains: lowerQuery, mode: 'insensitive' } }
                    ]
                },
                take: 20
            })
        ]);

        // Unified results format
        const results = [
            ...courses.map(c => ({
                id: c.id,
                type: 'course',
                title: c.title,
                subtitle: c.description,
                url: `/edu/course/${c.id}`,
                createdAt: c.createdAt
            })),
            ...folders.map(f => ({
                id: f.id,
                type: 'folder',
                title: f.name,
                url: `/edu/folder/${f.id}`,
                createdAt: f.createdAt
            })),
            ...items.map(i => ({
                id: i.id,
                type: i.type,
                title: i.title,
                subtitle: i.type,
                url: `/edu/course/${i.courseId}`, // Note: Could be more specific if we had direct item views
                createdAt: i.createdAt
            }))
        ];

        // Basic sorting: more recent first
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error performing search', error });
    }
};
