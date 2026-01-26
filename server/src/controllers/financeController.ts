import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { ImportService } from '../services/importService';
import { categorizerService } from '../services/categorizerService';
import { maskIban, maskAccountNumber } from '../utils/maskIban';
import fs from 'fs';

const prisma = new PrismaClient();

// --- Import Endpoints ---

export const previewImport = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { bankId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!bankId) {
            // Clean up file if validation fails
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'Bank ID is required' });
        }

        const previewData = await ImportService.generatePreview(profileId, file.path, bankId);

        // Clean up file after processing (or keep it if needed for Step 2? 
        // Ideally we should delete it and re-upload or move it to a temp folder. 
        // For statelessness, we might return the parsed data and expect client to send it back, 
        // OR we store the temp file path in a session/token. 
        // FOR NOW: We return the preview data. The frontend will have to re-send the data for confirmation 
        // OR we rely on the file still being there if we pass the path back (risky if stateless).
        // BETTER APPROACH: The confirm step receives the "previewData" structure back as JSON to commit it.)

        fs.unlinkSync(file.path); // Delete temp file
        res.json(previewData);

    } catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
};

export const confirmImport = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { bankId, importData } = req.body;

        if (!importData || !bankId) {
            return res.status(400).json({ error: 'Missing import data or bank ID' });
        }

        const result = await ImportService.commitImport(profileId, bankId, importData);
        res.json(result);

    } catch (error) {
        console.error('Commit Error:', error);
        res.status(500).json({ error: 'Failed to commit import' });
    }
};

// --- Accounts ---
export const getAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const accounts = await prisma.account.findMany({
            where: { bank: { profileId } },
            include: { bank: true }
        });

        // Mask sensitive IBAN data
        const maskedAccounts = accounts.map(acc => ({
            ...acc,
            iban: maskIban(acc.iban),
            accountNumber: maskAccountNumber(acc.accountNumber)
        }));

        res.json(maskedAccounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
};

// --- Transactions ---
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        // Basic pagination or filter support could be added here
        const transactions = await prisma.transaction.findMany({
            where: { account: { bank: { profileId } } },
            include: { account: true },
            orderBy: { date: 'desc' },
            take: 100 // Limit for now
        });

        // Mask IBANs in account data and beneficiaryIban
        const maskedTransactions = transactions.map(tx => ({
            ...tx,
            beneficiaryIban: maskIban(tx.beneficiaryIban),
            account: tx.account ? {
                ...tx.account,
                iban: maskIban(tx.account.iban),
                accountNumber: maskAccountNumber(tx.account.accountNumber)
            } : undefined
        }));

        res.json(maskedTransactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// --- AI Categorization ---
export const categorizeTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { transactionIds } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({ error: 'Transaction IDs required' });
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                id: { in: transactionIds },
                account: { bank: { profileId } } // Security: user can only categorize their own
            }
        });

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'No transactions found' });
        }

        // Get user's API key
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });

        const apiKey = (profile?.settings as any)?.google_gemini_summaries;

        if (!apiKey) {
            return res.status(400).json({ error: 'No API key configured. Please add your Gemini API key in Settings.' });
        }

        // Call categorizer service
        const txData = transactions.map(t => ({
            description: t.description,
            amount: t.amount.toNumber(),
            id: t.id
        }));

        const categorizedMap = await categorizerService.categorizeBatch(txData, apiKey);

        // Update transactions with categories
        const updates = Object.entries(categorizedMap).map(([index, category]) => {
            const tx = transactions[parseInt(index)];
            return prisma.transaction.update({
                where: { id: tx.id },
                data: { category: String(category) }
            });
        });

        await Promise.all(updates);

        res.json({
            message: 'Categorization complete',
            categorized: Object.keys(categorizedMap).length,
            categories: categorizedMap
        });

    } catch (error: any) {
        console.error('Categorization Error:', error);
        res.status(500).json({ error: error.message || 'Failed to categorize transactions' });
    }
};
