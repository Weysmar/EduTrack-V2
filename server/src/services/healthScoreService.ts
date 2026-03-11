import { prisma } from '../lib/prisma';

interface ScoreCriteria {
    score: number;
    value: number;
    weight: number;
    label: string;
}

export interface HealthScoreResult {
    globalScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
        savingsRate: ScoreCriteria;
        budgetCompliance: ScoreCriteria;
        incomeStability: ScoreCriteria;
        fixedRatio: ScoreCriteria;
        diversification: ScoreCriteria;
        trend: ScoreCriteria;
    };
    tips: string[];
}

export class HealthScoreService {
    static async calculateScore(profileId: string): Promise<HealthScoreResult> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

        // Fetch all needed data in parallel
        const [transactions, budgets, recurring, incomeByMonth] = await Promise.all([
            prisma.transaction.findMany({
                where: { account: { bank: { profileId } }, date: { gte: sixMonthsAgo } },
                select: { amount: true, date: true, category: true }
            }),
            prisma.budget.findMany({
                where: { profileId },
                include: { category: true }
            }),
            prisma.recurringTransaction.findMany({
                where: { profileId, isActive: true, type: 'EXPENSE' },
                select: { averageAmount: true }
            }),
            // Group income by month for stability calculation
            prisma.transaction.groupBy({
                by: ['date'],
                where: { account: { bank: { profileId } }, date: { gte: sixMonthsAgo }, amount: { gt: 0 } },
                _sum: { amount: true }
            })
        ]);

        // --- 1. Savings Rate (30%) ---
        const thisMonthTx = transactions.filter(t => new Date(t.date) >= startOfMonth);
        const income = thisMonthTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const expenses = thisMonthTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const savingsRateValue = income > 0 ? (income - expenses) / income : 0;
        const savingsRateScore = Math.max(0, Math.min(100, savingsRateValue * 400)); // 25% = 100

        // --- 2. Budget Compliance (25%) ---
        let budgetOk = 0;
        for (const budget of budgets) {
            const spent = thisMonthTx
                .filter(t => t.category === budget.category.name && Number(t.amount) < 0)
                .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
            if (spent <= Number(budget.amount)) budgetOk++;
        }
        const budgetComplianceValue = budgets.length > 0 ? budgetOk / budgets.length : 1;
        const budgetComplianceScore = budgetComplianceValue * 100;

        // --- 3. Income Stability (15%) ---
        const monthlyIncomes = HealthScoreService.groupByMonth(
            transactions.filter(t => Number(t.amount) > 0)
        );
        const incomeValues = Object.values(monthlyIncomes);
        const meanIncome = incomeValues.length > 0 ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length : 0;
        const stddevIncome = incomeValues.length > 1
            ? Math.sqrt(incomeValues.reduce((s, v) => s + Math.pow(v - meanIncome, 2), 0) / incomeValues.length)
            : 0;
        const incomeStabilityValue = meanIncome > 0 ? 1 - (stddevIncome / meanIncome) : 0;
        const incomeStabilityScore = Math.max(0, Math.min(100, incomeStabilityValue * 100));

        // --- 4. Fixed Ratio (15%) ---
        const monthlyFixed = recurring.reduce((s, r) => s + Math.abs(Number(r.averageAmount)), 0);
        const fixedRatioValue = meanIncome > 0 ? monthlyFixed / meanIncome : 0;
        // Good: < 30%, Bad: > 80%
        const fixedRatioScore = Math.max(0, Math.min(100, (1 - (fixedRatioValue - 0.3) / 0.5) * 100));

        // --- 5. Diversification (10%) ---
        const incomeSources = new Set(
            transactions.filter(t => Number(t.amount) > 0 && t.category).map(t => t.category)
        ).size;
        const diversificationValue = Math.min(incomeSources / 3, 1);
        const diversificationScore = diversificationValue * 100;

        // --- 6. Trend (5%) ---
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthTx = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= prevMonth && d <= prevMonthEnd;
        });
        const prevIncome = prevMonthTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const prevExpenses = prevMonthTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const prevSavingsRate = prevIncome > 0 ? (prevIncome - prevExpenses) / prevIncome : 0;
        const trendValue = savingsRateValue - prevSavingsRate;
        const trendScore = Math.max(0, Math.min(100, 50 + trendValue * 200));

        // --- Global Score ---
        const breakdown = {
            savingsRate: { score: Math.round(savingsRateScore), value: Math.round(savingsRateValue * 100), weight: 0.30, label: "Taux d'épargne" },
            budgetCompliance: { score: Math.round(budgetComplianceScore), value: Math.round(budgetComplianceValue * 100), weight: 0.25, label: 'Respect des budgets' },
            incomeStability: { score: Math.round(incomeStabilityScore), value: Math.round(incomeStabilityValue * 100), weight: 0.15, label: 'Stabilité des revenus' },
            fixedRatio: { score: Math.round(fixedRatioScore), value: Math.round((1 - fixedRatioValue) * 100), weight: 0.15, label: 'Ratio charges fixes' },
            diversification: { score: Math.round(diversificationScore), value: incomeSources, weight: 0.10, label: 'Diversification' },
            trend: { score: Math.round(trendScore), value: Math.round(trendValue * 100), weight: 0.05, label: 'Tendance' }
        };

        const globalScore = Math.round(
            breakdown.savingsRate.score * 0.30 +
            breakdown.budgetCompliance.score * 0.25 +
            breakdown.incomeStability.score * 0.15 +
            breakdown.fixedRatio.score * 0.15 +
            breakdown.diversification.score * 0.10 +
            breakdown.trend.score * 0.05
        );

        const grade = globalScore >= 90 ? 'A' : globalScore >= 75 ? 'B' : globalScore >= 60 ? 'C' : globalScore >= 40 ? 'D' : 'F';

        // --- Tips ---
        const tips: string[] = [];
        if (savingsRateScore < 50) tips.push("Essayez d'épargner au moins 20% de vos revenus chaque mois.");
        if (budgetComplianceScore < 80) tips.push('Plusieurs budgets sont dépassés. Revoyez vos catégories de dépenses.');
        if (fixedRatioScore < 50) tips.push('Vos charges fixes représentent une part importante de vos revenus. Cherchez à les réduire.');
        if (diversificationScore < 50) tips.push('Diversifiez vos sources de revenus pour plus de stabilité.');
        if (trendScore < 40) tips.push('Votre situation financière se dégrade. Analysez vos dernières dépenses.');
        if (tips.length === 0) tips.push('Excellent ! Continuez à maintenir cette discipline financière.');

        return { globalScore, grade, breakdown, tips: tips.slice(0, 3) };
    }

    private static groupByMonth(transactions: { amount: any; date: Date }[]): Record<string, number> {
        const groups: Record<string, number> = {};
        for (const tx of transactions) {
            const key = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`;
            groups[key] = (groups[key] || 0) + Math.abs(Number(tx.amount));
        }
        return groups;
    }
}
