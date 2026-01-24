import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

// GET /api/finance/accounts
export const getAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const accounts = await prisma.financialAccount.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
};

// POST /api/finance/accounts
export const createAccount = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { name, type, balance, color, icon } = req.body;

        const account = await prisma.financialAccount.create({
            data: {
                profileId,
                name,
                type,
                balance: parseFloat(balance || 0),
                color: color || '#10b981',
                icon: icon || '🏦'
            }
        });
        res.status(201).json(account);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create account' });
    }
};

// PUT /api/finance/accounts/:id
export const updateAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;
        // Verify ownership
        const exists = await prisma.financialAccount.count({ where: { id, profileId } });
        if (!exists) return res.status(404).json({ error: 'Account not found' });

        const updated = await prisma.financialAccount.update({
            where: { id },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update account' });
    }
};

// DELETE /api/finance/accounts/:id
export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;
        // Verify ownership
        const exists = await prisma.financialAccount.count({ where: { id, profileId } });
        if (!exists) return res.status(404).json({ error: 'Account not found' });

        await prisma.financialAccount.delete({ where: { id } });
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
};

// GET /api/finance/transactions
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { accountId, startDate, endDate, category, type, minAmount, maxAmount } = req.query;

        const where: any = { profileId };
        if (accountId) where.accountId = String(accountId);
        if (startDate && endDate) {
            where.date = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        if (category) where.categoryId = String(category);
        if (type) where.type = String(type);

        // Amount Filter (Absolute value comparison)
        if (minAmount || maxAmount) {
            // Complex filtering because amounts are signed (- for expense, + for income)
            // But user wants "Transactions > 50€".
            // We can filter by absolute amount if possible, but Prisma doesn't support ABS() in where easily on all DBs.
            // Alternative: Filter in memory (fine for <1000 txs) OR handle ranges.
            // If we filter in DB: 
            // - If Min=50, Max=100. We want -100 to -50 AND 50 to 100.

            const min = minAmount ? parseFloat(String(minAmount)) : 0;
            const max = maxAmount ? parseFloat(String(maxAmount)) : Number.MAX_SAFE_INTEGER;

            const OR = [];
            // Positive (Income)
            OR.push({
                amount: {
                    gte: min,
                    lte: max
                }
            });
            // Negative (Expense) - ranges become inverted: -100 (smaller) to -50 (larger)
            OR.push({
                amount: {
                    gte: -max,
                    lte: -min
                }
            });
            where.OR = OR;
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
            take: 100 // Limit for now
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// POST /api/finance/transactions
export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { accountId, amount, type, description, categoryId, date, receiptUrl, isRecurring, recurringRule } = req.body;

        const transaction = await prisma.transaction.create({
            data: {
                profileId,
                accountId,
                amount: parseFloat(amount),
                type,
                description,
                categoryId,
                date: date ? new Date(date) : new Date(),
                receiptUrl,
                isRecurring: Boolean(isRecurring),
                recurringRule
            },
            include: { category: true }
        });

        // Update account balance if accountId provided
        if (accountId) {
            // INCOME adds to balance, EXPENSE subtracts (assuming amount is absolute or signed appropriately)
            // Convention: amount signed? Schema comment says "Positive=Income, Negative=Expense"
            // But usually UI sends positive amounts and type.
            // Let's assume input amount is absolute, and we apply sign based on type.

            let adjustment = parseFloat(amount);
            if (type === 'EXPENSE') adjustment = -Math.abs(adjustment);
            else adjustment = Math.abs(adjustment);

            // Update transaction to store signed amount if desired?
            // Schema comment: "Positif = revenu, Négatif = dépense".
            // So we should store signed amount.
            // Ensure transaction.amount is treated as number for comparison
            const txAmount = new Prisma.Decimal(transaction.amount).toNumber();

            if ((type === 'EXPENSE' && txAmount > 0) || (type === 'INCOME' && txAmount < 0)) {
                // Fix sign in DB if needed, or assume frontend sends correct sign.
                // Let's enforce sign based on type
                const signedAmount = type === 'EXPENSE' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { amount: signedAmount }
                });

                await prisma.financialAccount.update({
                    where: { id: accountId },
                    data: { balance: { increment: signedAmount } }
                });
            } else {
                await prisma.financialAccount.update({
                    where: { id: accountId },
                    data: { balance: { increment: txAmount } }
                });
            }
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

// PUT /api/finance/transactions/:id
export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        const oldTransaction = await prisma.transaction.findUnique({ where: { id } });
        if (!oldTransaction || oldTransaction.profileId !== profileId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: req.body,
            include: { category: true }
        });

        // Re-calculate balance if amount changed (Simplified: rollback old, apply new)
        if (oldTransaction.accountId && (oldTransaction.amount !== updated.amount)) {
            // Rollback old
            await prisma.financialAccount.update({
                where: { id: oldTransaction.accountId },
                data: { balance: { decrement: oldTransaction.amount } }
            });
            // Apply new
            await prisma.financialAccount.update({
                where: { id: oldTransaction.accountId },
                data: { balance: { increment: updated.amount } }
            });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

// DELETE /api/finance/transactions/:id
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;

        const transaction = await prisma.transaction.findUnique({ where: { id } });
        if (!transaction || transaction.profileId !== profileId) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        await prisma.transaction.delete({ where: { id } });

        // Rollback balance
        if (transaction.accountId) {
            await prisma.financialAccount.update({
                where: { id: transaction.accountId },
                data: { balance: { decrement: transaction.amount } }
            });
        }

        res.json({ message: 'Transaction deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
};

// DELETE /api/finance/transactions/bulk/delete
export const bulkDeleteTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const profileId = req.user!.id;

        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });

        // Get transactions to rollback balances
        const transactions = await prisma.transaction.findMany({
            where: { id: { in: ids }, profileId }
        });

        for (const t of transactions) {
            if (t.accountId) {
                await prisma.financialAccount.update({
                    where: { id: t.accountId },
                    data: { balance: { decrement: t.amount } }
                });
            }
        }

        await prisma.transaction.deleteMany({
            where: { id: { in: ids }, profileId }
        });

        res.json({ message: 'Transactions deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to bulk delete transactions' });
    }
};


// Categories
export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const categories = await prisma.transactionCategory.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, icon, color, parentId } = req.body;
        const category = await prisma.transactionCategory.create({
            data: { name, type, icon, color, parentId }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};

// Budgets
export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const budgets = await prisma.budget.findMany({
            where: { profileId },
            include: { category: true }
        });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const { categoryId, amount, period } = req.body;
        const budget = await prisma.budget.create({
            data: { profileId, categoryId, amount: parseFloat(amount), period }
        });
        res.status(201).json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create budget' });
    }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user!.id;
        const updated = await prisma.budget.updateMany({
            where: { id, profileId },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget' });
    }
};


// AI Features
export const enrichTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { description, amount } = req.body;

        if (!description || !amount) {
            return res.status(400).json({ error: 'Description and amount required in body' });
        }

        const prompt = `Analyze this expense: "${description}" amount ${Math.abs(parseFloat(amount))} EUR. 
        Suggestion in French JSON format: { "betterOffer": "alternative service name", "savings": estimated_monthly_savings_number, "advice": "short advice string" }.
        If no specific alternative, provide general advice.`;

        const profileId = req.user!.id;
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });

        // Extract API key from settings (JSON)
        const settings = profile?.settings as any || {};
        const userApiKey = settings.google_gemini_summaries || settings.google_gemini_exercises;

        let result;
        try {
            // Pass userApiKey (can be undefined, aiService falls back to env)
            result = await aiService.generateJSON(prompt, "You are a financial advisor helper.", 'gemini-2.0-flash-exp', userApiKey);
        } catch (e) {
            console.warn("AI enrichment failed, using mock", e);
            result = { betterOffer: null, savings: 0, advice: "Service indisponible" };
        }

        // Return result directly to client (Local-First pattern)
        res.json({ success: true, suggestions: result });
    } catch (error) {
        res.status(500).json({ error: 'Enrichment failed' });
    }
};

export const generateAudit = async (req: AuthRequest, res: Response) => {
    try {
        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ error: "Transactions array required" });
        }

        if (transactions.length === 0) return res.json({ audit: "Aucune transaction à analyser." });

        const summary = transactions.map((t: any) =>
            `${new Date(t.date).toISOString().split('T')[0]}: ${t.description} (${t.amount}€) [${t.category || 'Uncategorized'}]`
        ).join('\n');

        const prompt = `Rédige un audit financier concis et bienveillant (style coach) basé sur ces transactions :\n${summary}\n. 
        Structure:
        1. 📊 Analyse Globale
        2. 🚨 Points d'Attention (Dépenses superflues)
        3. 💡 Conseils d'Optimisation
        Mets en page avec du Markdown élégant.`;

        const profileId = req.user!.id;
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });
        const settings = profile?.settings as any || {};
        const userApiKey = settings.google_gemini_summaries || settings.google_gemini_exercises;

        const audit = await aiService.generateText(prompt, "Tu es un expert en finances personnelles.", 'gemini-2.0-flash-exp', userApiKey);

        res.json({ audit, transactionCount: transactions.length });
    } catch (error) {
        res.status(500).json({ error: 'Audit generation failed' });
    }
};

// Import Features
import { parseCsv } from '../services/csvParserService';
import { categorizerService } from '../services/categorizerService';

export const uploadTransactions = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const profileId = req.user!.id;
        const { accountId } = req.body;

        // 1. Fetch User Settings for API Key
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { settings: true }
        });
        const settings = profile?.settings as any || {};
        const userApiKey = settings.google_gemini_summaries || settings.google_gemini_exercises;

        // 2. Parse File
        const ext = req.file.originalname.split('.').pop()?.toLowerCase();
        let transactions: any[] = [];

        if (ext === 'csv') {
            transactions = await parseCsv(req.file.buffer);
        } else if (ext === 'xlsx') {
            const { parseXlsx } = await import('../services/xlsxParserService'); // Lazy import
            transactions = await parseXlsx(req.file.buffer);
        } else if (ext === 'ofx') {
            const { parseOfx } = await import('../services/ofxParserService'); // Lazy import
            transactions = await parseOfx(req.file.buffer);
        } else {
            return res.status(400).json({ error: "Unsupported file format. Only CSV, XLSX, OFX supported." });
        }

        // 3. AI Categorization (Batch)
        let categoriesMap: Record<string, string> = {};
        if (userApiKey || process.env.GEMINI_API_KEY) {
            try {
                // Prepare small batch for AI (Limit to 50 to avoid timeouts for now)
                const toCategorize = transactions.slice(0, 50).map(t => ({
                    description: t.description,
                    amount: t.amount
                }));

                categoriesMap = await categorizerService.categorizeBatch(toCategorize, userApiKey);
            } catch (e) {
                console.warn("Auto-categorization skipped due to error:", e);
            }
        }

        // 4. Get or Create Categories in DB
        const existingCategories = await prisma.transactionCategory.findMany();
        const categoryNameIdMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

        const getCategoryId = async (name: string): Promise<string | null> => {
            const normalized = name.toLowerCase();
            if (categoryNameIdMap.has(normalized)) return categoryNameIdMap.get(normalized)!;

            try {
                const newCat = await prisma.transactionCategory.create({
                    data: { name: name, type: 'EXPENSE', icon: 'tag', color: '#94a3b8' }
                });
                categoryNameIdMap.set(normalized, newCat.id);
                return newCat.id;
            } catch (e) {
                return null;
            }
        };

        // 5. Deduplication & Insertion Logic
        let importedCount = 0;
        let duplicateCount = 0;

        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            try {
                const amount = new Prisma.Decimal(tx.amount);

                // Determine Category
                let categoryId = null;
                if (categoriesMap[i]) {
                    categoryId = await getCategoryId(categoriesMap[i]);
                }

                await prisma.transaction.create({
                    data: {
                        profileId,
                        accountId: accountId || undefined,
                        date: tx.date,
                        description: tx.description,
                        amount: amount,
                        type: tx.type, // Parser detected sign
                        categoryId: categoryId
                    }
                });
                importedCount++;

                if (accountId) {
                    await prisma.financialAccount.update({
                        where: { id: accountId },
                        data: { balance: { increment: amount } }
                    });
                }

            } catch (e: any) {
                if (e.code === 'P2002') {
                    // Unique constraint violation - Skip
                    duplicateCount++;
                } else {
                    console.error("Import Error Row:", e);
                }
            }
        }

        res.json({
            success: true,
            message: "Import processing complete",
            stats: {
                total: transactions.length,
                imported: importedCount,
                duplicates: duplicateCount,
                categorized: Object.keys(categoriesMap).length
            }
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: 'Failed to process upload' });
    }
};

// Reports
import { reportService } from '../services/reportService';

export const generateReport = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const profileId = req.user!.id;

        if (!month || !year) return res.status(400).json({ error: "Month and Year required" });

        const pdfBuffer = await reportService.generateMonthlyReport({
            profileId,
            month: parseInt(String(month)),
            year: parseInt(String(year))
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=rapport_financier_${month}_${year}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("Report Generation Error:", error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export const scanReceipt = async (req: AuthRequest, res: Response) => {
    // Placeholder 
    res.status(501).json({ message: "Not implemented backend-side yet" });
};
