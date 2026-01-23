import { apiClient } from './client';
import { Transaction, FinancialAccount, TransactionCategory } from '../../types/finance';

export const financeApi = {
    // Accounts
    getAccounts: async () => {
        const { data } = await apiClient.get<FinancialAccount[]>('/finance/accounts');
        return data;
    },
    createAccount: async (account: Partial<FinancialAccount>) => {
        const { data } = await apiClient.post<FinancialAccount>('/finance/accounts', account);
        return data;
    },
    updateAccount: async (id: string, updates: Partial<FinancialAccount>) => {
        const { data } = await apiClient.put<FinancialAccount>(`/finance/accounts/${id}`, updates);
        return data;
    },
    deleteAccount: async (id: string) => {
        await apiClient.delete(`/finance/accounts/${id}`);
    },

    // Transactions
    getTransactions: async (params?: { startDate?: Date; endDate?: Date; accountId?: string; categoryId?: string; type?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
        if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());
        if (params?.accountId) queryParams.append('accountId', params.accountId);
        if (params?.categoryId) queryParams.append('category', params.categoryId);
        if (params?.type) queryParams.append('type', params.type);

        const { data } = await apiClient.get<Transaction[]>(`/finance/transactions?${queryParams.toString()}`);
        return data;
    },
    createTransaction: async (data: Partial<Transaction>) => {
        const { data: res } = await apiClient.post<Transaction>('/finance/transactions', data);
        return res;
    },
    updateTransaction: async (id: string, updates: Partial<Transaction>) => {
        const { data } = await apiClient.put<Transaction>(`/finance/transactions/${id}`, updates);
        return data;
    },
    deleteTransaction: async (id: string) => {
        await apiClient.delete(`/finance/transactions/${id}`);
    },

    // AI
    enrich: async (description: string, amount: number) => {
        // We use a dummy ID '1' or fixed path as per route definition, but body carries data
        const { data } = await apiClient.post('/finance/transactions/1/enrich', { description, amount });
        return data;
    },
    audit: async (transactions: any[]) => {
        const { data } = await apiClient.post('/finance/audit', { transactions });
        return data;
    },

    // Categories
    getCategories: async () => {
        const { data } = await apiClient.get<TransactionCategory[]>('/finance/categories');
        return data;
    }
};
