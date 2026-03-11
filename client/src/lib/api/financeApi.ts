import { apiClient } from './client';
import { Transaction, FinancialAccount, TransactionCategory, RecurringTransaction, SavingsGoal, SavingsProjection, ForecastDay, AutoCategorizeRule, RuleCondition, FinanceAlert, HealthScoreResult, MonthlyReport } from '../../types/finance';

export const financeApi = {
    // Accounts
    getAccounts: async (includeArchived?: boolean) => {
        const params = includeArchived ? '?includeArchived=true' : '';
        const { data } = await apiClient.get<FinancialAccount[]>(`/finance/accounts${params}`);
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
    autoCategorizeTransactions: async (transactionIds?: string[]) => {
        const { data } = await apiClient.post<{ success: boolean; updated: number; matches: any }>('/finance/transactions/auto-categorize', { transactionIds });
        return data;
    },
    reclassifyAllTransactions: async () => {
        const { data } = await apiClient.post<{ success: boolean; updated: number; total: number }>('/finance/transactions/reclassify-all');
        return data;
    },

    // AI
    enrich: async (description: string, amount: number) => {
        const { data } = await apiClient.post('/finance/transactions/1/enrich', { description, amount });
        return data;
    },
    audit: async (transactions: any[]) => {
        const { data } = await apiClient.post('/finance/audit', { transactions });
        return data;
    },

    getImportLogs: async () => {
        const { data } = await apiClient.get('/finance/imports');
        return data;
    },

    // Budgets
    getBudgets: async () => {
        const { data } = await apiClient.get<any[]>('/finance/budgets');
        return data;
    },
    createBudget: async (data: any) => {
        const { data: res } = await apiClient.post('/finance/budgets', data);
        return res;
    },
    updateBudget: async (id: string, data: any) => {
        const { data: res } = await apiClient.put(`/finance/budgets/${id}`, data);
        return res;
    },
    deleteBudget: async (id: string) => {
        await apiClient.delete(`/finance/budgets/${id}`);
    },

    exportData: async (format: 'json' | 'csv') => {
        const response = await apiClient.get(`/finance/export?format=${format}`, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `persotrack_export_${date}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    // Categories
    getCategories: async () => {
        const { data } = await apiClient.get<TransactionCategory[]>('/finance/categories');
        return data;
    },
    createCategory: async (category: Partial<TransactionCategory>) => {
        const { data } = await apiClient.post<TransactionCategory>('/finance/categories', category);
        return data;
    },
    updateCategory: async (id: string, updates: Partial<TransactionCategory>) => {
        const { data } = await apiClient.put<TransactionCategory>(`/finance/categories/${id}`, updates);
        return data;
    },
    deleteCategory: async (id: string) => {
        await apiClient.delete(`/finance/categories/${id}`);
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
    getBanks: async (includeArchived?: boolean) => {
        const params = includeArchived ? '?includeArchived=true' : '';
        const { data } = await apiClient.get<any[]>(`/finance/banks${params}`);
        return data;
    },
    createBank: async (data: any) => {
        const { data: res } = await apiClient.post<any>('/finance/banks', data);
        return res;
    },
    updateBank: async (id: string, data: any) => {
        const { data: res } = await apiClient.put<any>(`/finance/banks/${id}`, data);
        return res;
    },
    deleteBank: async (id: string) => {
        await apiClient.delete(`/finance/banks/${id}`);
    },

    // --- Recurring Transactions ---
    getRecurring: async () => {
        const { data } = await apiClient.get<RecurringTransaction[]>('/finance/recurring');
        return data;
    },
    detectRecurring: async () => {
        const { data } = await apiClient.post<{ detected: number; created: number; updated: number }>('/finance/recurring/detect');
        return data;
    },
    updateRecurring: async (id: string, updates: Partial<RecurringTransaction>) => {
        const { data } = await apiClient.put<RecurringTransaction>(`/finance/recurring/${id}`, updates);
        return data;
    },
    deleteRecurring: async (id: string) => {
        await apiClient.delete(`/finance/recurring/${id}`);
    },

    // --- Savings Goals ---
    getSavingsGoals: async () => {
        const { data } = await apiClient.get<SavingsGoal[]>('/finance/goals');
        return data;
    },
    createSavingsGoal: async (goal: { name: string; targetAmount: number; deadline?: string; icon?: string; color?: string }) => {
        const { data } = await apiClient.post<SavingsGoal>('/finance/goals', goal);
        return data;
    },
    updateSavingsGoal: async (id: string, updates: Partial<SavingsGoal>) => {
        const { data } = await apiClient.put<SavingsGoal>(`/finance/goals/${id}`, updates);
        return data;
    },
    deleteSavingsGoal: async (id: string) => {
        await apiClient.delete(`/finance/goals/${id}`);
    },
    getSavingsProjection: async (id: string) => {
        const { data } = await apiClient.get<SavingsProjection>(`/finance/goals/${id}/projection`);
        return data;
    },
    recalculateSavings: async () => {
        const { data } = await apiClient.post<{ updated: number; monthlySavings: number }>('/finance/goals/recalculate');
        return data;
    },
    getSavingsRate: async () => {
        const { data } = await apiClient.get<{ rate: number; income: number; expenses: number; savings: number }>('/finance/savings-rate');
        return data;
    },

    // Cashflow Forecast
    getForecast: async (days: number = 90) => {
        const { data } = await apiClient.get<ForecastDay[]>(`/finance/forecast?days=${days}`);
        return data;
    },

    // Auto-Categorization Rules
    getRules: async () => {
        const { data } = await apiClient.get<AutoCategorizeRule[]>('/finance/rules');
        return data;
    },
    createRule: async (rule: { name: string; conditions: RuleCondition[]; categoryName: string; priority?: number }) => {
        const { data } = await apiClient.post<AutoCategorizeRule>('/finance/rules', rule);
        return data;
    },
    updateRule: async (id: string, updates: Partial<AutoCategorizeRule>) => {
        const { data } = await apiClient.put<AutoCategorizeRule>(`/finance/rules/${id}`, updates);
        return data;
    },
    deleteRule: async (id: string) => {
        await apiClient.delete(`/finance/rules/${id}`);
    },
    testRule: async (conditions: RuleCondition[]) => {
        const { data } = await apiClient.post<{ matchCount: number; samples: { id: string; description: string; amount: number }[] }>('/finance/rules/test', { conditions });
        return data;
    },

    // Finance Alerts
    getAlerts: async () => {
        const { data } = await apiClient.get<FinanceAlert[]>('/finance/alerts');
        return data;
    },
    markAlertRead: async (id: string) => {
        await apiClient.put(`/finance/alerts/${id}/read`);
    },
    dismissAlert: async (id: string) => {
        await apiClient.put(`/finance/alerts/${id}/dismiss`);
    },
    checkAlerts: async () => {
        const { data } = await apiClient.post<{ newAlerts: number }>('/finance/alerts/check');
        return data;
    },
    getUnreadAlertCount: async () => {
        const { data } = await apiClient.get<{ count: number }>('/finance/alerts/unread-count');
        return data;
    },

    // Health Score
    getHealthScore: async () => {
        const { data } = await apiClient.get<HealthScoreResult>('/finance/health-score');
        return data;
    },

    // Monthly Reports
    getMonthlyReport: async (year: number, month: number) => {
        const { data } = await apiClient.get<MonthlyReport>(`/finance/reports/${year}/${month}`);
        return data;
    }
};
