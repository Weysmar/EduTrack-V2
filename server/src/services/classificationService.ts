import { TransactionClassification } from '@prisma/client';
import { prisma } from '../lib/prisma';

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
        sourceBankId: string,
        beneficiaryIban?: string
    ): Promise<ClassificationResult> {

        // Step 1: Analyze Description for keywords
        const isTransferKeyword = this.hasTransferKeywords(description);
        const isInternalKeyword = this.hasInternalKeywords(description);

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
        if (linkedAccount || isInternalKeyword) {
            // Found a matching internal account OR high-confidence keyword!
            const isIntraBank = linkedAccount ? linkedAccount.bankId === sourceBankId : true; // Default to intra if keyword but no account linked

            return {
                classification: isIntraBank ? 'INTERNAL_INTRA_BANK' : 'INTERNAL_INTER_BANK',
                confidenceScore: linkedAccount ? 0.98 : 0.85,
                beneficiaryIban: detectedIban,
                linkedAccountId: linkedAccount?.id
            };
        }

        // No internal match found
        // Check if we have enough IBAN data to classify
        if (!detectedIban || detectedIban.length < 4) {
            // Pas d'IBAN extractible ou trop court
            if (isTransferKeyword) {
                return {
                    classification: 'EXTERNAL',
                    confidenceScore: 0.60
                };
            }

            // Default to EXTERNAL if we have a description (likely a card payment or similar)
            // instead of UNKNOWN which blocks many features.
            if (description && description.trim().length > 0) {
                return {
                    classification: 'EXTERNAL',
                    confidenceScore: 0.55
                };
            }

            return {
                classification: 'UNKNOWN',
                confidenceScore: 0.30
            };
        }

        if (isTransferKeyword) {
            // "VIREMENT" to unknown external account -> External
            return {
                classification: 'EXTERNAL',
                confidenceScore: 0.75,
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
        const keywords = [
            'VIREMENT', 'VIR ', 'TRANSFER', 'VERSEMENT', 'PAYMENT', 'ACHAT',
            'CB ', 'CARD', 'PAIEMENT', 'CHEQUE', 'CHQ', 'PRELEVEMENT', 'PRLV'
        ];
        const upper = description.toUpperCase();
        return keywords.some(k => upper.includes(k));
    }

    private static hasInternalKeywords(description: string): boolean {
        const keywords = ['VIREMENT COMPTE A COMPTE', 'VIR COMPTE A COMPTE', 'VIR INTERNE', 'TRANSFERT INTERNE'];
        const upper = description.toUpperCase();
        return keywords.some(k => upper.includes(k));
    }

    private static extractIbanFromDescription(description: string): string | undefined {
        // Generic IBAN regex: 2 letter country code + 2 check digits + up to 30 alphanumeric chars
        // Supports all countries: FR, BE, LU, CH, DE, etc.
        const ibanRegex = /\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,}(?:\s?[A-Z0-9]{1,4})?)\b/gi;
        const match = description.match(ibanRegex);
        if (match && match.length > 0) {
            return match[0].replace(/\s/g, '').toUpperCase();
        }
        return undefined;
    }
}
