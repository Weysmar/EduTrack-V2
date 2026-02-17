import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const getBanks = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { includeArchived } = req.query;

        const whereClause: any = { profileId };
        if (includeArchived !== 'true') {
            whereClause.active = true;
        }

        const banks = await prisma.bank.findMany({
            where: whereClause,
            include: { accounts: true },
            orderBy: { name: 'asc' }
        });
        res.json(banks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch banks' });
    }
};

export const createBank = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { name, icon, color } = req.body;

        const bank = await prisma.bank.create({
            data: {
                profileId,
                name,
                icon,
                color
            }
        });
        res.status(201).json(bank);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create bank' });
    }
};

export const updateBank = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        // Verify ownership
        const exists = await prisma.bank.count({ where: { id, profileId } });
        if (!exists) return res.status(404).json({ error: 'Bank not found' });

        const { name, icon, color, swiftBic } = req.body;

        const updated = await prisma.bank.update({
            where: { id },
            data: { name, icon, color, swiftBic }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update bank' });
    }
};

export const deleteBank = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        // Verify ownership
        const bank = await prisma.bank.findFirst({
            where: { id, profileId }
        });

        if (!bank) {
            return res.status(404).json({ error: 'Bank not found' });
        }

        // Prisma cascade delete (schema: Account onDelete: Cascade, Transaction onDelete: Cascade)
        // This atomically removes the bank and all associated accounts + transactions
        await prisma.bank.delete({ where: { id } });
        res.json({ message: 'Bank deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete bank' });
    }
};

export const archiveBank = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        // Verify ownership
        const bank = await prisma.bank.findUnique({ where: { id } });
        if (!bank || bank.profileId !== profileId) {
            return res.status(404).json({ error: 'Bank not found' });
        }

        const updated = await prisma.bank.update({
            where: { id },
            data: { active: false }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to archive bank' });
    }
};

export const unarchiveBank = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        // Verify ownership
        const bank = await prisma.bank.findUnique({ where: { id } });
        if (!bank || bank.profileId !== profileId) {
            return res.status(404).json({ error: 'Bank not found' });
        }

        const updated = await prisma.bank.update({
            where: { id },
            data: { active: true }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to unarchive bank' });
    }
};
