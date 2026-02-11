import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

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
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Internal server error' });
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
                settings: settings ? settings : undefined
            }
        });

        const { passwordHash, ...profileData } = updatedProfile;
        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Internal server error' });
    }
};

/**
 * Increment AI Generation Counter
 * Call this function whenever an AI generation is performed
 */
export const incrementAIGeneration = async (profileId: string): Promise<number> => {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Get current count from settings
        const currentSettings = (profile.settings as any) || {};
        const currentCount = currentSettings.aiGenerationCount || 0;
        const newCount = currentCount + 1;

        // Update settings with new count
        await prisma.profile.update({
            where: { id: profileId },
            data: {
                settings: {
                    ...currentSettings,
                    aiGenerationCount: newCount
                }
            }
        });

        return newCount;
    } catch (error) {
        console.error('Error incrementing AI generation counter:', error);
        throw error;
    }
};
