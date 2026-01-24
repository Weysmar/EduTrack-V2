import { PrismaClient, TransactionClassification, FinancialAccount } from '@prisma/client';
import { ClassificationService } from './classificationService';
// import { OfxParserService } from './ofxParserService';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Types for the Preview Step
export interface ImportPreview {
    detectedBankId: string;
    accounts: {
        isNew: boolean;
        accountName: string; // inferred or existing
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
    }[];
    summary: {
        totalTransactions: number;
        newTransactions: number;
        duplicates: number;
    }
}

export class ImportService {

    /**
     * Step 2 & 3: Parse, Detect, and Generate Preview
     */
    static async generatePreview(profileId: string, filePath: string, targetBankId: string): Promise<ImportPreview> {
        // 1. Parse File (OFX support only for now as per spec v1 focuses on OFX)
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Simple OFX parsing logic (mocking external parser dependency for reliability here or using existing)
        // In reality, we'd use 'ofx-parser' or similar. 
        // For this V2 implementation, let's assume we have a helper or do basic parsing.

        // Let's assume we use a robust parser.
        // For the sake of this file being standalone compliable without complex deps right now:
        const parsedData = await this.parseOfx(fileContent);

        const preview: ImportPreview = {
            detectedBankId: targetBankId,
            accounts: [],
            transactions: [],
            summary: { totalTransactions: 0, newTransactions: 0, duplicates: 0 }
        };

        // 2. Fetch User's Existing Accounts for this Bank
        const existingAccounts = await prisma.financialAccount.findMany({
            where: { profileId, bankId: targetBankId }
        });

        // 3. Process Accounts found in OFX
        for (const ofxAccount of parsedData.accounts) {
            // Match by Account Number (IBAN)
            // We assume metadata stores the 'accountNumber' or 'iban' as discussed in Classification
            const match = existingAccounts.find(dbAcc => {
                const meta = dbAcc.metadata as any;
                return meta?.accountNumber === ofxAccount.id || dbAcc.name.includes(ofxAccount.id);
            });

            preview.accounts.push({
                isNew: !match,
                accountName: match ? match.name : `Account ${ofxAccount.id}`,
                accountNumber: ofxAccount.id,
                balance: ofxAccount.balance,
                currency: ofxAccount.currency,
                dbId: match?.id
            });
        }

        // 4. Process Transactions & De-duplicate
        for (const account of parsedData.accounts) {
            for (const tx of account.transactions) {
                preview.summary.totalTransactions++;

                // Check Duplication: (profileId, accountId, date, amount, description)
                // Since we might not have accountId for new accounts, we check mainly if we have this tx in the bank context?
                // Actually strict dedupe requires accountId. 
                // We'll mark as duplicate if we find a very similar transaction in the *matched* account.
                let isDuplicate = false;
                const matchedAccount = preview.accounts.find(a => a.accountNumber === account.id);

                if (matchedAccount?.dbId) {
                    const existingTx = await prisma.transaction.findFirst({
                        where: {
                            accountId: matchedAccount.dbId,
                            amount: tx.amount,
                            date: tx.date,
                            description: tx.description,
                            type: tx.amount >= 0 ? 'INCOME' : 'EXPENSE'
                        }
                    });
                    if (existingTx) isDuplicate = true;
                }

                if (isDuplicate) {
                    preview.summary.duplicates++;
                } else {
                    preview.summary.newTransactions++;
                }

                // Classification
                const classification = await ClassificationService.classifyTransaction(
                    profileId,
                    targetBankId,
                    tx.description,
                    tx.amount
                );

                preview.transactions.push({
                    date: tx.date,
                    amount: tx.amount,
                    description: tx.description,
                    classification: classification.classification,
                    confidence: classification.confidenceScore,
                    accountNumber: account.id,
                    isDuplicate
                });
            }
        }

        return preview;
    }

    /**
     * Step 4: Commit Import
     */
    static async commitImport(profileId: string, bankId: string, previewData: ImportPreview) {
        return await prisma.$transaction(async (tx) => {
            const accountMap = new Map<string, string>(); // OFX ID -> DB ID

            // 1. Create/Update Accounts
            for (const acc of previewData.accounts) {
                if (acc.isNew) {
                    const newAcc = await tx.financialAccount.create({
                        data: {
                            profileId,
                            bankId,
                            name: acc.accountName,
                            type: 'CHECKING', // Default, maybe infer?
                            balance: acc.balance,
                            currency: acc.currency,
                            isAutoDetected: true,
                            metadata: { accountNumber: acc.accountNumber }
                        }
                    });
                    accountMap.set(acc.accountNumber, newAcc.id);
                } else if (acc.dbId) {
                    await tx.financialAccount.update({
                        where: { id: acc.dbId },
                        data: {
                            balance: acc.balance,
                            lastSyncedAt: new Date()
                        }
                    });
                    accountMap.set(acc.accountNumber, acc.dbId);
                }
            }

            // 2. Create Transactions (Filter out duplicates)
            const transactionsToCreate = previewData.transactions
                .filter(t => !t.isDuplicate)
                .map(t => ({
                    profileId,
                    accountId: accountMap.get(t.accountNumber),
                    amount: t.amount,
                    date: t.date,
                    description: t.description,
                    type: t.amount >= 0 ? 'INCOME' : 'EXPENSE',
                    classification: t.classification,
                    confidenceScore: t.confidence
                }));

            // Bulk create is parsed
            let count = 0;
            for (const t of transactionsToCreate) {
                if (t.accountId) {
                    await tx.transaction.create({ data: t as any });
                    count++;
                }
            }

            // 3. Create Import Log
            await tx.importLog.create({
                data: {
                    profileId,
                    filename: 'import.ofx', // We should pass this down
                    status: 'SUCCESS',
                    totalRows: previewData.summary.totalTransactions,
                    imported: count,
                    duplicates: previewData.summary.duplicates,
                    errors: 0
                }
            });

            return count;
        });
    }

    // --- Helper ---
    private static async parseOfx(content: string): Promise<{ accounts: any[] }> {
        // Mock parser implementation matching the return structure expected
        // In prod, use 'ofx-parser' or 'banking' libs
        // Logic: specific regex to find <STMTRS> blocks
        const accounts = [];

        // Very basic regex parser for demo/phase 2 logic
        const accountRegex = /<STMTRS>([\s\S]*?)<\/STMTRS>/g;
        let diff;

        while ((diff = accountRegex.exec(content)) !== null) {
            const block = diff[1];
            const idMatch = /<ACCTID>(\w+)/.exec(block);
            const balMatch = /<BALAMT>([-0-9.]+)/.exec(block);
            const curMatch = /<CURDEF>(\w+)/.exec(block);

            const transactions = [];
            const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
            let txMatch;
            while ((txMatch = txRegex.exec(block)) !== null) {
                const txBlock = txMatch[1];
                const amt = /<TRNAMT>([-0-9.]+)/.exec(txBlock);
                const name = /<NAME>(.*?)(<|$)/.exec(txBlock);
                const memo = /<MEMO>(.*?)(<|$)/.exec(txBlock);
                const date = /<DTPOST>(\d{8})/.exec(txBlock); // YYYYMMDD

                if (amt && date) {
                    const dateStr = date[1];
                    const parsedDate = new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`);

                    transactions.push({
                        amount: parseFloat(amt[1]),
                        description: (name ? name[1] : '') + (memo ? ' ' + memo[1] : ''),
                        date: parsedDate
                    });
                }
            }

            if (idMatch) {
                accounts.push({
                    id: idMatch[1],
                    balance: balMatch ? parseFloat(balMatch[1]) : 0,
                    currency: curMatch ? curMatch[1] : 'EUR',
                    transactions
                });
            }
        }

        return { accounts };
    }
}
