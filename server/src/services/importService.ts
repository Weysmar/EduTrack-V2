import { TransactionClassification, Account, Transaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { OfxParserService } from './ofxParserService';
import { CsvParserService } from './csvParserService';
import { XlsxParserService } from './xlsxParserService';
import { ClassificationService } from './classificationService';
import fs from 'fs';
import path from 'path';
import { OfxData, OfxAccount, OfxTransaction } from '../types/ofx';

// Types for the Preview Step
export interface ImportPreview {
    detectedBankId: string;
    accounts: {
        isNew: boolean;
        accountName: string;
        accountNumber: string; // IBAN or ID
        balance: number;
        currency: string;
        dbId?: string; // if existing
    }[];
    transactions: {
        date: Date;
        amount: number;
        description: string;
        classification: TransactionClassification;
        confidence: number;
        accountNumber: string; // link to one of the accounts above
        isDuplicate: boolean;
        importId?: string;
    }[];
    summary: {
        totalTransactions: number;
        newTransactions: number;
        duplicates: number;
    }
}

export class ImportService {

    /**
     * Preview Step: Parse and Match
     */
    static async generatePreview(profileId: string, filePath: string, targetBankId: string, targetAccountId?: string): Promise<ImportPreview> {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        // 1. Parse File based on Extension
        let parsedData: OfxData;

        try {
            if (ext === '.csv') {
                parsedData = await CsvParserService.parseFile(fileBuffer);
            } else if (ext === '.xlsx' || ext === '.xls') {
                parsedData = XlsxParserService.parseFile(fileBuffer);
            } else {
                // Default to OFX
                parsedData = await OfxParserService.parseFile(fileBuffer);
            }
        } catch (error) {
            console.error("Parser Error", error);
            throw new Error(`Failed to parse file: ${ext}`);
        }

        const preview: ImportPreview = {
            detectedBankId: targetBankId,
            accounts: [],
            transactions: [],
            summary: { totalTransactions: 0, newTransactions: 0, duplicates: 0 }
        };

        // 2. Fetch User's Existing Accounts for this Bank
        const existingAccounts = await prisma.account.findMany({
            where: {
                bank: { profileId, id: targetBankId }
            }
        });

        // Pre-fetch target account if specified
        let forcedAccount: Account | undefined;
        if (targetAccountId) {
            forcedAccount = existingAccounts.find(a => a.id === targetAccountId);
        }

        // 3. Process Accounts found in File and Match them
        for (const accountData of parsedData.accounts) {
            let match = null;

            if (forcedAccount) {
                // FORCE MATCH to user selection
                match = forcedAccount;
            } else {
                // Auto-detection logic
                match = existingAccounts.find(dbAcc => {
                    return (dbAcc.iban === accountData.accountId) || (dbAcc.accountNumber === accountData.accountId);
                });

                // Fallback: If only 1 account exists in DB for this bank, and it has NO IBAN/AccNum,
                // assume it's the target for the first import.
                if (!match && accountData.accountId) {
                    if (existingAccounts.length === 1 && !existingAccounts[0].accountNumber && !existingAccounts[0].iban) {
                        match = existingAccounts[0];
                    }
                }

                // Fallback for generic imports
                if (!match && (accountData.accountId === 'CSV_IMPORT' || accountData.accountId === 'XLSX_IMPORT')) {
                    if (existingAccounts.length === 1) {
                        match = existingAccounts[0];
                    }
                }
            }

            preview.accounts.push({
                isNew: !match,
                accountName: match ? match.name : (accountData.accountId === 'CSV_IMPORT' ? 'Compte Importé (CSV)' : `Compte ${accountData.accountId.slice(-4)}`),
                accountNumber: accountData.accountId,
                balance: accountData.balance || 0,
                currency: accountData.currency,
                dbId: match?.id
            });
        }

        // 4. Process Transactions & De-duplicate & Classify
        for (const account of parsedData.accounts) {
            const matchedAccount = preview.accounts.find(a => a.accountNumber === account.accountId);
            const accountDbId = matchedAccount?.dbId;

            for (const tx of account.transactions) {
                preview.summary.totalTransactions++;

                // Duplication Check
                let isDuplicate = false;
                if (accountDbId) {
                    // Priority 1: Check FITID if available (most reliable for OFX)
                    if (tx.fitId) {
                        const fitIdCheck = await prisma.transaction.findFirst({
                            where: {
                                accountId: accountDbId,
                                // @ts-ignore - Field exists in schema but types may lag
                                fitId: tx.fitId
                            }
                        });
                        if (fitIdCheck) isDuplicate = true;
                    }

                    // Priority 2: Fallback to date/amount/description if no FITID or not found
                    if (!isDuplicate) {
                        const dayStart = new Date(tx.date);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(dayStart);
                        dayEnd.setDate(dayEnd.getDate() + 1);

                        const existingTx = await prisma.transaction.findFirst({
                            where: {
                                accountId: accountDbId,
                                amount: { gte: tx.amount - 0.01, lte: tx.amount + 0.01 },
                                date: { gte: dayStart, lt: dayEnd },
                                description: tx.description
                            }
                        });
                        if (existingTx) isDuplicate = true;
                    }
                }

                if (isDuplicate) {
                    preview.summary.duplicates++;
                } else {
                    preview.summary.newTransactions++;
                }

                // Classification
                const classificationResult = await ClassificationService.classifyTransaction(
                    profileId,
                    tx.description,
                    tx.amount,
                    targetBankId
                );

                preview.transactions.push({
                    date: tx.date,
                    amount: tx.amount,
                    description: tx.description,
                    classification: classificationResult.classification,
                    confidence: classificationResult.confidenceScore,
                    accountNumber: account.accountId,
                    isDuplicate,
                    importId: tx.fitId
                });
            }
        }

        return preview;
    }

    /**
     * Commit Step: Write to DB
     */
    static async commitImport(profileId: string, bankId: string, previewData: ImportPreview) {
        return await prisma.$transaction(async (tx) => {
            const accountMap = new Map<string, string>(); // OFX AccNum -> DB ID

            // 1. Create/Update Accounts
            for (const acc of previewData.accounts) {
                if (acc.isNew) {
                    const newAcc = await tx.account.create({
                        data: {
                            bankId,
                            name: acc.accountName,
                            type: 'CHECKING',
                            balance: acc.balance,
                            currency: acc.currency,
                            accountNumber: acc.accountNumber,
                            iban: acc.accountNumber,
                            autoDetected: true,
                            active: true
                        }
                    });
                    accountMap.set(acc.accountNumber, newAcc.id);
                } else if (acc.dbId) {
                    // Update balance AND Name (if renamed in UI)
                    const updates: any = {
                        balance: acc.balance !== 0 ? acc.balance : undefined,
                        balanceDate: new Date()
                    };

                    // If name is different from DB (we'd need to fetch or trust UI), let's just update it if provided
                    if (acc.accountName) {
                        updates.name = acc.accountName;
                    }

                    await tx.account.update({
                        where: { id: acc.dbId },
                        data: updates
                    });
                    accountMap.set(acc.accountNumber, acc.dbId);
                }
            }

            // 2. Create Transactions
            const transactionsToCreate = previewData.transactions
                .filter(t => !t.isDuplicate)
                .map(t => {
                    // IBAN Extraction Regex (Handles spaces or no spaces)
                    const ibanRegex = /\b([A-Z]{2}\d{2}(?:\s?\d{4}){3,}(?:\s?\d{1,4})?)\b/gi;
                    const match = t.description.match(ibanRegex);
                    const extractedIban = match ? match[0].replace(/\s/g, '') : null;

                    const accId = accountMap.get(t.accountNumber);
                    if (!accId) {
                        console.warn(`[Import] Skipping transaction: Account number '${t.accountNumber}' not found in map. Available: ${Array.from(accountMap.keys()).join(', ')}`);
                        return null;
                    }

                    return {
                        accountId: accId,
                        amount: t.amount,
                        date: t.date,
                        description: t.description,
                        beneficiaryIban: extractedIban, // Populated from description
                        fitId: t.importId, // Store FITID directly in field
                        classification: t.classification,
                        classificationConfidence: t.confidence,
                        metadata: { fitId: t.importId }, // Keep in metadata for backward compatibility
                        importSource: 'IMPORT'
                    };
                })
                .filter((t): t is NonNullable<typeof t> => t !== null);

            let count = 0;
            if (transactionsToCreate.length > 0) {
                const batch = await tx.transaction.createMany({
                    data: transactionsToCreate,
                    skipDuplicates: true // Prevent P2002 errors if duplicates exist
                });
                count = batch.count;
            }

            // Log import for traceability
            await tx.importLog.create({
                data: {
                    profileId,
                    filename: 'import_' + new Date().toISOString(),
                    status: 'SUCCESS',
                    totalRows: previewData.summary.totalTransactions,
                    imported: count,
                    duplicates: previewData.summary.duplicates,
                    errors: 0
                }
            });

            return {
                importedTransactions: count,
                accountsSynced: previewData.accounts.length
            };
        });
    }
}
