import { prisma } from '../lib/prisma';
import { HealthScoreService } from './healthScoreService';
import { cacheService } from './cacheService';

export interface MonthlyReport {
    period: { month: number; year: number };
    summary: {
        totalIncome: number;
        totalExpenses: number;
        savingsAmount: number;
        savingsRate: number;
        incomeVsPreviousMonth: number;
        expensesVsPreviousMonth: number;
    };
    topExpenses: { category: string; amount: number; percentOfTotal: number }[];
    budgetReport: { category: string; budgeted: number; spent: number; status: string }[];
    recurringReport: { description: string; amount: number; status: 'OK' | 'MISSED' }[];
    savingsGoals: { name: string; progress: number; target: number; current: number; onTrack: boolean }[];
    healthScore: number;
}

export class MonthlyReportService {
    static async generateReport(profileId: string, month: number, year: number): Promise<MonthlyReport> {
        const cacheKey = `profile:${profileId}:report:${year}-${month}`;
        const cached = cacheService.get<MonthlyReport>(cacheKey);
        if (cached) return cached;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const prevStartDate = new Date(year, month - 2, 1);
        const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59);

        // Fetch data in parallel
        const [transactions, prevTransactions, budgets, recurring, goals] = await Promise.all([
            prisma.transaction.findMany({
                where: { account: { bank: { profileId } }, date: { gte: startDate, lte: endDate } },
                select: { amount: true, category: true, description: true, date: true }
            }),
            prisma.transaction.findMany({
                where: { account: { bank: { profileId } }, date: { gte: prevStartDate, lte: prevEndDate } },
                select: { amount: true }
            }),
            prisma.budget.findMany({
                where: { profileId },
                include: { category: true }
            }),
            prisma.recurringTransaction.findMany({
                where: { profileId, isActive: true }
            }),
            prisma.savingsGoal.findMany({
                where: { profileId, status: 'ACTIVE' }
            })
        ]);

        // --- Summary ---
        const totalIncome = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const totalExpenses = transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const savingsAmount = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? savingsAmount / totalIncome : 0;

        const prevIncome = prevTransactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const prevExpenses = prevTransactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const incomeVsPreviousMonth = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
        const expensesVsPreviousMonth = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

        // --- Top Expenses by Category ---
        const expensesByCategory: Record<string, number> = {};
        for (const tx of transactions.filter(t => Number(t.amount) < 0)) {
            const cat = tx.category || 'Non catégorisé';
            expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(Number(tx.amount));
        }
        const topExpenses = Object.entries(expensesByCategory)
            .map(([category, amount]) => ({
                category,
                amount: Math.round(amount * 100) / 100,
                percentOfTotal: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8);

        // --- Budget Report ---
        const budgetReport = budgets.map(budget => {
            const spent = transactions
                .filter(t => t.category === budget.category.name && Number(t.amount) < 0)
                .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
            const budgeted = Number(budget.amount);
            const ratio = budgeted > 0 ? spent / budgeted : 0;

            return {
                category: budget.category.name,
                budgeted: Math.round(budgeted * 100) / 100,
                spent: Math.round(spent * 100) / 100,
                status: ratio >= 1 ? 'EXCEEDED' : ratio >= 0.8 ? 'WARNING' : 'OK'
            };
        });

        // --- Recurring Report ---
        const recurringReport = recurring.map(rec => {
            const found = transactions.some(t =>
                t.description.toLowerCase().includes(rec.description.toLowerCase().substring(0, 10)) &&
                Math.abs(Number(t.amount) - Number(rec.averageAmount)) < Math.abs(Number(rec.averageAmount) * 0.3)
            );
            return {
                description: rec.description,
                amount: Math.round(Math.abs(Number(rec.averageAmount)) * 100) / 100,
                status: found ? 'OK' as const : 'MISSED' as const
            };
        });

        // --- Savings Goals ---
        const savingsGoalsReport = goals.map(goal => {
            const target = Number(goal.targetAmount);
            const current = Number(goal.currentAmount);
            const progress = target > 0 ? (current / target) * 100 : 0;
            let onTrack = true;
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                const created = new Date(goal.createdAt);
                const totalDays = (deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                const elapsedDays = (endDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
                onTrack = progress >= expectedProgress * 0.8;
            }
            return {
                name: goal.name,
                progress: Math.round(progress * 100) / 100,
                target: Math.round(target * 100) / 100,
                current: Math.round(current * 100) / 100,
                onTrack
            };
        });

        // --- Health Score ---
        let healthScore = 50;
        try {
            const scoreResult = await HealthScoreService.calculateScore(profileId);
            healthScore = scoreResult.globalScore;
        } catch { /* fallback to 50 */ }

        const report = {
            period: { month, year },
            summary: {
                totalIncome: Math.round(totalIncome * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                savingsAmount: Math.round(savingsAmount * 100) / 100,
                savingsRate: Math.round(savingsRate * 10000) / 100,
                incomeVsPreviousMonth: Math.round(incomeVsPreviousMonth * 100) / 100,
                expensesVsPreviousMonth: Math.round(expensesVsPreviousMonth * 100) / 100
            },
            topExpenses,
            budgetReport,
            recurringReport,
            savingsGoals: savingsGoalsReport,
            healthScore
        };

        cacheService.set(cacheKey, report);
        return report;
    }
}
