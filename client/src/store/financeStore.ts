import { create } from 'zustand';
import { db, Transaction, FinancialAccount } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface FinanceFilters {
    month: number;
    year: number;
    accountId: string | null;
    categoryId: string | null;
}

interface FinanceState {
    transactions: Transaction[];
    accounts: FinancialAccount[];
    isLoading: boolean;
    filters: FinanceFilters;

    // Actions
    fetchTransactions: () => Promise<void>;
    fetchAccounts: () => Promise<void>;
    addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'aiEnriched'>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    setFilters: (filters: Partial<FinanceFilters>) => void;

    // Computed Methods (can perform on currently loaded transactions)
    getTotalIncome: () => number;
    getTotalExpenses: () => number;
    getBalance: () => number;
    getCategoryBreakdown: () => { category: string; amount: number }[];
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
    transactions: [],
    accounts: [],
    isLoading: false,
    filters: {
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        accountId: null,
        categoryId: null
    },

    fetchTransactions: async () => {
        set({ isLoading: true });
        const { month, year, accountId } = get().filters;

        // Dexie Date Range Query
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        let collection = db.transactions
            .where('date')
            .between(startDate, endDate);

        if (accountId) {
            collection = collection.filter(t => t.accountId === accountId);
        }

        // Reverse chronological order
        const data = await collection.reverse().toArray();
        set({ transactions: data, isLoading: false });
    },

    fetchAccounts: async () => {
        const accounts = await db.financialAccounts.toArray();
        set({ accounts });
    },

    addTransaction: async (data) => {
        const newTransaction: Transaction = {
            ...data,
            id: uuidv4(),
            createdAt: new Date(),
            aiEnriched: false
        };

        // 1. Add to Dexie
        await db.transactions.add(newTransaction);

        // 2. Update Local State (Optimistic UI)
        const currentTx = get().transactions;
        // Check if new transaction falls within current filter view, if so add it
        // For simplicity, just refetch or prepend if date matches current view
        // Here we prepend
        set({ transactions: [newTransaction, ...currentTx] });

        // 3. Update Account Balance locally
        if (data.accountId) {
            const account = await db.financialAccounts.get(data.accountId);
            if (account) {
                let adjustment = data.amount;
                if (data.type === 'EXPENSE') adjustment = -Math.abs(data.amount);
                else adjustment = Math.abs(data.amount);

                await db.financialAccounts.update(data.accountId, {
                    balance: account.balance + adjustment,
                    updatedAt: new Date()
                });
                // Refresh accounts list
                get().fetchAccounts();
            }
        }
    },

    deleteTransaction: async (id) => {
        const tx = await db.transactions.get(id);
        if (!tx) return;

        await db.transactions.delete(id);

        // Rollback balance
        if (tx.accountId) {
            const account = await db.financialAccounts.get(tx.accountId);
            if (account) {
                let adjustment = tx.amount;
                if (tx.type === 'EXPENSE') adjustment = -Math.abs(tx.amount); // Expense was negative, so removing it adds back? No.
                // If I added -50 (expense), balance went down. Removing it should add +50.
                // adjustment here should be the opposite of what was done.
                // Wait, logic above: balance = balance + adjustment.
                // If adjustment was -50.
                // To rollback, balance = balance - adjustment.
                // balance = balance - (-50) = balance + 50. Correct.

                // So simply subtract the original adjustment.
                // But I need to recalculate `adjustment` same way.
                let originalAdjustment = tx.amount;
                if (tx.type === 'EXPENSE') originalAdjustment = -Math.abs(tx.amount);
                else originalAdjustment = Math.abs(tx.amount);

                await db.financialAccounts.update(tx.accountId, {
                    balance: account.balance - originalAdjustment,
                    updatedAt: new Date()
                });
                get().fetchAccounts();
            }
        }

        set(state => ({
            transactions: state.transactions.filter(t => t.id !== id)
        }));
    },

    setFilters: (newFilters) => {
        set(state => ({
            filters: { ...state.filters, ...newFilters }
        }));
        get().fetchTransactions();
    },

    getTotalIncome: () => {
        return get().transactions
            .filter(t => t.type === 'INCOME')
            .reduce((acc, t) => acc + t.amount, 0);
    },

    getTotalExpenses: () => {
        return get().transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    },

    getBalance: () => get().getTotalIncome() - get().getTotalExpenses(),

    getCategoryBreakdown: () => {
        const breakdown = new Map<string, number>();

        get().transactions.forEach(t => {
            if (t.type === 'EXPENSE') {
                const category = t.categoryId || 'Uncategorized';
                breakdown.set(category, (breakdown.get(category) || 0) + Math.abs(t.amount));
            }
        });

        return Array.from(breakdown.entries()).map(([category, amount]) => ({
            category,
            amount
        }));
    }
}));
