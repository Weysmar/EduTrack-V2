import { prisma } from '../lib/prisma';
import { TransactionClassification } from '@prisma/client';

export class InternalTransferService {
    /**
     * Scans recent transactions for the given profile to find matching pairs
     * that represent internal transfers (a debit in one account, a credit in another
     * with the exact same absolute amount within a short time window).
     */
    static async detectAndLinkTransfers(profileId: string) {
        // Find recent transactions that could be part of an internal transfer.
        // We'll limit to transactions in the last 30 days that are not already safely classified as external
        // or properly linked internal transfers.

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const candidateTransactions = await prisma.transaction.findMany({
            where: {
                account: {
                    bank: {
                        profileId
                    }
                },
                date: {
                    gte: thirtyDaysAgo
                },
                // We mainly care about UNKNOWN ones or ones that haven't been confidently linked
                classification: {
                    notIn: ['EXTERNAL', 'INTERNAL_INTRA_BANK', 'INTERNAL_INTER_BANK']
                }
            },
            include: {
                account: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        if (candidateTransactions.length === 0) {
            return { processed: 0, linked: 0 };
        }

        // Separate into debits and credits
        const debits = candidateTransactions.filter(t => t.amount.toNumber() < 0);
        const credits = candidateTransactions.filter(t => t.amount.toNumber() > 0);

        let linkedCount = 0;
        const matchedDebitIds = new Set<string>();
        const matchedCreditIds = new Set<string>();

        const updates: any[] = [];

        // For each debit, try to find a matching credit
        for (const debit of debits) {
            if (matchedDebitIds.has(debit.id)) continue;

            const debitAmountAbs = Math.abs(debit.amount.toNumber());
            const debitDate = new Date(debit.date).getTime();

            // Find candidates: same amount, different account, within ±4 days
            const matchCandidates = credits.filter(credit => {
                if (matchedCreditIds.has(credit.id)) return false;
                if (credit.accountId === debit.accountId) return false; // Must be different accounts

                const creditAmount = credit.amount.toNumber();
                if (Math.abs(creditAmount - debitAmountAbs) > 0.01) return false; // Amount must match

                const creditDate = new Date(credit.date).getTime();
                const diffDays = Math.abs(creditDate - debitDate) / (1000 * 60 * 60 * 24);
                return diffDays <= 4; // Tolerance of 4 days for inter-bank transfers
            });

            if (matchCandidates.length > 0) {
                // If there are multiple, find the closest one in time
                matchCandidates.sort((a, b) => {
                    const diffA = Math.abs(new Date(a.date).getTime() - debitDate);
                    const diffB = Math.abs(new Date(b.date).getTime() - debitDate);
                    return diffA - diffB;
                });

                const bestMatch = matchCandidates[0];

                matchedDebitIds.add(debit.id);
                matchedCreditIds.add(bestMatch.id);
                linkedCount++;

                const isSameBank = debit.account?.bankId === bestMatch.account?.bankId;
                const classificationType: TransactionClassification = isSameBank ? 'INTERNAL_INTRA_BANK' : 'INTERNAL_INTER_BANK';

                // Queue updates
                updates.push(
                    prisma.transaction.update({
                        where: { id: debit.id },
                        data: {
                            classification: classificationType,
                            classificationConfidence: 0.95,
                            category: 'Virement Interne',
                            linkedAccountId: bestMatch.accountId
                        }
                    })
                );

                updates.push(
                    prisma.transaction.update({
                        where: { id: bestMatch.id },
                        data: {
                            classification: classificationType,
                            classificationConfidence: 0.95,
                            category: 'Virement Interne',
                            linkedAccountId: debit.accountId
                        }
                    })
                );
            }
        }

        // Execute all updates in a transaction
        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        return {
            processed: candidateTransactions.length,
            linked: linkedCount
        };
    }
}
