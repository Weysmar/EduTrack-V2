import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as axios } from '@/lib/api/client';
import { Bank, CreateBankDTO, UpdateBankDTO, ImportPreviewData, Account, Transaction } from '../types/finance';
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
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la création de la banque');
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
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
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
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
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

    // --- ACCOUNT MUTATIONS ---

    const createAccount = useMutation({
        mutationFn: async (data: Partial<Account> & { bankId: string }) => {
            const response = await axios.post<Account>('/finance/accounts', data);
            const newAccount = response.data;

            // Auto-create initial transaction if balance is set
            if (data.balance && Number(data.balance) !== 0) {
                try {
                    await axios.post('/finance/transactions', {
                        accountId: newAccount.id,
                        amount: Number(data.balance),
                        date: new Date().toISOString(),
                        description: "Solde initial",
                        type: Number(data.balance) > 0 ? 'INCOME' : 'EXPENSE',
                        classification: 'UNKNOWN',
                        category: 'Solde Initial',
                        isRecurring: false,
                        profileId: 'current-user-id' // Fallback
                    });
                } catch (err) {
                    console.error("Failed to create initial balance transaction", err);
                    // Don't fail the account creation if this fails, just log it
                }
            }
            return newAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['banks'] }); // Update bank totals
            toast.success('Compte créé');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Erreur création compte');
        }
    });

    const updateAccount = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
            const response = await axios.put<Account>(`/finance/accounts/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Compte mis à jour');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Erreur mise à jour compte');
        }
    });

    const deleteAccount = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/finance/accounts/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success('Compte supprimé');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Erreur suppression compte');
        }
    });

    return {
        // Banks
        banks: banks || [],
        isLoadingBanks,
        banksError,
        createBank: createBank.mutate,
        createBankAsync: createBank.mutateAsync,
        isCreatingBank: createBank.isPending,
        updateBank: updateBank.mutate,
        updateBankAsync: updateBank.mutateAsync,
        isUpdatingBank: updateBank.isPending,
        deleteBank: deleteBank.mutate,
        deleteBankAsync: deleteBank.mutateAsync,
        isDeletingBank: deleteBank.isPending,

        // Accounts
        accounts: accounts || [],
        isLoadingAccounts,
        createAccount: createAccount.mutate,
        createAccountAsync: createAccount.mutateAsync,
        updateAccount: updateAccount.mutate,
        updateAccountAsync: updateAccount.mutateAsync,
        deleteAccount: deleteAccount.mutate,
        deleteAccountAsync: deleteAccount.mutateAsync,

        // New Data
        transactions: transactions || [],
        isLoadingTransactions,

        // Transaction Mutations
        createTransaction: useMutation({
            mutationFn: async (data: Partial<Transaction>) => {
                const response = await axios.post<Transaction>('/finance/transactions', data);
                return response.data;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Balance update
                toast.success('Transaction créée');
            },
            onError: (err: any) => toast.error('Erreur lors de la création')
        }).mutate,

        updateTransaction: useMutation({
            mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
                const response = await axios.put<Transaction>(`/finance/transactions/${id}`, data);
                return response.data;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                toast.success('Transaction mise à jour');
            }
        }).mutate,

        deleteTransaction: useMutation({
            mutationFn: async (id: string) => {
                await axios.delete(`/finance/transactions/${id}`);
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                toast.success('Transaction supprimée');
            }
        }).mutate
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
