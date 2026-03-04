import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from '../lib/prisma';

const registerSchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    language: z.string().optional()
});

export const register = async (req: Request, res: Response) => {
    try {
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
            return res.status(400).json({ message: 'User already exists' });
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

        res.status(201).json({ token, user });
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

        res.json({ token, user: userWithoutPassword });
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

        const { passwordHash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
