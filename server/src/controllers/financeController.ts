import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { ImportService } from '../services/importService';
import { categorizerService } from '../services/categorizerService';
import { ClassificationService } from '../services/classificationService';
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

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID not found in token' });
        }

        const whereClause: any = { bank: { profileId } };
        if (includeArchived !== 'true') {
            whereClause.active = true;
        }

        const accounts = await prisma.account.findMany({
            where: whereClause,
            include: { bank: true }
        });

        // Mask sensitive IBAN data
        const maskedAccounts = accounts.map((acc: any) => ({
            ...acc,
            iban: maskIban(acc.iban),
            accountNumber: maskAccountNumber(acc.accountNumber)
        }));

        res.json(maskedAccounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { bankId, name, type, balance, currency, accountNumber } = req.body;

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID not found in token' });
        }

        // Verify bank belongs to user
        const bank = await prisma.bank.findFirst({
            where: { id: bankId, profileId }
        });

        if (!bank) {
            return res.status(404).json({ error: 'Bank not found' });
        }

        const account = await prisma.account.create({
            data: {
                bankId,
                name,
                type: type || 'CHECKING',
                balance: 0, // Always start at 0 - balance managed via transactions
                currency: currency || 'EUR',
                accountNumber: accountNumber || 'N/A',
                iban: accountNumber || undefined, // Simple default
                active: true,
                autoDetected: false
            }
        });

        res.status(201).json(account);
    } catch (error: any) {
        console.error('Create Account Error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;
        const { name, type, balance, currency, accountNumber, active } = req.body;

        // Verify ownership via Bank
        const account = await prisma.account.findFirst({
            where: { id, bank: { profileId } }
        });

        if (!account) return res.status(404).json({ error: 'Account not found' });

        const updated = await prisma.account.update({
            where: { id },
            data: {
                name,
                type,
                balance,
                currency,
                accountNumber,
                active
            }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update account' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        // Verify ownership
        const account = await prisma.account.findFirst({
            where: { id, bank: { profileId } }
        });

        if (!account) return res.status(404).json({ error: 'Account not found' });

        await prisma.account.delete({ where: { id } });
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account' });
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
            orderBy: { date: 'desc' }
            // take: 100 // Limit removed as requested
        });

        // Mask IBANs in account data and beneficiaryIban
        const maskedTransactions = transactions.map((tx: any) => ({
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

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const {
            accountId,
            amount,
            date,
            description,
            classification,
            category,
            beneficiaryIban,
            metadata
        } = req.body;

        // Verify account belongs to user
        const account = await prisma.account.findFirst({
            where: { id: accountId, bank: { profileId } }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found or access denied' });
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                accountId,
                amount: amount,
                date: date ? new Date(date) : new Date(),
                description: description || 'Transaction manuelle',
                classification: classification || 'UNKNOWN',
                category: category || null,
                beneficiaryIban: beneficiaryIban || null,
                metadata: metadata || null
            }
        });

        // Update account balance
        await prisma.account.update({
            where: { id: accountId },
            data: {
                balance: {
                    increment: parseFloat(amount.toString())
                }
            }
        });

        res.status(201).json(transaction);
    } catch (error: any) {
        console.error('Create Transaction Error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;
        const {
            amount,
            date,
            description,
            classification,
            category,
            beneficiaryIban,
            metadata
        } = req.body;

        // Verify ownership and get old transaction
        const oldTransaction = await prisma.transaction.findFirst({
            where: { id, account: { bank: { profileId } } },
            include: { account: true }
        });

        if (!oldTransaction || !oldTransaction.accountId) {
            return res.status(404).json({ error: 'Transaction not found or access denied' });
        }

        // Calculate balance difference if amount changes
        if (amount !== undefined && amount !== oldTransaction.amount.toNumber()) {
            const diff = parseFloat(amount.toString()) - oldTransaction.amount.toNumber();
            await prisma.account.update({
                where: { id: oldTransaction.accountId },
                data: {
                    balance: { increment: diff }
                }
            });
        }

        // Update transaction
        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                amount: amount !== undefined ? amount : undefined,
                date: date ? new Date(date) : undefined,
                description,
                classification,
                category,
                beneficiaryIban,
                metadata
            }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Update Transaction Error:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { id } = req.params;

        // Verify ownership
        const transaction = await prisma.transaction.findFirst({
            where: { id, account: { bank: { profileId } } }
        });

        if (!transaction || !transaction.accountId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Revert balance
        // If it was income (positive), we subtract. If expense (negative), we subtract negative (add).
        // Essentially: balance = balance - transaction.amount
        await prisma.account.update({
            where: { id: transaction.accountId },
            data: {
                balance: {
                    decrement: transaction.amount
                }
            }
        });

        await prisma.transaction.delete({ where: { id } });
        res.json({ message: 'Transaction deleted' });
    } catch (error) {
        console.error('Delete Transaction Error:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
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
        const txData = transactions.map((t: any) => ({
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

// --- Import Logs ---
export const getImportLogs = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const logs = await prisma.importLog.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit to last 20 imports for now
        });
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
            const data = await prisma.profile.findUnique({
                where: { id: profileId },
                include: {
                    banks: {
                        include: {
                            accounts: {
                                include: {
                                    transactions: true
                                }
                            }
                        }
                    },
                    budgets: true
                }
            });

            if (!data) return res.status(404).json({ error: 'Profile not found' });

            const exportData = {
                exportedAt: new Date(),
                banks: data.banks,
                budgets: data.budgets
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=persotrack_backup_${new Date().toISOString().split('T')[0]}.json`);
            res.json(exportData);

        } else if (format === 'csv') {
            const transactions = await prisma.transaction.findMany({
                where: { account: { bank: { profileId } } },
                include: {
                    account: {
                        include: { bank: true }
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Convert to CSV
            const header = 'Date,Description,Amount,Currency,Category,Details,Account,Bank,Type,Status\n';
            const rows = transactions.map((t: any) => {
                const date = t.date.toISOString().split('T')[0];
                const cleanDesc = t.description.replace(/,/g, ' '); // Simple CSV escape
                const amount = t.amount.toString();
                const currency = t.account?.currency || 'EUR';
                const category = t.category || '';
                const details = t.classification || '';
                const account = t.account?.name || '';
                const bank = t.account?.bank.name || '';
                const type = (t.classification === 'INTERNAL_INTRA_BANK' || t.classification === 'INTERNAL_INTER_BANK') ? 'Internal' : 'External';

                return `${date},${cleanDesc},${amount},${currency},${category},${details},${account},${bank},${type},${t.classification}`;
            }).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=persotrack_transactions_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(header + rows);
        } else {
            res.status(400).json({ error: 'Invalid format. Use json or csv.' });
        }

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
};

// --- Bulk Reclassification ---
export const reclassifyAllTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;

        // Fetch all UNKNOWN or low-confidence transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                OR: [
                    { classification: 'UNKNOWN' },
                    { classificationConfidence: { lt: 0.5 } }
                ]
            },
            include: {
                account: {
                    include: { bank: true }
                }
            }
        });

        let updated = 0;
        for (const tx of transactions) {
            // Need bankId. tx.account.bankId is available via include
            if (!tx.account) continue;
            const bankId = tx.account.bankId;

            const result = await ClassificationService.classifyTransaction(
                profileId,
                tx.description,
                tx.amount.toNumber(),
                bankId,
                tx.beneficiaryIban || undefined
            );

            // Only update if confidence improved
            if (result.confidenceScore > (tx.classificationConfidence || 0)) {
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: {
                        classification: result.classification,
                        classificationConfidence: result.confidenceScore,
                        linkedAccountId: result.linkedAccountId
                    }
                });
                updated++;
            }
        }

        res.json({ success: true, updated, total: transactions.length });
    } catch (error) {
        console.error('Reclassification Error:', error);
        res.status(500).json({ error: 'Failed to reclassify transactions' });
    }
};
