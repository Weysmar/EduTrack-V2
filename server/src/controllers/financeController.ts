import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { ImportService } from '../services/importService';
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
        res.json(accounts);
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
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
