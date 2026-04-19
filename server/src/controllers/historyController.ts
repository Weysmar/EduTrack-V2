import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

/**
 * GET /api/finance/history/balance
 * Returns the total net worth history for the last X months.
 */
export const getBalanceHistory = async (req: AuthRequest, res: Response) => {
    try {
        const profileId = req.user!.id;
        const monthsCount = parseInt(req.query.months as string) || 6; // Default to 6 months for dashboard clarity

        // 1. Get all active accounts for this profile and their CURRENT balance
        const accounts = await prisma.account.findMany({
            where: { bank: { profileId }, active: true },
            select: { id: true, balance: true }
        });

        if (accounts.length === 0) {
            return res.json([]);
        }

        // 2. Fetch all transactions for these accounts to reconstruct history
        // We only go back as far as needed
        const startDate = startOfMonth(subMonths(new Date(), monthsCount));
        
        const transactions = await prisma.transaction.findMany({
            where: {
                accountId: { in: accounts.map(a => a.id) },
                date: { gte: startDate }
            },
            orderBy: { date: 'desc' }
        });

        // 3. Reconstruct history monthly by working backwards from TODAY's balance
        const history = [];
        let runningTotals = accounts.reduce((map, acc) => {
            map[acc.id] = Number(acc.balance || 0);
            return map;
        }, {} as Record<string, number>);

        // Group transactions by month to avoid O(N^2) filtering
        const txByMonthOffset: Record<number, any[]> = {};
        const now = new Date();
        
        for (const tx of transactions) {
            const txDate = new Date(tx.date);
            // Calculate how many months ago this happened
            const monthOffset = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth());
            if (monthOffset >= 0 && monthOffset <= monthsCount) {
                if (!txByMonthOffset[monthOffset]) txByMonthOffset[monthOffset] = [];
                txByMonthOffset[monthOffset].push(tx);
            }
        }

        for (let i = 0; i <= monthsCount; i++) {
            const referenceDate = subMonths(now, i);
            const mEnd = endOfMonth(referenceDate);

            // Total at end of this month
            const totalNetWorth = Object.values(runningTotals).reduce((sum, b) => sum + b, 0);

            history.push({
                date: mEnd,
                label: format(referenceDate, 'MMM yy'),
                value: Math.round(totalNetWorth * 100) / 100
            });

            // Revert transactions of THIS month to find balance at START of month (which is END of prev month)
            const monthTx = txByMonthOffset[i] || [];
            for (const tx of monthTx) {
                if (tx.accountId && runningTotals[tx.accountId] !== undefined) {
                    runningTotals[tx.accountId] -= Number(tx.amount);
                }
            }
        }

        res.json(history.reverse());
    } catch (error: any) {
        console.error('[FinanceHistory] Error:', error);
        res.status(500).json({ error: 'Failed to generate balance history', details: error.message });
    }
};
