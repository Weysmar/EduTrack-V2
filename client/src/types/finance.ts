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
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    date: Date;
    description?: string;
    categoryId?: string;
    receiptUrl?: string;
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

export interface Budget {
    id: string;
    profileId: string;
    categoryId: string;
    amount: number;
    period: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
    startDate: Date;
    endDate?: Date;
}
