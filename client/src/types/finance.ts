export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN' | 'OTHER';

export type TransactionClassification = 'EXTERNAL' | 'INTERNAL_INTRA_BANK' | 'INTERNAL_INTER_BANK' | 'UNKNOWN';

export interface Bank {
    id: string;
    name: string;
    swifBic?: string;
    color: string;
    icon?: string;
    active: boolean;
    accounts?: Account[];
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export interface Account {
    id: string;
    bankId: string;
    bank?: Bank;
    name: string;
    type: AccountType;
    iban?: string;
    accountNumber?: string;
    currency: string;
    balance?: number;
    balanceDate?: string;
    lastTransactionDate?: string;
    autoDetected: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Transaction {
    id: string;
    accountId: string;
    account?: Account;
    date: string;
    amount: number;
    description: string;
    beneficiaryIban?: string;
    classification: TransactionClassification;
    classificationConfidence?: number;
    linkedAccountId?: string;
    category?: string;
    importSource?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBankDTO {
    name: string;
    color: string;
    icon?: string;
    swiftBic?: string;
}

export interface UpdateBankDTO extends Partial<CreateBankDTO> { }

// --- Import Types ---

export interface ImportPreviewData {
    detectedBankId: string;
    accounts: {
        isNew: boolean;
        accountName: string;
        accountNumber: string;
        balance: number;
        currency: string;
    }[];
    transactions: {
        date: string; // ISO date string from JSON
        amount: number;
        description: string;
        classification: TransactionClassification;
        confidence: number;
        accountNumber: string;
        isDuplicate: boolean;
        importId?: string;
    }[];
    summary: {
        totalTransactions: number;
        newTransactions: number;
        duplicates: number;
    }
}
