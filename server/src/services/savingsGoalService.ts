import { prisma } from '../lib/prisma';

export class SavingsGoalService {

    // --- CRUD ---

    static async getGoals(profileId: string) {
        return prisma.savingsGoal.findMany({
            where: { profileId },
            orderBy: [{ status: 'asc' }, { deadline: 'asc' }]
        });
    }

    static async createGoal(profileId: string, data: {
        name: string;
        targetAmount: number;
        deadline?: string;
        icon?: string;
        color?: string;
    }) {
        const deadlineDate = data.deadline ? new Date(data.deadline) : null;

        // Calculate monthly target if deadline is set
        let monthlyTarget = null;
        if (deadlineDate) {
            const now = new Date();
            const monthsRemaining = Math.max(1,
                (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
                (deadlineDate.getMonth() - now.getMonth())
            );
            monthlyTarget = data.targetAmount / monthsRemaining;
        }

        return prisma.savingsGoal.create({
            data: {
                profileId,
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: 0,
                deadline: deadlineDate,
                monthlyTarget,
                icon: data.icon || '🎯',
                color: data.color || '#10b981',
                status: 'ACTIVE'
            }
        });
    }

    static async updateGoal(profileId: string, id: string, data: {
        name?: string;
        targetAmount?: number;
        currentAmount?: number;
        deadline?: string | null;
        icon?: string;
        color?: string;
        status?: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    }) {
        const existing = await prisma.savingsGoal.findFirst({
            where: { id, profileId }
        });
        if (!existing) throw new Error('Goal not found');

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
        if (data.currentAmount !== undefined) updateData.currentAmount = data.currentAmount;
        if (data.icon !== undefined) updateData.icon = data.icon;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.status !== undefined) {
            updateData.status = data.status;
            if (data.status === 'COMPLETED') updateData.completedAt = new Date();
        }
        if (data.deadline !== undefined) {
            updateData.deadline = data.deadline ? new Date(data.deadline) : null;
        }

        // Recalculate monthly target
        const targetAmount = data.targetAmount ?? existing.targetAmount.toNumber();
        const currentAmount = data.currentAmount ?? existing.currentAmount.toNumber();
        const deadline = data.deadline !== undefined
            ? (data.deadline ? new Date(data.deadline) : null)
            : existing.deadline;

        if (deadline) {
            const now = new Date();
            const monthsRemaining = Math.max(1,
                (deadline.getFullYear() - now.getFullYear()) * 12 +
                (deadline.getMonth() - now.getMonth())
            );
            const remaining = targetAmount - currentAmount;
            updateData.monthlyTarget = remaining > 0 ? remaining / monthsRemaining : 0;
        }

        return prisma.savingsGoal.update({
            where: { id },
            data: updateData
        });
    }

    static async deleteGoal(profileId: string, id: string) {
        const existing = await prisma.savingsGoal.findFirst({
            where: { id, profileId }
        });
        if (!existing) throw new Error('Goal not found');

        await prisma.savingsGoal.delete({ where: { id } });
    }

    // --- Projection ---

    static async getProjection(profileId: string, goalId: string) {
        const goal = await prisma.savingsGoal.findFirst({
            where: { id: goalId, profileId }
        });
        if (!goal) throw new Error('Goal not found');

        // Calculate actual monthly savings from recent history
        const monthlySavings = await this.calculateMonthlySavings(profileId);

        const targetAmount = goal.targetAmount.toNumber();
        const currentAmount = goal.currentAmount.toNumber();
        const remaining = targetAmount - currentAmount;

        let monthsRemaining: number | null = null;
        let projectedCompletionDate: Date | null = null;
        let onTrack = false;

        if (monthlySavings > 0 && remaining > 0) {
            monthsRemaining = Math.ceil(remaining / monthlySavings);
            projectedCompletionDate = new Date();
            projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsRemaining);

            if (goal.deadline) {
                onTrack = projectedCompletionDate <= goal.deadline;
            } else {
                onTrack = true; // No deadline = always on track
            }
        } else if (remaining <= 0) {
            onTrack = true;
            monthsRemaining = 0;
        }

        return {
            currentAmount,
            targetAmount,
            monthlyActualSavings: monthlySavings,
            monthsRemaining,
            projectedCompletionDate: projectedCompletionDate?.toISOString() || null,
            onTrack,
            progress: targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0
        };
    }

    // --- Recalculate Progress ---

    static async recalculateProgress(profileId: string) {
        const monthlySavings = await this.calculateMonthlySavings(profileId);

        const goals = await prisma.savingsGoal.findMany({
            where: { profileId, status: 'ACTIVE' }
        });

        if (goals.length === 0 || monthlySavings <= 0) {
            return { updated: 0, monthlySavings };
        }

        // Distribute savings proportionally across active goals
        const totalTarget = goals.reduce((sum: number, g: any) => sum + g.targetAmount.toNumber() - g.currentAmount.toNumber(), 0);

        const updates = [];
        for (const goal of goals) {
            const remaining = goal.targetAmount.toNumber() - goal.currentAmount.toNumber();
            if (remaining <= 0) continue;

            const share = totalTarget > 0 ? (remaining / totalTarget) * monthlySavings : 0;
            const newAmount = Math.min(goal.targetAmount.toNumber(), goal.currentAmount.toNumber() + share);
            const isCompleted = newAmount >= goal.targetAmount.toNumber();

            updates.push(prisma.savingsGoal.update({
                where: { id: goal.id },
                data: {
                    currentAmount: newAmount,
                    ...(isCompleted && { status: 'COMPLETED', completedAt: new Date() })
                }
            }));
        }

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        return { updated: updates.length, monthlySavings };
    }

    // --- Helpers ---

    static async calculateMonthlySavings(profileId: string): Promise<number> {
        // Average savings over the last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                classification: 'EXTERNAL',
                date: { gte: threeMonthsAgo }
            },
            select: { amount: true, date: true }
        });

        if (transactions.length === 0) return 0;

        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(t => {
            const amount = t.amount.toNumber();
            if (amount > 0) totalIncome += amount;
            else totalExpenses += Math.abs(amount);
        });

        // Monthly average savings
        const netSavings = totalIncome - totalExpenses;
        return Math.max(0, netSavings / 3);
    }

    static async getSavingsRate(profileId: string): Promise<{
        rate: number;
        income: number;
        expenses: number;
        savings: number;
    }> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                classification: 'EXTERNAL',
                date: { gte: startOfMonth }
            },
            select: { amount: true }
        });

        let income = 0;
        let expenses = 0;

        transactions.forEach(t => {
            const amount = t.amount.toNumber();
            if (amount > 0) income += amount;
            else expenses += Math.abs(amount);
        });

        const savings = income - expenses;
        const rate = income > 0 ? (savings / income) * 100 : 0;

        return { rate, income, expenses, savings };
    }
}
