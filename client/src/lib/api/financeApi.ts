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
    getTransactions: async (params?: { startDate?: Date; endDate?: Date; accountId?: string; categoryId?: string; type?: string; minAmount?: number; maxAmount?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
        if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());
        if (params?.accountId) queryParams.append('accountId', params.accountId);
        if (params?.categoryId) queryParams.append('category', params.categoryId);
        if (params?.type) queryParams.append('type', params.type);
        if (params?.minAmount) queryParams.append('minAmount', params.minAmount.toString());
        if (params?.maxAmount) queryParams.append('maxAmount', params.maxAmount.toString());

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
    },

    // Import
    uploadTransactions: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiClient.post('/finance/transactions/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    },

    // Banks
    getBanks: async () => {
        const { data } = await apiClient.get<any[]>('/banks');
        return data;
    },
    createBank: async (data: any) => {
        const { data: res } = await apiClient.post<any>('/banks', data);
        return res;
    },
    updateBank: async (id: string, data: any) => {
        const { data: res } = await apiClient.put<any>(`/banks/${id}`, data);
        return res;
    },
    deleteBank: async (id: string) => {
        await apiClient.delete(`/banks/${id}`);
    }
};
