export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'LOAN' | 'OTHER';
export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionClassification = 'EXTERNAL' | 'INTERNAL_INTRA_BANK' | 'INTERNAL_INTER_BANK' | 'UNKNOWN';

export interface Bank {
    id: string;
    name: string;
    swiftBic?: string;
    color: string;
    icon?: string;
    active: boolean;
    isArchived?: boolean;
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
    isArchived?: boolean;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export interface Transaction {
    id: string;
    accountId: string;
    account?: Account;
    profileId?: string;
    date: string;
    amount: number;
    description: string;
    beneficiaryIban?: string;
    classification: TransactionClassification;
    classificationConfidence?: number;
    linkedAccountId?: string;
    category?: string;
    importSource?: string;
    type?: TransactionType;
    isRecurring?: boolean;
    aiEnriched?: boolean;
    aiSuggestions?: any;
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
        date: string;
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

export type FinancialAccount = Account;

export interface TransactionCategory {
    id: string;
    name: string;
    color: string;
    icon?: string;
    keywords?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    category?: TransactionCategory;
    amount: number;
    period: 'MONTHLY' | 'YEARLY';
    month?: number;
    year?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ImportLog {
    id: string;
    fileName: string;
    importDate: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    recordCount: number;
    details?: any;
}

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringTransaction {
    id: string;
    description: string;
    averageAmount: number;
    estimatedDay: number;
    frequency: RecurringFrequency;
    category?: string;
    type: string;
    lastSeenDate?: string;
    nextExpectedDate?: string;
    occurrenceCount: number;
    confidenceScore: number;
    isActive: boolean;
    isPaused: boolean;
    createdAt: string;
    updatedAt: string;
}

export type SavingsGoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    monthlyTarget?: number;
    icon?: string;
    color?: string;
    status: SavingsGoalStatus;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavingsProjection {
    currentAmount: number;
    targetAmount: number;
    monthlyActualSavings: number;
    monthsRemaining: number | null;
    projectedCompletionDate: string | null;
    onTrack: boolean;
    progress: number;
}

export interface ForecastEvent {
    description: string;
    amount: number;
    type: 'RECURRING_INCOME' | 'RECURRING_EXPENSE' | 'VARIABLE_ESTIMATE';
}

export interface ForecastDay {
    date: string;
    projectedBalance: number;
    events: ForecastEvent[];
}

export type RuleOperator = 'contains' | 'startsWith' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte';
export type RuleField = 'description' | 'amount' | 'beneficiaryIban';

export interface RuleCondition {
    field: RuleField;
    operator: RuleOperator;
    value: string | number;
    caseSensitive?: boolean;
}

export interface AutoCategorizeRule {
    id: string;
    name: string;
    priority: number;
    conditions: RuleCondition[];
    categoryName: string;
    isActive: boolean;
    matchCount: number;
    createdAt: string;
    updatedAt: string;
}

export type AlertType = 'BUDGET_EXCEEDED' | 'BUDGET_WARNING' | 'LOW_BALANCE' | 'UNUSUAL_TRANSACTION' | 'RECURRING_MISSING' | 'GOAL_COMPLETED' | 'GOAL_AT_RISK';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'CELEBRATION';

export interface FinanceAlert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    isDismissed: boolean;
    createdAt: string;
}

export interface ScoreCriteria {
    score: number;
    value: number;
    weight: number;
    label: string;
}

export interface HealthScoreResult {
    globalScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
        savingsRate: ScoreCriteria;
        budgetCompliance: ScoreCriteria;
        incomeStability: ScoreCriteria;
        fixedRatio: ScoreCriteria;
        diversification: ScoreCriteria;
        trend: ScoreCriteria;
    };
    tips: string[];
    hasEnoughData?: boolean;
}

export interface MonthlyReport {
    period: { month: number; year: number };
    summary: {
        totalIncome: number;
        totalExpenses: number;
        savingsAmount: number;
        savingsRate: number;
        incomeVsPreviousMonth: number;
        expensesVsPreviousMonth: number;
    };
    topExpenses: { category: string; amount: number; percentOfTotal: number }[];
    budgetReport: { category: string; budgeted: number; spent: number; status: string }[];
    recurringReport: { description: string; amount: number; status: 'OK' | 'MISSED' }[];
    savingsGoals: { name: string; progress: number; target: number; current: number; onTrack: boolean }[];
    healthScore: number;
}

export interface BalanceHistoryRecord {
    date: string;
    label: string;
    value: number;
}
