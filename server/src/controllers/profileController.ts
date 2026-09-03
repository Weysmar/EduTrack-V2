import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { socketService } from '../services/socketService';

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const targetId = (id === 'me' || !id) ? req.user?.id : id;

        if (!targetId || targetId !== req.user?.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: targetId }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Auto-heal/sync if count is 0 but user has actual AI records from the past
        let count = profile.aiGenerationsCount || (profile.settings as any)?.aiGenerationCount || 0;
        if (count === 0) {
            const [summaries, flashcards, quizzes, mindmaps] = await Promise.all([
                prisma.summary.count({ where: { profileId: targetId } }),
                prisma.flashcardSet.count({ where: { profileId: targetId } }),
                prisma.quiz.count({ where: { profileId: targetId } }),
                prisma.mindMap.count({ where: { profileId: targetId } })
            ]);
            const actualTotal = summaries + flashcards + quizzes + mindmaps;
            if (actualTotal > 0) {
                count = actualTotal;
                const currentSettings = (profile.settings as any) || {};
                await prisma.profile.update({
                    where: { id: targetId },
                    data: {
                        aiGenerationsCount: count,
                        settings: {
                            ...currentSettings,
                            aiGenerationCount: count
                        }
                    }
                });
                profile.aiGenerationsCount = count;
                (profile.settings as any) = { ...currentSettings, aiGenerationCount: count };
            }
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
        const targetId = (id === 'me' || !id) ? req.user?.id : id;

        if (!targetId || targetId !== req.user?.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { name, theme, language, settings } = req.body;

        // Fetch existing profile to merge settings safely without wiping aiGenerationCount
        const existingProfile = await prisma.profile.findUnique({
            where: { id: targetId },
            select: { settings: true, aiGenerationsCount: true }
        });

        const existingSettings = (existingProfile?.settings as any) || {};
        const count = existingProfile?.aiGenerationsCount ?? existingSettings.aiGenerationCount ?? 0;

        let mergedSettings = existingSettings;
        if (settings) {
            mergedSettings = {
                ...existingSettings,
                ...settings,
                aiGenerationCount: count
            };
        }

        const updatedProfile = await prisma.profile.update({
            where: { id: targetId },
            data: {
                name,
                theme,
                language,
                settings: mergedSettings
            }
        });

        const { passwordHash, ...profileData } = updatedProfile;
        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
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
            select: { settings: true, aiGenerationsCount: true }
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Get current count from column or settings
        const currentSettings = (profile.settings as any) || {};
        const countFromCol = profile.aiGenerationsCount || 0;
        const countFromSettings = currentSettings.aiGenerationCount || 0;
        const currentCount = Math.max(countFromCol, countFromSettings);
        const newCount = currentCount + 1;

        // Update BOTH column and settings JSON
        await prisma.profile.update({
            where: { id: profileId },
            data: {
                aiGenerationsCount: newCount,
                settings: {
                    ...currentSettings,
                    aiGenerationCount: newCount
                }
            }
        });

        // Broadcast to client in real-time via socket
        socketService.emitToProfile(profileId, 'profile:aiCountUpdated', {
            aiGenerationsCount: newCount
        });

        return newCount;
    } catch (error) {
        console.error('Error incrementing AI generation counter:', error);
        throw error;
    }
};
