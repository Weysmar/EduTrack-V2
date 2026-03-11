import { prisma } from '../lib/prisma';

interface RuleCondition {
    field: 'description' | 'amount' | 'beneficiaryIban';
    operator: 'contains' | 'startsWith' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte';
    value: string | number;
    caseSensitive?: boolean;
}

interface TransactionData {
    id: string;
    description: string;
    amount: number;
    beneficiaryIban?: string | null;
}

export class AutoRuleEngine {
    /**
     * Apply all active rules for a profile against a set of transactions.
     * Rules are processed in priority order (lower number = higher priority).
     * Returns a map of transactionId → categoryName for matched transactions.
     */
    static async applyRules(
        profileId: string,
        transactions: TransactionData[]
    ): Promise<Record<string, string>> {
        const rules = await prisma.autoCategorizeRule.findMany({
            where: { profileId, isActive: true },
            orderBy: { priority: 'asc' }
        });

        if (rules.length === 0) return {};

        const matches: Record<string, string> = {};
        const ruleMatchCounts: Record<string, number> = {};

        for (const tx of transactions) {
            for (const rule of rules) {
                const conditions = rule.conditions as unknown as RuleCondition[];
                if (AutoRuleEngine.evaluateConditions(tx, conditions)) {
                    matches[tx.id] = rule.categoryName;
                    ruleMatchCounts[rule.id] = (ruleMatchCounts[rule.id] || 0) + 1;
                    break; // First matching rule wins (priority order)
                }
            }
        }

        // Update match counts in background
        const updatePromises = Object.entries(ruleMatchCounts).map(([ruleId, count]) =>
            prisma.autoCategorizeRule.update({
                where: { id: ruleId },
                data: { matchCount: { increment: count } }
            })
        );
        await Promise.all(updatePromises).catch(console.error);

        console.log(`[AutoRuleEngine] Matched ${Object.keys(matches).length} transactions with ${rules.length} rules.`);
        return matches;
    }

    /**
     * Evaluate if a transaction matches ALL conditions of a rule (AND logic).
     */
    static evaluateConditions(tx: TransactionData, conditions: RuleCondition[]): boolean {
        return conditions.every(condition => {
            const fieldValue = AutoRuleEngine.getFieldValue(tx, condition.field);
            if (fieldValue === undefined || fieldValue === null) return false;

            switch (condition.operator) {
                case 'contains': {
                    const str = String(fieldValue);
                    const val = String(condition.value);
                    return condition.caseSensitive
                        ? str.includes(val)
                        : str.toLowerCase().includes(val.toLowerCase());
                }
                case 'startsWith': {
                    const str = String(fieldValue);
                    const val = String(condition.value);
                    return condition.caseSensitive
                        ? str.startsWith(val)
                        : str.toLowerCase().startsWith(val.toLowerCase());
                }
                case 'equals': {
                    const str = String(fieldValue);
                    const val = String(condition.value);
                    return condition.caseSensitive
                        ? str === val
                        : str.toLowerCase() === val.toLowerCase();
                }
                case 'gt':
                    return Number(fieldValue) > Number(condition.value);
                case 'lt':
                    return Number(fieldValue) < Number(condition.value);
                case 'gte':
                    return Number(fieldValue) >= Number(condition.value);
                case 'lte':
                    return Number(fieldValue) <= Number(condition.value);
                default:
                    return false;
            }
        });
    }

    private static getFieldValue(tx: TransactionData, field: string): string | number | null {
        switch (field) {
            case 'description': return tx.description;
            case 'amount': return tx.amount;
            case 'beneficiaryIban': return tx.beneficiaryIban || null;
            default: return null;
        }
    }

    /**
     * Test a rule against existing uncategorized transactions.
     * Returns preview of which transactions would be matched.
     */
    static async testRule(
        profileId: string,
        conditions: RuleCondition[],
        limit: number = 20
    ): Promise<{ matchCount: number; samples: { id: string; description: string; amount: number }[] }> {
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { bank: { profileId } },
                OR: [
                    { category: null },
                    { category: '' }
                ]
            },
            select: { id: true, description: true, amount: true, beneficiaryIban: true },
            take: 500 // Scan up to 500 recent uncategorized transactions
        });

        const txData: TransactionData[] = transactions.map(t => ({
            ...t,
            amount: Number(t.amount)
        }));

        const matched = txData.filter(tx => AutoRuleEngine.evaluateConditions(tx, conditions));

        return {
            matchCount: matched.length,
            samples: matched.slice(0, limit).map(m => ({
                id: m.id,
                description: m.description,
                amount: m.amount
            }))
        };
    }
}
