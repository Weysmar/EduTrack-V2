export type TransactionType = 'INCOME' | 'EXPENSE';

export interface FinancialAccount {
    id: string;
    profileId: string;
    name: string;
    type: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface TransactionCategory {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
    color?: string | null;
}

export interface Transaction {
    id: string;
    profileId: string;
    accountId?: string | null;
    account?: FinancialAccount | null;

    amount: number;
    type: TransactionType;
    date: Date;
    description?: string | null;

    categoryId?: string | null;
    category?: TransactionCategory | null;

    isRecurring: boolean;
    recurringRule?: string | null;

    createdAt: Date;
    updatedAt: Date;
}

export interface Budget {
    id: string;
    profileId: string;
    categoryId: string;
    category: TransactionCategory;

    amount: number;
    period: string; // "MONTHLY"

    createdAt: Date;
    updatedAt: Date;
}
