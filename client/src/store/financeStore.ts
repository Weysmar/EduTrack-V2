import { create } from 'zustand';
import { financeApi } from '@/lib/api/financeApi';
import { Transaction, FinancialAccount, Bank, TransactionCategory } from '@/types/finance';

interface FinanceFilters {
    month: number | null;
    year: number | null;
    accountId: string | null;
    categoryId: string | null;
    minAmount?: number | null;
    maxAmount?: number | null;
    hideInternalTransfers?: boolean;
}

interface FinanceState {
    transactions: Transaction[];
    accounts: FinancialAccount[];
    isLoading: boolean;
    showArchived: boolean;
    toggleShowArchived: () => void;
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


    categories: TransactionCategory[];
    fetchCategories: () => Promise<void>;
    addCategory: (category: { name: string; color?: string; icon?: string; keywords?: string[] }) => Promise<void>;
    updateCategory: (id: string, updates: Partial<{ name: string; color: string; icon: string; keywords: string[] }>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    // Computed Methods
    getTotalIncome: () => number;
    getTotalExpenses: () => number;
    getBalance: () => number;
    getCategoryBreakdown: () => { category: string; amount: number }[];

    // Bank Actions
    banks: Bank[];
    fetchBanks: () => Promise<void>;
    createBank: (data: any) => Promise<void>;
    updateBank: (id: string, data: any) => Promise<void>;
    deleteBank: (id: string) => Promise<void>;

    // Account Actions
    updateAccount: (id: string, data: Partial<FinancialAccount>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;

    // Transaction Actions
    updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;

    // Budget Actions
    budgets: any[]; // Replace with Budget type
    fetchBudgets: () => Promise<void>;
    addBudget: (data: { categoryId: string; amount: number; period?: string }) => Promise<void>;
    updateBudget: (id: string, data: Partial<{ amount: number; period: string }>) => Promise<void>;
    deleteBudget: (id: string) => Promise<void>;

    // Import Logs
    // Import Logs
    importLogs: any[];
    fetchImportLogs: () => Promise<void>;

    // Export
    exportData?: (format: 'json' | 'csv') => Promise<void>; // Optional if handled via API directly
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
    transactions: [],
    accounts: [],
    banks: [], // Initialize banks array
    categories: [],
    budgets: [],
    importLogs: [],

    fetchCategories: async () => {
        try {
            const categories = await financeApi.getCategories();
            set({ categories });
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    },

    addCategory: async (category) => {
        try {
            const newCategory = await financeApi.createCategory(category);
            set((state) => ({ categories: [...state.categories, newCategory] }));
        } catch (error) {
            console.error('Failed to add category', error);
        }
    },

    updateCategory: async (id, updates) => {
        try {
            const updatedCategory = await financeApi.updateCategory(id, updates);
            set((state) => ({
                categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
            }));
        } catch (error) {
            console.error('Failed to update category', error);
        }
    },

    deleteCategory: async (id) => {
        try {
            await financeApi.deleteCategory(id);
            set((state) => ({
                categories: state.categories.filter((c) => c.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete category', error);
        }
    },
    isLoading: false,
    showArchived: false,
    filters: {
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        accountId: null,
        categoryId: null,
        hideInternalTransfers: false
    },

    fetchTransactions: async () => {
        set({ isLoading: true });
        try {
            const { month, year, accountId, categoryId } = get().filters;

            let startDate: Date | undefined;
            let endDate: Date | undefined;

            if (month !== null && year !== null) { // Fix: Checks if filtering is active
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0, 23, 59, 59);
            }

            // API supports missing start/end for "all time"
            const data = await financeApi.getTransactions({
                startDate,
                endDate,
                accountId: accountId || undefined,
                categoryId: categoryId || undefined,
                minAmount: get().filters.minAmount || undefined,
                maxAmount: get().filters.maxAmount || undefined
            });

            // Keep dates as strings for type compatibility
            const parsedData = data.map(t => ({
                ...t,
                amount: typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount)
            }));

            set({ transactions: parsedData, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch transactions', error);
            set({ isLoading: false });
        }
    },

    toggleShowArchived: () => {
        const newValue = !get().showArchived;
        set({ showArchived: newValue });
        get().fetchAccounts();
        get().fetchBanks();
    },

    fetchAccounts: async () => {
        try {
            const showArchived = get().showArchived;
            // Need to update API method to accept query param first, but assuming we modify API helper too or pass manually string
            // Let's modify api call below in next step or use direct fetch if needed, but better to update api lib.
            // Assuming api.getAccounts supports optional arg. I will update api lib next.
            // For now, let's look at financeApi.ts logic.
            // I'll update financeApi.ts to accept arguments.

            // Wait, I should update financeApi.ts first or passing args here will fail TS check? 
            // It's JS/TS, it might be fine if typed vaguely, but better to do it right.
            // I'll proceed with assumed update to api.
            const accounts = await financeApi.getAccounts(showArchived);

            if (accounts.length === 0 && !showArchived) {
                // ... default account logic only if not looking for archived and truly empty
                // Logic: If no accounts AT ALL (active or not), suggest creation.
                // Check if this is the very first load.
                console.log("No active accounts found.");
            }

            // ... formatting ...
            const parsedAccounts = accounts.map(a => ({
                ...a,
                balance: typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance)
            }));
            set({ accounts: parsedAccounts });

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

    updateTransaction: async (id, data) => {
        try {
            await financeApi.updateTransaction(id, data);
            get().fetchTransactions();
            get().fetchAccounts();
        } catch (error) {
            console.error('Failed to update transaction', error);
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
            await financeApi.uploadTransactions(file);
            // Refresh everything
            await get().fetchTransactions();
            await get().fetchAccounts();
        } catch (error) {
            console.error("Import error", error);
            throw error;
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
                const category = t.category || 'Uncategorized';
                breakdown.set(category, (breakdown.get(category) || 0) + Math.abs(t.amount));
            }
        });

        return Array.from(breakdown.entries()).map(([category, amount]) => ({
            category,
            amount
        }));
    },


    fetchBanks: async () => {
        try {
            const showArchived = get().showArchived;
            const banks = await financeApi.getBanks(showArchived);
            set({ banks });
        } catch (error) {
            console.error('Failed to fetch banks', error);
        }
    },
    createBank: async (data) => {
        await financeApi.createBank(data);
        get().fetchBanks();
    },
    updateBank: async (id, data) => {
        await financeApi.updateBank(id, data);
        get().fetchBanks();
    },
    deleteBank: async (id) => {
        await financeApi.deleteBank(id);
        get().fetchBanks();
    },

    updateAccount: async (id, data) => {
        try {
            await financeApi.updateAccount(id, data);
            get().fetchAccounts();
            get().fetchBanks(); // Refresh banks too as they contain accounts
        } catch (error) {
            console.error('Failed to update account', error);
        }
    },

    deleteAccount: async (id) => {
        try {
            await financeApi.deleteAccount(id);
            get().fetchAccounts();
            get().fetchBanks();
        } catch (error) {
            console.error('Failed to delete account', error);
        }
    },

    // Budget Implementation already initialized above

    fetchBudgets: async () => {
        try {
            const budgets = await financeApi.getBudgets();
            set({ budgets });
        } catch (error) {
            console.error('Failed to fetch budgets', error);
        }
    },

    addBudget: async (data) => {
        try {
            await financeApi.createBudget(data);
            get().fetchBudgets();
        } catch (error) {
            console.error('Failed to create budget', error);
        }
    },

    updateBudget: async (id, data) => {
        try {
            await financeApi.updateBudget(id, data);
            get().fetchBudgets();
        } catch (error) {
            console.error('Failed to update budget', error);
        }
    },

    deleteBudget: async (id) => {
        try {
            await financeApi.deleteBudget(id);
            get().fetchBudgets();
        } catch (error) {
            console.error('Failed to delete budget', error);
        }
    },

    // Import Logs Implementation
    fetchImportLogs: async () => {
        try {
            const logs = await financeApi.getImportLogs();
            set({ importLogs: logs });
        } catch (error) {
            console.error('Failed to fetch import logs', error);
        }
    },

    exportData: async (format) => {
        try {
            await financeApi.exportData(format);
        } catch (error) {
            console.error('Export error', error);
        }
    }

}));
