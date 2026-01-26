export interface OfxTransaction {
    date: Date;
    amount: number;
    description: string;
    fitId: string; // Financial Institution Transaction ID (unique provided by bank)
    checkNumber?: string;
    type: 'CREDIT' | 'DEBIT' | 'OTHER';
}

export interface OfxAccount {
    accountId: string; // The account number/IBAN from the file
    bankId?: string;   // The bank code if available
    currency: string;
    balance?: number;
    balanceDate?: Date;
    transactions: OfxTransaction[];
}

export interface OfxData {
    accounts: OfxAccount[];
}
