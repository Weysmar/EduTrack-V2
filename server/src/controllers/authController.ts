import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'intelli.vince@gmail.com').toLowerCase();

export const isUserAdmin = (email?: string | null): boolean => {
    if (!email) return false;
    return email.toLowerCase().trim() === ADMIN_EMAIL;
};

const registerSchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    language: z.string().optional()
});

/**
 * Account registration: Restricted to Admin (or initial bootstrap if 0 profiles exist)
 */
export const register = async (req: AuthRequest, res: Response) => {
    try {
        const userCount = await prisma.profile.count();

        // If users already exist, only the admin can create new accounts
        if (userCount > 0) {
            if (!req.user || !isUserAdmin(req.user.email)) {
                return res.status(403).json({
                    message: "L'inscription publique est désactivée. Seul l'administrateur peut créer des comptes."
                });
            }
        }

        const validatedData = registerSchema.safeParse(req.body);
        if (!validatedData.success) {
            return res.status(400).json({
                message: 'Erreur de validation',
                errors: validatedData.error.format()
            });
        }

        const { name, email, password, language } = validatedData.data;

        // Check if user exists
        const existingUser = await prisma.profile.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.profile.create({
            data: {
                name,
                email,
                passwordHash,
                language: language || 'fr',
                theme: 'dark'
            }
        });

        // Generate Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        const { passwordHash: _, ...userWithoutPassword } = user;
        const isAdmin = isUserAdmin(user.email);

        res.status(201).json({
            token,
            user: { ...userWithoutPassword, isAdmin }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

const loginSchema = z.object({
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis')
});

export const login = async (req: Request, res: Response) => {
    try {
        const validatedData = loginSchema.safeParse(req.body);
        if (!validatedData.success) {
            return res.status(400).json({
                message: 'Erreur de validation',
                errors: validatedData.error.format()
            });
        }

        const { email, password } = validatedData.data;

        // Find user
        const user = await prisma.profile.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last accessed
        await prisma.profile.update({
            where: { id: user.id },
            data: { lastAccessed: new Date() }
        });

        // Generate Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        // Remove password hash from response
        const { passwordHash, ...userWithoutPassword } = user;
        const isAdmin = isUserAdmin(user.email);

        res.json({ token, user: { ...userWithoutPassword, isAdmin } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const user = await prisma.profile.findUnique({
            where: { id: req.user.id }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Auto-heal/sync if count is 0 but user has actual AI records from the past
        let count = user.aiGenerationsCount || (user.settings as any)?.aiGenerationCount || 0;
        if (count === 0) {
            const [summaries, flashcards, quizzes, mindmaps] = await Promise.all([
                prisma.summary.count({ where: { profileId: req.user.id } }),
                prisma.flashcardSet.count({ where: { profileId: req.user.id } }),
                prisma.quiz.count({ where: { profileId: req.user.id } }),
                prisma.mindMap.count({ where: { profileId: req.user.id } })
            ]);
            const actualTotal = summaries + flashcards + quizzes + mindmaps;
            if (actualTotal > 0) {
                count = actualTotal;
                const currentSettings = (user.settings as any) || {};
                await prisma.profile.update({
                    where: { id: req.user.id },
                    data: {
                        aiGenerationsCount: count,
                        settings: {
                            ...currentSettings,
                            aiGenerationCount: count
                        }
                    }
                });
                user.aiGenerationsCount = count;
                (user.settings as any) = { ...currentSettings, aiGenerationCount: count };
            }
        }

        const { passwordHash, ...userWithoutPassword } = user;
        const isAdmin = isUserAdmin(user.email);

        res.json({ ...userWithoutPassword, isAdmin });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Admin only: List all registered profiles
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !isUserAdmin(req.user.email)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const users = await prisma.profile.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                lastAccessed: true,
                avatar: true,
                _count: {
                    select: {
                        courses: true,
                        items: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const usersWithAdmin = users.map(u => ({
            ...u,
            isAdmin: isUserAdmin(u.email)
        }));

        res.json(usersWithAdmin);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

/**
 * Admin only: Update user profile (name, email) or reset password
 */
export const updateUserByAdmin = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !isUserAdmin(req.user.email)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const { id } = req.params;
        const { name, email, password } = req.body;

        const targetUser = await prisma.profile.findUnique({ where: { id } });
        if (!targetUser) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const updateData: any = {};

        if (name && typeof name === 'string' && name.trim().length >= 2) {
            updateData.name = name.trim();
        }

        if (email && typeof email === 'string' && email.trim() !== targetUser.email) {
            const cleanEmail = email.trim().toLowerCase();
            const emailTaken = await prisma.profile.findUnique({ where: { email: cleanEmail } });
            if (emailTaken) {
                return res.status(400).json({ message: 'Cette adresse email est déjà utilisée.' });
            }
            updateData.email = cleanEmail;
        }

        if (password && typeof password === 'string' && password.length >= 6) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.profile.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                lastAccessed: true,
                avatar: true
            }
        });

        res.json({
            message: 'Utilisateur mis à jour avec succès',
            user: { ...updated, isAdmin: isUserAdmin(updated.email) }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

/**
 * Admin only: Delete user profile
 */
export const deleteUserByAdmin = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !isUserAdmin(req.user.email)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const { id } = req.params;
        const targetUser = await prisma.profile.findUnique({ where: { id } });

        if (!targetUser) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (isUserAdmin(targetUser.email)) {
            return res.status(400).json({ message: "Impossible de supprimer le compte administrateur principal." });
        }

        await prisma.profile.delete({ where: { id } });
        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};



