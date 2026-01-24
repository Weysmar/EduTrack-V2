export interface Bank {
    id: string;
    name: string;
    icon?: string;
    color: string;
    profileId: string;
    swiftCode?: string;
    isActive: boolean;
    isArchived: boolean;
    metadata?: any;
}

export interface FinancialAccount {
    id: string;
    profileId: string;
    bankId?: string; // Link to Bank
    name: string;
    type: 'CHECKING' | 'SAVINGS' | 'CASH';
    balance: number;
    currency: string;
    icon?: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
    lastSyncedAt?: Date;
    isArchived: boolean;
    isAutoDetected: boolean;
    metadata?: any;
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

    // V2 Fields
    classification: 'EXTERNAL' | 'INTERNAL_INTRA' | 'INTERNAL_INTER' | 'UNKNOWN';
    confidenceScore: number;
    beneficiaryIban?: string;
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
