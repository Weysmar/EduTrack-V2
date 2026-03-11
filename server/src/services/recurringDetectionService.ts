import { prisma } from '../lib/prisma';
import { RecurringFrequency } from '@prisma/client';

interface RecurrenceGroup {
    normalizedDesc: string;
    transactions: { date: Date; amount: number; category: string | null }[];
}

export class RecurringDetectionService {

    /**
     * Main entry: detect recurring transactions for a profile
     */
    static async detectRecurrences(profileId: string): Promise<{
        detected: number;
        created: number;
        updated: number;
    }> {
        // 1. Fetch all external transactions from the last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                classification: 'EXTERNAL',
                date: { gte: twelveMonthsAgo }
            },
            orderBy: { date: 'asc' },
            select: { date: true, amount: true, description: true, category: true }
        });

        if (transactions.length < 3) {
            return { detected: 0, created: 0, updated: 0 };
        }

        // 2. Group by normalized description
        const groups = new Map<string, RecurrenceGroup>();

        for (const tx of transactions) {
            const normalized = this.normalizeDescription(tx.description);
            if (normalized.length < 3) continue; // Skip too-short descriptions

            if (!groups.has(normalized)) {
                groups.set(normalized, { normalizedDesc: normalized, transactions: [] });
            }
            groups.get(normalized)!.transactions.push({
                date: tx.date,
                amount: tx.amount.toNumber(),
                category: tx.category
            });
        }

        // 3. Analyze each group for recurrence patterns
        let detected = 0;
        let created = 0;
        let updated = 0;

        for (const [, group] of groups) {
            if (group.transactions.length < 3) continue; // Need at least 3 occurrences

            // Compute intervals between consecutive transactions (in days)
            const sorted = group.transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
            const intervals: number[] = [];
            for (let i = 1; i < sorted.length; i++) {
                const diffMs = sorted[i].date.getTime() - sorted[i - 1].date.getTime();
                intervals.push(diffMs / (1000 * 60 * 60 * 24)); // days
            }

            if (intervals.length === 0) continue;

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const frequency = this.classifyFrequency(avgInterval);
            if (!frequency) continue; // No recognizable pattern

            const amounts = sorted.map(t => t.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const confidence = this.calculateConfidence(intervals, amounts);

            if (confidence < 0.3) continue; // Too irregular

            // Determine type and estimated day
            const type = avgAmount >= 0 ? 'INCOME' : 'EXPENSE';
            const days = sorted.map(t => t.date.getDate());
            const estimatedDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

            // Determine category (most common)
            const categoryVotes = sorted
                .filter(t => t.category)
                .map(t => t.category!);
            const category = categoryVotes.length > 0
                ? this.mostCommon(categoryVotes)
                : null;

            // Next expected date
            const lastDate = sorted[sorted.length - 1].date;
            const nextExpected = this.computeNextDate(lastDate, frequency, estimatedDay);

            detected++;

            // Upsert
            try {
                const existing = await prisma.recurringTransaction.findUnique({
                    where: {
                        profileId_description_frequency: {
                            profileId,
                            description: group.normalizedDesc,
                            frequency
                        }
                    }
                });

                if (existing) {
                    await prisma.recurringTransaction.update({
                        where: { id: existing.id },
                        data: {
                            averageAmount: avgAmount,
                            estimatedDay,
                            category,
                            type,
                            lastSeenDate: lastDate,
                            nextExpectedDate: nextExpected,
                            occurrenceCount: sorted.length,
                            confidenceScore: confidence,
                            isActive: true
                        }
                    });
                    updated++;
                } else {
                    await prisma.recurringTransaction.create({
                        data: {
                            profileId,
                            description: group.normalizedDesc,
                            averageAmount: avgAmount,
                            estimatedDay,
                            frequency,
                            category,
                            type,
                            lastSeenDate: lastDate,
                            nextExpectedDate: nextExpected,
                            occurrenceCount: sorted.length,
                            confidenceScore: confidence,
                            isActive: true,
                            isPaused: false
                        }
                    });
                    created++;
                }
            } catch (err) {
                console.error('[RecurringDetection] Upsert error:', err);
            }
        }

        console.log(`[RecurringDetection] Detected ${detected}, Created ${created}, Updated ${updated}`);
        return { detected, created, updated };
    }

    /**
     * Normalize a transaction description for clustering
     */
    static normalizeDescription(desc: string): string {
        return desc
            // Remove dates in various formats
            .replace(/\d{2}[/.]\d{2}[/.]\d{2,4}/g, '')
            .replace(/\d{2}[/.]\d{2}/g, '')
            // Remove reference numbers
            .replace(/REF[:\s]?\w+/gi, '')
            .replace(/N[°o]\s?\d+/gi, '')
            // Remove card numbers
            .replace(/CB\s?\*{4}\d{4}/gi, '')
            .replace(/\*{4}\d{4}/g, '')
            // Remove transaction IDs/hashes
            .replace(/[A-Z0-9]{16,}/g, '')
            // Collapse whitespace
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    /**
     * Classify a frequency from an average interval in days
     */
    static classifyFrequency(avgIntervalDays: number): RecurringFrequency | null {
        if (avgIntervalDays >= 5 && avgIntervalDays <= 10) return 'WEEKLY';
        if (avgIntervalDays >= 25 && avgIntervalDays <= 38) return 'MONTHLY';
        if (avgIntervalDays >= 80 && avgIntervalDays <= 110) return 'QUARTERLY';
        if (avgIntervalDays >= 340 && avgIntervalDays <= 400) return 'YEARLY';
        return null;
    }

    /**
     * Calculate confidence score based on regularity of intervals and amounts
     */
    static calculateConfidence(intervals: number[], amounts: number[]): number {
        if (intervals.length === 0 || amounts.length === 0) return 0;

        // Interval regularity (0→1)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalStdDev = Math.sqrt(
            intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length
        );
        const intervalRegularity = avgInterval > 0 ? Math.max(0, 1 - (intervalStdDev / avgInterval)) : 0;

        // Amount regularity (0→1)
        const absAmounts = amounts.map(Math.abs);
        const avgAmount = absAmounts.reduce((a, b) => a + b, 0) / absAmounts.length;
        const amountStdDev = Math.sqrt(
            absAmounts.reduce((sum, v) => sum + Math.pow(v - avgAmount, 2), 0) / absAmounts.length
        );
        const amountRegularity = avgAmount > 0 ? Math.max(0, 1 - (amountStdDev / avgAmount)) : 0;

        // Weighted score (intervals matter more)
        return intervalRegularity * 0.6 + amountRegularity * 0.4;
    }

    /**
     * Compute the next expected date for a recurring transaction
     */
    private static computeNextDate(lastDate: Date, frequency: RecurringFrequency, estimatedDay: number): Date {
        const next = new Date(lastDate);
        switch (frequency) {
            case 'WEEKLY':
                next.setDate(next.getDate() + 7);
                break;
            case 'MONTHLY':
                next.setMonth(next.getMonth() + 1);
                next.setDate(Math.min(estimatedDay, this.daysInMonth(next)));
                break;
            case 'QUARTERLY':
                next.setMonth(next.getMonth() + 3);
                next.setDate(Math.min(estimatedDay, this.daysInMonth(next)));
                break;
            case 'YEARLY':
                next.setFullYear(next.getFullYear() + 1);
                break;
        }
        return next;
    }

    private static daysInMonth(date: Date): number {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    private static mostCommon(arr: string[]): string {
        const counts = new Map<string, number>();
        arr.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
        let best = arr[0];
        let bestCount = 0;
        counts.forEach((count, val) => {
            if (count > bestCount) { best = val; bestCount = count; }
        });
        return best;
    }
}
