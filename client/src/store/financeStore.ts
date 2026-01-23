import { create } from 'zustand';
import { Transaction, TransactionCategory } from '../types/finance';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface FinanceState {
    transactions: Transaction[];
    categories: TransactionCategory[];
    currentDate: Date; // Pour filtrer par mois
    isLoading: boolean;

    // Actions
    setTransactions: (transactions: Transaction[]) => void;
    addTransaction: (transaction: Transaction) => void;
    removeTransaction: (id: string) => void;
    setCurrentDate: (date: Date) => void;

    // Selectors (Getters calculés)
    getMonthlyStats: () => {
        income: number;
        expenses: number;
        balance: number;
    };
    getFilteredTransactions: () => Transaction[];
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
    transactions: [],
    categories: [],
    // Initialize with dummy data logic could go here or fetch from API
    currentDate: new Date(),
    isLoading: false,

    setTransactions: (transactions) => set({ transactions }),

    addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions]
    })),

    removeTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
    })),

    setCurrentDate: (date) => set({ currentDate: date }),

    getFilteredTransactions: () => {
        const { transactions, currentDate } = get();
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        return transactions.filter(t =>
            isWithinInterval(new Date(t.date), { start, end })
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    getMonthlyStats: () => {
        const filtered = get().getFilteredTransactions();

        const income = filtered
            .filter(t => t.type === 'INCOME')
            .reduce((acc, t) => acc + t.amount, 0);

        const expenses = filtered
            .filter(t => t.type === 'EXPENSE')
            .reduce((acc, t) => acc + t.amount, 0);

        // Balance is currently just income - expenses of the month for the scope of this view
        // In a real app, it would be the account balance.
        // Let's assume for now it's Monthly Cashflow
        return {
            income,
            expenses,
            balance: income - expenses
        };
    }
}));
