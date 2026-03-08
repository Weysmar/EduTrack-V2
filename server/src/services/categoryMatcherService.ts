import { prisma } from '../lib/prisma';

export class CategoryMatcherService {
    /**
     * Matches transactions to categories based on keywords
     */
    static async matchTransactions(profileId: string, transactionIds?: string[]): Promise<Record<string, string>> {
        // 1. Fetch Categories for the user (including global ones if profileId is null for some)
        const categories = await prisma.transactionCategory.findMany({
            where: {
                OR: [
                    { profileId },
                    { profileId: null }
                ]
            }
        });

        // Filter out categories without keywords
        const categoriesWithKeywords = categories.filter(c => c.keywords && c.keywords.length > 0);

        if (categoriesWithKeywords.length === 0) {
            return {};
        }

        // 2. Fetch Transactions
        const whereClause: any = {
            account: { bank: { profileId } },
            category: null // Only target uncategorized by default
        };

        if (transactionIds && transactionIds.length > 0) {
            whereClause.id = { in: transactionIds };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            select: { id: true, description: true }
        });

        const matches: Record<string, string> = {};

        // 3. Match Logic
        for (const tx of transactions) {
            const description = tx.description.toLowerCase();

            for (const category of categoriesWithKeywords) {
                const found = category.keywords.some(keyword =>
                    description.includes(keyword.toLowerCase())
                );

                if (found) {
                    matches[tx.id] = category.name;
                    break; // Use the first matching category
                }
            }
        }

        return matches;
    }
}
