import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as axios } from '@/lib/api/client';
import { 
    Bank, CreateBankDTO, UpdateBankDTO, ImportPreviewData, 
    Account, Transaction, TransactionCategory, Budget,
    MonthlyReport, ForecastDay
} from '../types/finance';
import { toast } from 'sonner';

export function useFinance() {
    const queryClient = useQueryClient();

    // --- BANKS ---

    const { data: banks, isLoading: isLoadingBanks, error: banksError } = useQuery({
        queryKey: ['banks'],
        queryFn: async () => {
            const response = await axios.get<Bank[]>('/finance/banks');
            return response.data;
        }
    });

    const createBank = useMutation({
        mutationFn: async (newBank: CreateBankDTO) => {
            const response = await axios.post<Bank>('/finance/banks', newBank);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Banque ajoutée avec succès');
        }
    });

    const updateBank = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateBankDTO }) => {
            const response = await axios.put<Bank>(`/finance/banks/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Banque mise à jour');
        }
    });

    const deleteBank = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/finance/banks/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Banque supprimée');
        }
    });

    // --- ACCOUNTS & TRANSACTIONS ---

    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: async () => {
            const response = await axios.get<Account[]>('/finance/accounts');
            return response.data;
        }
    });

    const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const response = await axios.get<Transaction[]>('/finance/transactions');
            return response.data;
        }
    });

    // --- CATEGORIES ---

    const { data: categories, isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axios.get<TransactionCategory[]>('/finance/categories');
            return response.data;
        }
    });

    const createCategory = useMutation({
        mutationFn: async (data: Partial<TransactionCategory>) => {
            const response = await axios.post<TransactionCategory>('/finance/categories', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Catégorie créée');
        }
    });

    const updateCategory = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<TransactionCategory> }) => {
            const response = await axios.put<TransactionCategory>(`/finance/categories/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Catégorie mise à jour');
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/finance/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Catégorie supprimée');
        }
    });

    // --- BUDGETS ---

    const { data: budgets, isLoading: isLoadingBudgets } = useQuery({
        queryKey: ['budgets'],
        queryFn: async () => {
            const response = await axios.get<Budget[]>('/finance/budgets');
            return response.data;
        }
    });

    const updateBudget = useMutation({
        mutationFn: async (data: Partial<Budget>) => {
            const response = await axios.post<Budget>('/finance/budgets', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            toast.success('Budget mis à jour');
        }
    });

    // --- REPORTS & FORECAST ---

    const getMonthlyReport = (month: number, year: number) => {
        return useQuery({
            queryKey: ['monthly-report', month, year],
            queryFn: async () => {
                const response = await axios.get<MonthlyReport>(`/finance/reports/monthly?month=${month + 1}&year=${year}`);
                return response.data;
            }
        });
    };

    const { data: forecast, isLoading: isLoadingForecast } = useQuery({
        queryKey: ['forecast'],
        queryFn: async () => {
            const response = await axios.get<ForecastDay[]>('/finance/forecast?days=90');
            return response.data;
        }
    });

    // --- ACTIONS ---

    const createAccount = useMutation({
        mutationFn: async (data: Partial<Account> & { bankId: string }) => {
            const response = await axios.post<Account>('/finance/accounts', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Compte créé');
        }
    });

    const createTransaction = useMutation({
        mutationFn: async (data: Partial<Transaction>) => {
            const response = await axios.post<Transaction>('/finance/transactions', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success('Transaction créée');
        }
    });

    const updateTransaction = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
            const response = await axios.put<Transaction>(`/finance/transactions/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success('Transaction mise à jour');
        }
    });

    const deleteTransaction = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/finance/transactions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success('Transaction supprimée');
        }
    });

    const autoCategorize = useMutation({
        mutationFn: async (ids?: string[]) => {
            const response = await axios.post<{ updated: number }>('/finance/transactions/auto-categorize', { transactionIds: ids });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(`${data.updated} transactions catégorisées automatiquement`);
        }
    });

    const reclassifyAll = useMutation({
        mutationFn: async () => {
            const response = await axios.post<{ updated: number }>('/finance/transactions/reclassify-all');
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(`${data.updated} transactions reclassifiées`);
        }
    });

    const enrichTransaction = useMutation({
        mutationFn: async (id: string) => {
            const response = await axios.post(`/finance/transactions/${id}/enrich`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('Transaction enrichie par l\'IA');
        }
    });

    return {
        // Data
        banks: banks || [],
        accounts: accounts || [],
        transactions: transactions || [],
        categories: categories || [],
        budgets: budgets || [],
        forecast: forecast || [],
        
        // Loading states
        isLoadingBanks,
        isLoadingAccounts,
        isLoadingTransactions,
        isLoadingCategories,
        isLoadingBudgets,
        isLoadingForecast,

        // Mutations
        createBank: createBank.mutateAsync,
        updateBank: updateBank.mutateAsync,
        deleteBank: deleteBank.mutateAsync,
        createAccount: createAccount.mutateAsync,
        createTransaction: createTransaction.mutateAsync,
        updateTransaction: updateTransaction.mutateAsync,
        deleteTransaction: deleteTransaction.mutateAsync,
        createCategory: createCategory.mutateAsync,
        updateCategory: updateCategory.mutateAsync,
        deleteCategory: deleteCategory.mutateAsync,
        updateBudget: updateBudget.mutateAsync,
        autoCategorize: autoCategorize.mutateAsync,
        reclassifyAll: reclassifyAll.mutateAsync,
        enrichTransaction: enrichTransaction.mutateAsync,

        // Helper for report
        getMonthlyReport,

        // History
        useBalanceHistory: (months: number = 6) => {
            return useQuery({
                queryKey: ['balance-history', months],
                queryFn: async () => {
                    const response = await axios.get<BalanceHistoryRecord[]>(`/finance/history/balance?months=${months}`);
                    return response.data;
                }
            });
        },

        // Manual Refresh
        refresh: () => {
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
    };
}

export function useFinanceImport() {
    const queryClient = useQueryClient();

    const previewImport = useMutation({
        mutationFn: async ({ file, bankId, accountId }: { file: File; bankId: string; accountId?: string }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bankId', bankId);
            if (accountId) formData.append('accountId', accountId);

            const response = await axios.post<ImportPreviewData>('/finance/import/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Erreur lors de l'analyse du fichier");
            throw error;
        }
    });

    const confirmImport = useMutation({
        mutationFn: async ({ bankId, importData }: { bankId: string; importData: ImportPreviewData }) => {
            const response = await axios.post('/finance/import/confirm', {
                bankId,
                importData
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(`Import terminé : ${data.importedTransactions} transactions ajoutées.`);
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Erreur lors de la confirmation de l'import");
        }
    });

    return {
        previewImport: previewImport.mutateAsync,
        isPreviewing: previewImport.isPending,
        confirmImport: confirmImport.mutateAsync,
        isConfirming: confirmImport.isPending
    };
}
