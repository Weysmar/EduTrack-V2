import { prisma } from '../lib/prisma';

interface ForecastEvent {
    description: string;
    amount: number;
    type: 'RECURRING_INCOME' | 'RECURRING_EXPENSE' | 'VARIABLE_ESTIMATE';
}

interface ForecastDay {
    date: string; // ISO date string
    projectedBalance: number;
    events: ForecastEvent[];
}

export class CashflowForecastService {
    /**
     * Generates a day-by-day cashflow projection for the next N days.
     * 
     * Algorithm:
     * 1. Sum all active account balances → starting balance
     * 2. Fetch active, non-paused RecurringTransactions
     * 3. Calculate average daily variable expenses from last 3 months
     * 4. For each future day:
     *    a. Check if a recurring transaction falls on this day (estimatedDay ±2)
     *    b. Add variable expense estimate
     *    c. Compute projected balance
     */
    static async generateForecast(profileId: string, days: number = 90): Promise<ForecastDay[]> {
        // 1. Get current total balance from all active accounts
        const accounts = await prisma.account.findMany({
            where: {
                bank: { profileId },
                active: true
            },
            select: { balance: true }
        });

        let currentBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

        // 2. Fetch active recurring transactions
        const recurring = await prisma.recurringTransaction.findMany({
            where: {
                profileId,
                isActive: true,
                isPaused: false
            }
        });

        // 3. Calculate average daily variable expenses from last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentTransactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                date: { gte: threeMonthsAgo },
                amount: { lt: 0 } // Only expenses
            },
            select: { amount: true, description: true }
        });

        // Sum of all expenses in last 3 months
        const totalExpenses3m = recentTransactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

        // Sum of recurring expenses (monthly estimate × 3)
        const recurringExpenseMonthly = recurring
            .filter((r: any) => r.type === 'EXPENSE')
            .reduce((sum: number, r: any) => {
                const monthlyAmount = CashflowForecastService.toMonthlyAmount(Number(r.averageAmount), r.frequency);
                return sum + Math.abs(monthlyAmount);
            }, 0);

        const recurringExpenses3m = recurringExpenseMonthly * 3;

        // Variable expenses = total - recurring
        const variableExpenses3m = Math.max(0, totalExpenses3m - recurringExpenses3m);
        const dailyVariableExpense = variableExpenses3m / 90; // ~90 days in 3 months

        // 4. Generate day-by-day projection
        const forecast: ForecastDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= days; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dayOfMonth = targetDate.getDate();

            const events: ForecastEvent[] = [];

            // Check recurring transactions
            for (const rec of recurring) {
                if (CashflowForecastService.matchesDay(rec.estimatedDay, dayOfMonth, rec.frequency, targetDate)) {
                    const amount = Number(rec.averageAmount);
                    events.push({
                        description: rec.description,
                        amount: rec.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount),
                        type: rec.type === 'EXPENSE' ? 'RECURRING_EXPENSE' : 'RECURRING_INCOME'
                    });
                    currentBalance += rec.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);
                }
            }

            // Add variable daily expense estimate (only on weekdays for realism)
            if (dailyVariableExpense > 0) {
                const dayOfWeek = targetDate.getDay();
                // Slightly higher on weekdays, less on weekends
                const factor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.15;
                const variableAmount = dailyVariableExpense * factor;
                events.push({
                    description: 'Dépenses variables estimées',
                    amount: -variableAmount,
                    type: 'VARIABLE_ESTIMATE'
                });
                currentBalance -= variableAmount;
            }

            forecast.push({
                date: targetDate.toISOString().split('T')[0],
                projectedBalance: Math.round(currentBalance * 100) / 100,
                events
            });
        }

        return forecast;
    }

    /**
     * Check if a recurring transaction should fire on a given day.
     */
    private static matchesDay(
        estimatedDay: number,
        currentDay: number,
        frequency: string,
        targetDate: Date
    ): boolean {
        // Tolerance of ±2 days
        const dayMatch = Math.abs(estimatedDay - currentDay) <= 2 ||
            // Handle month boundary: e.g., estimated 30th but month has 28 days
            (estimatedDay > 28 && currentDay <= 2);

        if (!dayMatch) return false;

        switch (frequency) {
            case 'WEEKLY':
                // For weekly: fire once per week (every 7 days from estimated day)
                // Simplified: fire if the day is within ±1 of estimated day mod 7
                return currentDay % 7 === estimatedDay % 7 ||
                    Math.abs((currentDay % 7) - (estimatedDay % 7)) <= 1;
            case 'MONTHLY':
                return true; // Day match is sufficient for monthly
            case 'QUARTERLY':
                // Fire only in months 1, 4, 7, 10 (adjust based on estimation)
                return (targetDate.getMonth()) % 3 === 0;
            case 'YEARLY':
                // Fire only in January-ish
                return targetDate.getMonth() === 0;
            default:
                return true;
        }
    }

    /**
     * Convert an amount to its monthly equivalent based on frequency.
     */
    private static toMonthlyAmount(amount: number, frequency: string): number {
        switch (frequency) {
            case 'WEEKLY': return amount * 4.33;
            case 'MONTHLY': return amount;
            case 'QUARTERLY': return amount / 3;
            case 'YEARLY': return amount / 12;
            default: return amount;
        }
    }
}
