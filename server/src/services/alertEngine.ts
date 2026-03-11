import { prisma } from '../lib/prisma';

interface AlertData {
    type: string;
    severity: string;
    title: string;
    message: string;
    data?: any;
}

export class AlertEngine {
    /**
     * Run all alert checks for a profile.
     * Deduplicates by type+title to avoid spamming.
     */
    static async checkAlerts(profileId: string): Promise<number> {
        const allAlerts: AlertData[] = [];

        const [budget, lowBalance, unusual, missing, goals] = await Promise.allSettled([
            AlertEngine.checkBudgetAlerts(profileId),
            AlertEngine.checkLowBalance(profileId),
            AlertEngine.checkUnusualTransaction(profileId),
            AlertEngine.checkMissingRecurring(profileId),
            AlertEngine.checkSavingsGoals(profileId)
        ]);

        for (const result of [budget, lowBalance, unusual, missing, goals]) {
            if (result.status === 'fulfilled') allAlerts.push(...result.value);
        }

        // Deduplicate: don't create if same type+title exists in last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAlerts = await prisma.financeAlert.findMany({
            where: { profileId, createdAt: { gte: oneDayAgo } },
            select: { type: true, title: true }
        });
        const recentSet = new Set(recentAlerts.map(a => `${a.type}::${a.title}`));

        const newAlerts = allAlerts.filter(a => !recentSet.has(`${a.type}::${a.title}`));

        if (newAlerts.length > 0) {
            await prisma.financeAlert.createMany({
                data: newAlerts.map(a => ({
                    profileId,
                    type: a.type as any,
                    severity: a.severity as any,
                    title: a.title,
                    message: a.message,
                    data: a.data || undefined
                }))
            });
        }

        console.log(`[AlertEngine] Created ${newAlerts.length} new alerts for profile ${profileId}`);
        return newAlerts.length;
    }

    /**
     * Check budget alerts: WARNING at 80%, CRITICAL when exceeded.
     */
    static async checkBudgetAlerts(profileId: string): Promise<AlertData[]> {
        const alerts: AlertData[] = [];
        const budgets = await prisma.budget.findMany({
            where: { profileId },
            include: { category: true }
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const budget of budgets) {
            const spent = await prisma.transaction.aggregate({
                where: {
                    account: { bank: { profileId } },
                    category: budget.category.name,
                    date: { gte: startOfMonth },
                    amount: { lt: 0 }
                },
                _sum: { amount: true }
            });

            const totalSpent = Math.abs(Number(spent._sum.amount || 0));
            const budgetAmount = Number(budget.amount);
            const ratio = totalSpent / budgetAmount;

            if (ratio >= 1) {
                alerts.push({
                    type: 'BUDGET_EXCEEDED',
                    severity: 'CRITICAL',
                    title: `Budget "${budget.category.name}" dépassé`,
                    message: `Vous avez dépensé ${totalSpent.toFixed(0)}€ sur un budget de ${budgetAmount.toFixed(0)}€ (${(ratio * 100).toFixed(0)}%).`,
                    data: { categoryId: budget.categoryId, budgetId: budget.id, spent: totalSpent, limit: budgetAmount }
                });
            } else if (ratio >= 0.8) {
                alerts.push({
                    type: 'BUDGET_WARNING',
                    severity: 'WARNING',
                    title: `Budget "${budget.category.name}" bientôt atteint`,
                    message: `Vous avez utilisé ${(ratio * 100).toFixed(0)}% de votre budget (${totalSpent.toFixed(0)}€ / ${budgetAmount.toFixed(0)}€).`,
                    data: { categoryId: budget.categoryId, budgetId: budget.id, spent: totalSpent, limit: budgetAmount }
                });
            }
        }
        return alerts;
    }

    /**
     * Check if any account has a low balance (< 200€).
     */
    static async checkLowBalance(profileId: string, threshold: number = 200): Promise<AlertData[]> {
        const alerts: AlertData[] = [];
        const accounts = await prisma.account.findMany({
            where: { bank: { profileId }, active: true },
            include: { bank: true }
        });

        for (const account of accounts) {
            const balance = Number(account.balance || 0);
            if (balance < threshold && balance >= 0) {
                alerts.push({
                    type: 'LOW_BALANCE',
                    severity: 'WARNING',
                    title: `Solde bas : ${account.name}`,
                    message: `Le solde de votre compte "${account.name}" (${account.bank.name}) est de ${balance.toFixed(2)}€, en dessous du seuil de ${threshold}€.`,
                    data: { accountId: account.id, balance, threshold }
                });
            } else if (balance < 0) {
                alerts.push({
                    type: 'LOW_BALANCE',
                    severity: 'CRITICAL',
                    title: `Solde négatif : ${account.name}`,
                    message: `Votre compte "${account.name}" est à découvert (${balance.toFixed(2)}€).`,
                    data: { accountId: account.id, balance }
                });
            }
        }
        return alerts;
    }

    /**
     * Detect unusually large transactions (> 3x monthly average for that category).
     */
    static async checkUnusualTransaction(profileId: string): Promise<AlertData[]> {
        const alerts: AlertData[] = [];
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Recent transactions in last 24h
        const recentTx = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                date: { gte: oneDayAgo },
                amount: { lt: 0 }
            },
            select: { id: true, description: true, amount: true, category: true }
        });

        if (recentTx.length === 0) return alerts;

        // Monthly average per category (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        for (const tx of recentTx) {
            if (!tx.category) continue;
            const txAmount = Math.abs(Number(tx.amount));

            const avgResult = await prisma.transaction.aggregate({
                where: {
                    account: { bank: { profileId } },
                    category: tx.category,
                    date: { gte: threeMonthsAgo },
                    amount: { lt: 0 }
                },
                _avg: { amount: true },
                _count: true
            });

            const avgAmount = Math.abs(Number(avgResult._avg.amount || 0));
            if (avgAmount > 0 && txAmount > avgAmount * 3 && txAmount > 50) {
                alerts.push({
                    type: 'UNUSUAL_TRANSACTION',
                    severity: 'WARNING',
                    title: `Transaction inhabituelle`,
                    message: `"${tx.description}" (${txAmount.toFixed(2)}€) est ${(txAmount / avgAmount).toFixed(1)}x supérieure à la moyenne de la catégorie "${tx.category}".`,
                    data: { transactionId: tx.id, amount: txAmount, average: avgAmount, category: tx.category }
                });
            }
        }
        return alerts;
    }

    /**
     * Check for missing recurring transactions (expected > 5 days ago).
     */
    static async checkMissingRecurring(profileId: string): Promise<AlertData[]> {
        const alerts: AlertData[] = [];
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const overdue = await prisma.recurringTransaction.findMany({
            where: {
                profileId,
                isActive: true,
                isPaused: false,
                nextExpectedDate: { lt: fiveDaysAgo }
            }
        });

        for (const rec of overdue) {
            alerts.push({
                type: 'RECURRING_MISSING',
                severity: 'WARNING',
                title: `Récurrence manquante : ${rec.description}`,
                message: `La transaction "${rec.description}" (${Math.abs(Number(rec.averageAmount)).toFixed(2)}€) était attendue le ${rec.nextExpectedDate?.toLocaleDateString('fr-FR')} mais n'a pas été détectée.`,
                data: { recurringId: rec.id, description: rec.description, expectedDate: rec.nextExpectedDate }
            });
        }
        return alerts;
    }

    /**
     * Check savings goals: CELEBRATION when completed, AT_RISK if behind schedule.
     */
    static async checkSavingsGoals(profileId: string): Promise<AlertData[]> {
        const alerts: AlertData[] = [];
        const goals = await prisma.savingsGoal.findMany({
            where: { profileId, status: 'ACTIVE' }
        });

        const now = new Date();

        for (const goal of goals) {
            const current = Number(goal.currentAmount);
            const target = Number(goal.targetAmount);
            const progress = current / target;

            // Completed
            if (progress >= 1) {
                alerts.push({
                    type: 'GOAL_COMPLETED',
                    severity: 'CELEBRATION',
                    title: `🎉 Objectif atteint : ${goal.name}`,
                    message: `Félicitations ! Vous avez atteint votre objectif "${goal.name}" de ${target.toFixed(0)}€ !`,
                    data: { goalId: goal.id, name: goal.name }
                });
                continue;
            }

            // At risk: deadline within 30 days and behind schedule
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const totalDays = Math.ceil((deadline.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                const elapsedRatio = 1 - (daysLeft / totalDays);

                if (daysLeft > 0 && daysLeft <= 30 && progress < elapsedRatio * 0.8) {
                    alerts.push({
                        type: 'GOAL_AT_RISK',
                        severity: 'WARNING',
                        title: `Objectif en danger : ${goal.name}`,
                        message: `Il reste ${daysLeft} jours pour atteindre "${goal.name}" mais seulement ${(progress * 100).toFixed(0)}% est épargné. Vous devriez être à ${(elapsedRatio * 100).toFixed(0)}%.`,
                        data: { goalId: goal.id, name: goal.name, progress, daysLeft }
                    });
                }
            }
        }
        return alerts;
    }
}
