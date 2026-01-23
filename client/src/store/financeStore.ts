import { create } from 'zustand';
import { financeApi } from '@/lib/api/financeApi';
import { Transaction, FinancialAccount } from '@/types/finance';

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
    addTransaction: (data: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    enrichTransaction: (id: string) => Promise<void>;
    importTransactions: (file: File) => Promise<void>;
    generateLocalAudit: () => Promise<string>;
    setFilters: (filters: Partial<FinanceFilters>) => void;

    // Computed Methods
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
        try {
            const { month, year, accountId, categoryId } = get().filters;

            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            const data = await financeApi.getTransactions({
                startDate,
                endDate,
                accountId: accountId || undefined,
                categoryId: categoryId || undefined
            });

            // Ensure dates are Date objects (API sends strings)
            const parsedData = data.map(t => ({
                ...t,
                date: new Date(t.date),
                createdAt: new Date(t.createdAt),
                amount: typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)
            }));

            set({ transactions: parsedData, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch transactions', error);
            set({ isLoading: false });
        }
    },

    fetchAccounts: async () => {
        try {
            const accounts = await financeApi.getAccounts();

            if (accounts.length === 0) {
                // Auto-create default account for zero-config experience
                console.log("No accounts found. Creating default account...");
                const defaultAccount = await financeApi.createAccount({
                    name: 'Compte Principal',
                    type: 'CHECKING',
                    balance: 0,
                    color: '#10b981',
                    icon: 'wallet'
                });
                set({ accounts: [defaultAccount] });
            } else {
                set({ accounts });
            }
        } catch (error) {
            console.error('Failed to fetch accounts', error);
        }
    },

    addTransaction: async (data) => {
        try {
            await financeApi.createTransaction(data);
            // Refresh to get updated list and balances
            get().fetchTransactions();
            get().fetchAccounts();
        } catch (error) {
            console.error('Failed to add transaction', error);
        }
    },

    deleteTransaction: async (id) => {
        try {
            await financeApi.deleteTransaction(id);
            // Optimistic update
            set(state => ({
                transactions: state.transactions.filter(t => t.id !== id)
            }));
            // Refresh accounts for balance update
            get().fetchAccounts();
        } catch (error) {
            console.error('Failed to delete transaction', error);
        }
    },

    enrichTransaction: async (id) => {
        const tx = get().transactions.find(t => t.id === id);
        if (!tx) return;

        try {
            // Optimistic loading state could be here? handled by UI loading map
            // Call AI
            const result = await financeApi.enrich(tx.description || '', tx.amount);

            if (result.success && result.suggestions) {
                // Update on server
                await financeApi.updateTransaction(id, {
                    aiEnriched: true,
                    aiSuggestions: result.suggestions
                });

                // Update local state
                set(state => ({
                    transactions: state.transactions.map(t =>
                        t.id === id ? { ...t, aiEnriched: true, aiSuggestions: result.suggestions } : t
                    )
                }));
            }
        } catch (error) {
            console.error("Enrichment error", error);
        }
    },

    importTransactions: async (file: File) => {
        try {
            await financeApi.uploadTransactions(file); // Ensure API has this method exposed
            // Fetch is handled by caller or we can do it here
            // get().fetchTransactions(); 
        } catch (error) {
            console.error("Import error", error);
            throw error; // Re-throw to let UI show error
        }
    },

    // Rename needed? Kept 'generateLocalAudit' for compat, but now fetches from store which matches API state
    generateLocalAudit: async () => {
        try {
            set({ isLoading: true });

            // Send last 50 transactions displayed
            const recentTx = get().transactions.slice(0, 50);

            const result = await financeApi.audit(recentTx);

            return result.audit;
        } catch (error) {
            console.error("Audit error", error);
            return "Erreur lors de la génération de l'audit.";
        } finally {
            set({ isLoading: false });
        }
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

    getBalance: () => {
        // Can be sum of accounts, or calculation from transactions
        // Better to use Sum of Accounts from API
        return get().accounts.reduce((acc, a) => acc + a.balance, 0);
    },

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
