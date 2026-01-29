import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

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

        const updated = await prisma.bank.update({
            where: { id },
            data: req.body
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
        const bank = await prisma.bank.findUnique({
            where: { id },
            include: { accounts: true }
        });

        if (!bank || bank.profileId !== profileId) {
            return res.status(404).json({ error: 'Bank not found' });
        }

        // Check for attached accounts
        // Cascade delete: Transactions -> Accounts -> Bank
        // 1. Find all accounts
        const accountIds = bank.accounts.map((a: any) => a.id);

        if (accountIds.length > 0) {
            // 2. Delete all transactions for these accounts
            await prisma.transaction.deleteMany({
                where: { accountId: { in: accountIds } }
            });

            // 3. Delete accounts
            await prisma.account.deleteMany({
                where: { bankId: id }
            });
        }

        await prisma.bank.delete({ where: { id } });
        res.json({ message: 'Bank deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete bank' });
    }
};
