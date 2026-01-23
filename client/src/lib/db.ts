import Dexie, { Table } from 'dexie';

export interface FinancialAccount {
    id: string;
    profileId: string;
    name: string;
    type: 'CHECKING' | 'SAVINGS' | 'CASH';
    balance: number;
    icon?: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: string;
    profileId: string;
    accountId?: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: Date;
    description?: string;
    categoryId?: string;
    receiptUrl?: string; // S3 or Local Blob URL
    isRecurring: boolean;
    recurringRule?: string;
    aiEnriched: boolean;
    aiSuggestions?: any;
    createdAt: Date;
}

export interface TransactionCategory {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon?: string;
    color?: string;
    parentId?: string;
}

export class EduTrackDB extends Dexie {
    financialAccounts!: Table<FinancialAccount>;
    transactions!: Table<Transaction>;
    transactionCategories!: Table<TransactionCategory>;

    constructor() {
        super('EduTrackDB');

        this.version(1).stores({
            financialAccounts: 'id, profileId, type',
            transactions: 'id, profileId, accountId, categoryId, date',
            transactionCategories: 'id, name, type, parentId'
        });
    }
}

export const db = new EduTrackDB();
