import { PrismaClient, TransactionClassification } from '@prisma/client';

const prisma = new PrismaClient();

interface ClassificationResult {
    classification: TransactionClassification;
    confidenceScore: number;
    beneficiaryIban?: string;
    linkedAccountId?: string;
}

export class ClassificationService {

    /**
     * Main entry point to classify a transaction
     */
    static async classifyTransaction(
        profileId: string,
        description: string,
        amount: number,
        beneficiaryIban?: string
    ): Promise<ClassificationResult> {

        // Step 1: Analyze Description for keywords
        const isTransferKeyword = this.hasTransferKeywords(description);

        // Step 2: Extract or Find Beneficiary IBAN if not provided
        let detectedIban = beneficiaryIban || this.extractIbanFromDescription(description);

        // Step 3: Match Beneficiary Account in DB (Is it an Internal Transfer?)
        let linkedAccount = null;
        if (detectedIban) {
            // Check if this IBAN belongs to one of the user's accounts
            linkedAccount = await prisma.account.findFirst({
                where: {
                    bank: { profileId },
                    OR: [
                        { iban: detectedIban },
                        { accountNumber: detectedIban }
                    ]
                },
                include: { bank: true }
            });

            // Fuzzy match fallback (e.g. check last 4 digits if IBAN provided is partial)
            if (!linkedAccount && detectedIban.length >= 4) {
                linkedAccount = await prisma.account.findFirst({
                    where: {
                        bank: { profileId },
                        OR: [
                            { iban: { endsWith: detectedIban } },
                            { accountNumber: { endsWith: detectedIban } }
                        ]
                    },
                    include: { bank: true }
                });
            }
        }

        // Step 4: Determine Classification & Score
        if (linkedAccount) {
            // Found a matching internal account!

            // To distinguish Intra vs Inter bank, we'd need the source account's bankId.
            // Since this method is often called during import where we might not have the source DB record yet (it's in the preview array),
            // we rely on the caller to handle that granularity if needed, or we default to a generic "INTERNAL".
            // However, our Enum has INTRA and INTER.

            // For now, if we match a user's account, it is definitely INTERNAL. 
            // We'll mark as INTER_BANK by default unless we check source bank (which requires more args).
            // Let's settle for INTER_BANK as a safe default for "Transfer to myself".
            // Ideally we should pass sourceBankId to this function.

            return {
                classification: 'INTERNAL_INTER_BANK', // Most common case (moving money between banks)
                confidenceScore: 0.95,
                beneficiaryIban: detectedIban,
                linkedAccountId: linkedAccount.id
            };
        }

        // No internal match found
        if (isTransferKeyword) {
            // "VIREMENT" to unknown -> External
            return {
                classification: 'EXTERNAL',
                confidenceScore: 0.70,
                beneficiaryIban: detectedIban
            };
        }

        // Default: External (Payment, Direct Debit, etc.)
        return {
            classification: 'EXTERNAL',
            confidenceScore: 0.60,
            beneficiaryIban: detectedIban
        };
    }

    private static hasTransferKeywords(description: string): boolean {
        const keywords = ['VIREMENT', 'VIR', 'TRANSFER', 'VERSEMENT'];
        const upper = description.toUpperCase();
        return keywords.some(k => upper.includes(k));
    }

    private static extractIbanFromDescription(description: string): string | undefined {
        // Basic Regex for FR IBAN: FRkk BBBB BGGG GGCC CCCC CCCC CKK
        // Matches FR followed by 25 alphanumeric chars, ignoring spaces
        const ibanRegex = /FR\d{2}[ ]?\d{5}[ ]?\d{5}[ ]?[A-Z0-9]{11}[ ]?\d{2}/gi;
        const match = description.match(ibanRegex);
        if (match && match.length > 0) {
            return match[0].replace(/\s/g, '').toUpperCase();
        }
        return undefined;
    }
}
