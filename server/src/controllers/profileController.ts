import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Ensure user can only access their own profile (or public profiles if that's a feature, but here strict)
        // In the current model, User = Profile, so id must match req.user.id
        if (id !== req.user?.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const profile = await prisma.profile.findUnique({
            where: { id }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const { passwordHash, ...profileData } = profile;
        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (id !== req.user?.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { name, theme, language, settings } = req.body;

        const updatedProfile = await prisma.profile.update({
            where: { id },
            data: {
                name,
                theme,
                language,
                settings: settings as any
            }
        });

        const { passwordHash, ...profileData } = updatedProfile;
        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
