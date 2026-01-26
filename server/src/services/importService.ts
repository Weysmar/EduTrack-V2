import { PrismaClient, TransactionClassification, Account, Transaction } from '@prisma/client';
import { OfxParserService } from './ofxParserService';
import { CsvParserService } from './csvParserService';
import { XlsxParserService } from './xlsxParserService';
import { ClassificationService } from './classificationService';
import fs from 'fs';
import path from 'path';
import { OfxData, OfxAccount, OfxTransaction } from '../types/ofx';

const prisma = new PrismaClient();

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
    static async generatePreview(profileId: string, filePath: string, targetBankId: string): Promise<ImportPreview> {
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

        // 3. Process Accounts found in File and Match them
        for (const accountData of parsedData.accounts) {
            // For CSV/XLSX, we often don't have a real account number in the file
            // We might use "CSV_IMPORT" as ID. In that case, we should probably try to match 
            // the ONLY account of that bank if it exists, or ask user?
            // Current logic: Match by strict ID.
            // Improvement: If only 1 account exists in DB for this bank, and imported ID is generic "CSV_IMPORT", match it?

            let match = existingAccounts.find(dbAcc => {
                return (dbAcc.iban === accountData.accountId) || (dbAcc.accountNumber === accountData.accountId);
            });

            // Fallback for generic imports
            if (!match && (accountData.accountId === 'CSV_IMPORT' || accountData.accountId === 'XLSX_IMPORT')) {
                if (existingAccounts.length === 1) {
                    match = existingAccounts[0]; // Auto-assign to the only account
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
                    const existingTx = await prisma.transaction.findFirst({
                        where: {
                            accountId: accountDbId,
                            amount: tx.amount,
                            date: tx.date,
                            OR: [{ description: tx.description }]
                        }
                    });
                    // Stronger duplicate check if FITID is available (OFX)
                    const fitIdCheck = tx.fitId ? await prisma.transaction.findFirst({
                        where: {
                            accountId: accountDbId,
                            metadata: {
                                path: ['fitId'],
                                equals: tx.fitId
                            }
                        }
                    }) : null;

                    if (existingTx || fitIdCheck) isDuplicate = true;
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
                    tx.amount
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
                    // Update balance only
                    await tx.account.update({
                        where: { id: acc.dbId },
                        data: {
                            balance: acc.balance !== 0 ? acc.balance : undefined, // Update if non-zero
                            balanceDate: new Date()
                        }
                    });
                    accountMap.set(acc.accountNumber, acc.dbId);
                }
            }

            // 2. Create Transactions
            const transactionsToCreate = previewData.transactions
                .filter(t => !t.isDuplicate)
                .map(t => ({
                    accountId: accountMap.get(t.accountNumber)!,
                    amount: t.amount,
                    date: t.date,
                    description: t.description,
                    classification: t.classification,
                    classificationConfidence: t.confidence,
                    metadata: { fitId: t.importId },
                    importSource: 'IMPORT'
                }));

            let count = 0;
            if (transactionsToCreate.length > 0) {
                const batch = await tx.transaction.createMany({
                    data: transactionsToCreate
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
