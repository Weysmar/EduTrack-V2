import { prisma } from '../lib/prisma';
import { ImportService } from './importService';
import { categorizerService } from './categorizerService';
import { aiService } from './aiService';
import { CategoryMatcherService } from './categoryMatcherService';
import { ClassificationService } from './classificationService';
import { InternalTransferService } from './internalTransferService';
import { maskIban, maskAccountNumber } from '../utils/maskIban';

export class FinanceService {
    // Helper: Recalculate account balance from transactions (prevents drift)
    static async recalculateBalance(accountId: string, tx?: any) {
        const db = tx || prisma;
        const result = await db.transaction.aggregate({
            _sum: { amount: true },
            where: { accountId }
        });
        const computedBalance = result._sum.amount ?? 0;
        await db.account.update({
            where: { id: accountId },
            data: { balance: computedBalance, balanceDate: new Date() }
        });
        return computedBalance;
    }

    // --- Import ---
    static async generatePreview(profileId: string, filePath: string, bankId: string, accountId?: string) {
        return ImportService.generatePreview(profileId, filePath, bankId, accountId);
    }

    static async commitImport(profileId: string, bankId: string, importData: any) {
        return ImportService.commitImport(profileId, bankId, importData);
    }

    // --- Accounts ---
    static async getAccounts(profileId: string, includeArchived: boolean = false) {
        const whereClause: any = { bank: { profileId } };
        if (!includeArchived) {
            whereClause.active = true;
        }

        const accounts = await prisma.account.findMany({
            where: whereClause,
            include: { bank: true }
        });

        // Mask sensitive IBAN data
        return accounts.map((acc: any) => ({
            ...acc,
            iban: maskIban(acc.iban),
            accountNumber: maskAccountNumber(acc.accountNumber)
        }));
    }

    static async createAccount(profileId: string, data: any) {
        const { bankId, name, type, currency, accountNumber } = data;

        // Verify bank belongs to user
        const bank = await prisma.bank.findFirst({
            where: { id: bankId, profileId }
        });

        if (!bank) {
            throw new Error('Bank not found');
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

        return {
            ...account,
            iban: maskIban(account.iban),
            accountNumber: maskAccountNumber(account.accountNumber)
        };
    }

    static async updateAccount(profileId: string, id: string, data: any) {
        const { name, type, balance, currency, accountNumber, active } = data;

        // Verify ownership via Bank
        const account = await prisma.account.findFirst({
            where: { id, bank: { profileId } }
        });

        if (!account) throw new Error('Account not found');

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

        return {
            ...updated,
            iban: maskIban(updated.iban),
            accountNumber: maskAccountNumber(updated.accountNumber)
        };
    }

    static async deleteAccount(profileId: string, id: string) {
        // Verify ownership
        const account = await prisma.account.findFirst({
            where: { id, bank: { profileId } }
        });

        if (!account) throw new Error('Account not found');

        await prisma.account.delete({ where: { id } });
        return { message: 'Account deleted' };
    }

    // --- Transactions ---
    static async getTransactions(profileId: string) {
        const transactions = await prisma.transaction.findMany({
            where: { account: { bank: { profileId } } },
            include: { account: true },
            orderBy: { date: 'desc' }
        });

        // Mask IBANs in account data and beneficiaryIban
        return transactions.map((tx: any) => ({
            ...tx,
            beneficiaryIban: maskIban(tx.beneficiaryIban),
            account: tx.account ? {
                ...tx.account,
                iban: maskIban(tx.account.iban),
                accountNumber: maskAccountNumber(tx.account.accountNumber)
            } : undefined
        }));
    }

    static async createTransaction(profileId: string, data: any) {
        const {
            accountId,
            amount,
            date,
            description,
            classification,
            category,
            beneficiaryIban,
            metadata
        } = data;

        // Verify account belongs to user
        const account = await prisma.account.findFirst({
            where: { id: accountId, bank: { profileId } }
        });

        if (!account) {
            throw new Error('Account not found or access denied');
        }

        // Atomic: create transaction + recalculate balance
        const result = await prisma.$transaction(async (tx) => {
            const created = await tx.transaction.create({
                data: {
                    accountId,
                    amount: parseFloat(String(amount)),
                    date: date ? new Date(date) : new Date(),
                    description: description || 'Transaction manuelle',
                    classification: classification || 'UNKNOWN',
                    category: category || null,
                    beneficiaryIban: beneficiaryIban || null,
                    metadata: metadata || null
                }
            });
            await this.recalculateBalance(accountId, tx);
            return created;
        });

        // Trigger internal transfer detection automatically after new transaction
        await InternalTransferService.detectAndLinkTransfers(profileId).catch(console.error);

        return result;
    }

    static async updateTransaction(profileId: string, id: string, data: any) {
        const {
            amount,
            date,
            description,
            classification,
            category,
            beneficiaryIban,
            metadata
        } = data;

        // Verify ownership
        const oldTransaction = await prisma.transaction.findFirst({
            where: { id, account: { bank: { profileId } } },
            include: { account: true }
        });

        if (!oldTransaction || !oldTransaction.accountId) {
            throw new Error('Transaction not found or access denied');
        }

        // Use the DB-sourced ID to break the taint chain for static analysis
        const safeId = oldTransaction.id;

        // Atomic: update transaction + recalculate balance
        const sanitizedAmount = amount !== undefined ? parseFloat(String(amount)) : undefined;
        const result = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.transaction.update({
                where: { id: safeId },
                data: {
                    amount: sanitizedAmount,
                    date: date ? new Date(String(date)) : undefined,
                    description: description ? String(description).slice(0, 255) : undefined,
                    classification: classification ? (String(classification) as any) : undefined,
                    classificationConfidence: classification ? 1.0 : undefined,
                    category: category ? String(category).slice(0, 100) : undefined,
                    beneficiaryIban: beneficiaryIban ? String(beneficiaryIban).slice(0, 50) : undefined,
                    metadata: metadata ? (typeof metadata === 'object' ? JSON.parse(JSON.stringify(metadata)) : undefined) : undefined
                }
            });
            // Recalculate from all transactions (prevents drift)
            await this.recalculateBalance(oldTransaction.accountId!, tx);
            return updateResult;
        });

        // Trigger internal transfer detection automatically after modifying transaction
        // (amount or date might have changed, creating or breaking a link)
        await InternalTransferService.detectAndLinkTransfers(profileId).catch(console.error);

        return result;
    }

    static async deleteTransaction(profileId: string, id: string) {
        // Verify ownership
        const transaction = await prisma.transaction.findFirst({
            where: { id, account: { bank: { profileId } } }
        });

        if (!transaction || !transaction.accountId) {
            throw new Error('Transaction not found');
        }

        const accountId = transaction.accountId;

        // Atomic: delete transaction + recalculate balance
        await prisma.$transaction(async (tx) => {
            await tx.transaction.delete({ where: { id } });
            await this.recalculateBalance(accountId, tx);
        });

        return { message: 'Transaction deleted' };
    }

    // --- AI Categorization ---
    static async categorizeTransactions(profileId: string, transactionIds: string[]) {
        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            throw new Error('Transaction IDs required');
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                id: { in: transactionIds },
                account: { bank: { profileId } } // Security: user can only categorize their own
            }
        });

        if (transactions.length === 0) {
            throw new Error('No transactions found');
        }

        // Get user's API key
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });

        const apiKey = (profile?.settings as any)?.google_gemini_summaries;

        if (!apiKey) {
            throw new Error('No API key configured. Please add your Gemini API key in Settings.');
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
            const safeCategory = String(category).substring(0, 255);
            const txId = String(tx.id);
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId)) {
                return Promise.resolve();
            }
            return prisma.transaction.update({
                where: { id: txId },
                data: { category: safeCategory }
            });
        });

        await Promise.all(updates);

        return {
            message: 'Categorization complete',
            categorized: Object.keys(categorizedMap).length,
            categories: categorizedMap
        };
    }

    // --- Import Logs ---
    static async getImportLogs(profileId: string) {
        return await prisma.importLog.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    // --- Export Data ---
    static async exportDataJson(profileId: string) {
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

        if (!data) throw new Error('Profile not found');

        return {
            exportedAt: new Date(),
            banks: data.banks,
            budgets: data.budgets
        };
    }

    static async exportDataCsv(profileId: string) {
        const transactions = await prisma.transaction.findMany({
            where: { account: { bank: { profileId } } },
            include: {
                account: {
                    include: { bank: true }
                }
            },
            orderBy: { date: 'desc' }
        });

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

        return header + rows;
    }

    // --- Bulk Reclassification ---
    static async reclassifyAllTransactions(profileId: string) {
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                OR: [
                    { classification: 'UNKNOWN' },
                    { classificationConfidence: { lt: 0.8 } }
                ]
            },
            include: {
                account: {
                    include: { bank: true }
                }
            }
        });

        let updated = 0;
        const updatedIds: string[] = [];

        for (const tx of transactions) {
            if (!tx.account) continue;
            const bankId = tx.account.bankId;

            const result = await ClassificationService.classifyTransaction(
                profileId,
                tx.description,
                tx.amount.toNumber(),
                bankId,
                tx.beneficiaryIban || undefined
            );

            if (result.classification !== 'UNKNOWN') {
                const hasChanged = result.classification !== tx.classification;
                const confidenceImproved = (result.confidenceScore || 0) > (tx.classificationConfidence || 0);

                if (hasChanged || confidenceImproved) {
                    await prisma.transaction.update({
                        where: { id: tx.id },
                        data: {
                            classification: result.classification,
                            classificationConfidence: result.confidenceScore,
                            linkedAccountId: result.linkedAccountId
                        }
                    });
                    updated++;
                    updatedIds.push(tx.id);
                }
            }
        }

        // Trigger Auto-categorization for updated IDs
        if (updatedIds.length > 0) {
            const matches = await CategoryMatcherService.matchTransactions(profileId, updatedIds);
            const matchEntries = Object.entries(matches);

            if (matchEntries.length > 0) {
                const catUpdates = matchEntries.map(([id, category]) => {
                    return prisma.transaction.update({
                        where: { id },
                        data: { category }
                    });
                });
                await prisma.$transaction(catUpdates);
            }
        }

        return { success: true, updated, total: transactions.length };
    }

    // --- Financial Audit (AI) ---
    static async generateAudit(profileId: string, transactions: any[]) {
        if (!Array.isArray(transactions) || transactions.length === 0) {
            throw new Error('Transactions are required for audit');
        }

        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });

        const settings = (profile?.settings as any) || {};
        const provider = settings.finance_audit_provider || 'google';
        const model = settings.finance_audit_model || 'gemini-1.5-flash';

        let apiKey = '';
        if (provider === 'google') {
            apiKey = settings.google_gemini_summaries || process.env.GEMINI_API_KEY || '';
        } else {
            apiKey = settings.perplexity_summaries || process.env.PERPLEXITY_API_KEY || '';
        }

        if (!apiKey) {
            const providerName = provider === 'google' ? 'Gemini' : 'Perplexity';
            throw new Error(`No API key configured for ${providerName}. Please add it in Settings.`);
        }

        const txList = transactions
            .slice(0, 50)
            .map((t: any) => `[${new Date(t.date).toLocaleDateString()}] ${t.amount}€ - ${t.description} (${t.category || t.classification || 'Sans catégorie'})`)
            .join('\n');

        const systemPrompt = "Tu es un analyste financier personnel expert. Ton objectif est d'analyser les transactions récentes de l'utilisateur et de lui donner un résumé court (max 150 mots), percutant et des conseils actionnables.";
        const prompt = `Voici mes dernières transactions :\n${txList}\n\nAnalyse ma situation financière récente. Identifie les tendances de dépenses, les anomalies éventuelles et propose 2-3 conseils concrets pour optimiser mon budget.\nRéponds en français avec un ton encourageant mais professionnel.`;

        const auditText = await aiService.generateText(prompt, systemPrompt, model, apiKey);
        return { audit: auditText };
    }

    // --- Auto Categorization (Keyword-based) ---
    static async autoCategorizeTransactionsLocal(profileId: string, transactionIds: string[]) {
        const matches = await CategoryMatcherService.matchTransactions(profileId, transactionIds);
        const matchEntries = Object.entries(matches);

        if (matchEntries.length === 0) {
            return { success: true, updated: 0, message: 'No matches found.' };
        }

        const updates = matchEntries.map(([id, category]) => {
            return prisma.transaction.update({
                where: { id },
                data: { category }
            });
        });

        await prisma.$transaction(updates);

        return {
            success: true,
            updated: matchEntries.length,
            matches
        };
    }
}
