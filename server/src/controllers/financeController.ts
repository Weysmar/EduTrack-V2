import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FinanceService } from '../services/financeService';
import { ImportService } from '../services/importService'; // Kept for cleanup logic
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// --- Import Endpoints ---

export const previewImport = async (req: AuthRequest, res: Response) => {
    const tempBaseDir = path.resolve('uploads/temp');

    try {
        const profileId = req.user!.id;
        const { bankId, accountId } = req.body;
        const file = req.file;

        if (!file || !file.filename) {
            return res.status(400).json({ error: 'No file uploaded or invalid upload' });
        }

        // Strictly sanitize filename to break the taint chain for static analysis.
        const targetFilename = String(file.filename).replace(/[^a-zA-Z0-9.-]/g, '');

        // Find the file in the directory to avoid using any request-derived value in the sink.
        const filesInTemp = fs.readdirSync(tempBaseDir);
        const validatedFile = filesInTemp.find(f => f === targetFilename);

        if (!validatedFile) {
            return res.status(403).json({ error: 'Access denied: File not found in secure storage' });
        }

        const resolvedFilePath = path.join(tempBaseDir, validatedFile);

        // Safe cleanup helper using the validatedFile identifier
        const safeCleanup = () => {
            try {
                if (validatedFile && fs.existsSync(resolvedFilePath)) {
                    fs.unlinkSync(resolvedFilePath);
                }
            } catch { /* ignore */ }
        };

        if (!bankId) {
            safeCleanup();
            return res.status(400).json({ error: 'Bank ID is required' });
        }

        const previewData = await ImportService.generatePreview(profileId, resolvedFilePath, bankId, accountId);

        safeCleanup();
        res.json(previewData);

    } catch (error) {
        // Safe cleanup for any dangling temp file on error
        const baseDir = path.resolve('uploads/temp');
        if (req.file?.filename && fs.existsSync(baseDir)) {
            try {
                const target = String(req.file.filename);
                const files = fs.readdirSync(baseDir);
                const safeMatch = files.find(f => f === target);
                if (safeMatch) {
                    fs.unlinkSync(path.join(baseDir, safeMatch));
                }
            } catch { /* ignore cleanup errors */ }
        }
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

        const result = await FinanceService.commitImport(profileId, bankId, importData);
        res.json(result);

    } catch (error: any) {
        console.error('Commit Error:', error);
        res.status(500).json({
            error: 'Failed to commit import',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// --- Accounts ---
export const getAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { includeArchived } = req.query;

        if (!profileId) return res.status(400).json({ error: 'Profile ID not found in token' });

        const accounts = await FinanceService.getAccounts(profileId, includeArchived === 'true');
        res.json(accounts);
    } catch (error) {
        console.error('Fetch Accounts Error:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { bankId, name, type, balance, currency, accountNumber } = req.body;

        if (!profileId) return res.status(400).json({ error: 'Profile ID not found in token' });

        const account = await FinanceService.createAccount(profileId, req.body);
        res.status(201).json(account);
    } catch (error: any) {
        console.error('Create Account Error:', error);
        res.status(error.message === 'Bank not found' ? 404 : 500).json({ error: error.message || 'Failed to create account' });
    }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        const updated = await FinanceService.updateAccount(profileId, id, req.body);
        res.json(updated);
    } catch (error: any) {
        console.error('Update Account Error:', error);
        res.status(error.message === 'Account not found' ? 404 : 500).json({ error: error.message || 'Failed to update account' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        const result = await FinanceService.deleteAccount(profileId, id);
        res.json(result);
    } catch (error: any) {
        console.error('Delete Account Error:', error);
        res.status(error.message === 'Account not found' ? 404 : 500).json({ error: error.message || 'Failed to delete account' });
    }
};

// --- Transactions ---
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const maskedTransactions = await FinanceService.getTransactions(profileId);
        res.json(maskedTransactions);
    } catch (error) {
        console.error('Fetch Transactions Error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const transaction = await FinanceService.createTransaction(profileId, req.body);
        res.status(201).json(transaction);
    } catch (error: any) {
        console.error('Create Transaction Error:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to create transaction' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;

        const rawId = req.params.id;
        const idSchema = z.string().uuid();
        const id = idSchema.parse(rawId);

        const updated = await FinanceService.updateTransaction(profileId, id, req.body);
        res.json(updated);
    } catch (error: any) {
        console.error('Update Transaction Error:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to update transaction' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        const result = await FinanceService.deleteTransaction(profileId, id);
        res.json(result);
    } catch (error: any) {
        console.error('Delete Transaction Error:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to delete transaction' });
    }
};

// --- AI Categorization ---
export const categorizeTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { transactionIds } = req.body;

        const result = await FinanceService.categorizeTransactions(profileId, transactionIds);
        res.json(result);
    } catch (error: any) {
        console.error('Categorization Error:', error);
        res.status(error.message.includes('required') || error.message.includes('configured') ? 400 : (error.message.includes('found') ? 404 : 500))
            .json({ error: error.message || 'Failed to categorize transactions' });
    }
};

// --- Import Logs ---
export const getImportLogs = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const logs = await FinanceService.getImportLogs(profileId);
        res.json(logs);
    } catch (error) {
        console.error('Fetch Import Logs Error:', error);
        res.status(500).json({ error: 'Failed to fetch import logs' });
    }
};

// --- Export Data ---
export const exportData = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const format = req.query.format as string || 'json';

        if (format === 'json') {
            const exportData = await FinanceService.exportDataJson(profileId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=persotrack_backup_${new Date().toISOString().split('T')[0]}.json`);
            res.json(exportData);
        } else if (format === 'csv') {
            const csvData = await FinanceService.exportDataCsv(profileId);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=persotrack_transactions_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvData);
        } else {
            res.status(400).json({ error: 'Invalid format. Use json or csv.' });
        }
    } catch (error: any) {
        console.error('Export Error:', error);
        res.status(error.message === 'Profile not found' ? 404 : 500).json({ error: error.message || 'Failed to export data' });
    }
};

// --- Bulk Reclassification ---
export const reclassifyAllTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;

        const result = await FinanceService.reclassifyAllTransactions(profileId);
        res.json(result);
    } catch (error: any) {
        console.error('Reclassification Error:', error);
        res.status(500).json({ error: error.message || 'Failed to reclassify transactions' });
    }
};

// --- Financial Audit (AI) ---
export const audit = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { transactions } = req.body;

        const result = await FinanceService.generateAudit(profileId, req.body.transactions);
        res.json(result);
    } catch (error: any) {
        console.error('Audit Error:', error);
        res.status(error.message.includes('required') || error.message.includes('configured') ? 400 : 500)
            .json({ error: error.message || 'Failed to generate financial audit' });
    }
};

// --- Auto Categorization (Keyword-based) ---
export const autoCategorizeTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { transactionIds } = req.body;

        const result = await FinanceService.autoCategorizeTransactionsLocal(profileId, transactionIds);
        res.json(result);
    } catch (error: any) {
        console.error('Auto Categorization Error:', error);
        res.status(500).json({ error: error.message || 'Failed to auto-categorize transactions' });
    }
};
