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
            return response.data;
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
        isCreatingBank: createBank.isPending,
        updateBank: updateBank.mutate,
        isUpdatingBank: updateBank.isPending,
        deleteBank: deleteBank.mutate,
        isDeletingBank: deleteBank.isPending,

        // Accounts
        accounts: accounts || [],
        isLoadingAccounts,
        createAccount: createAccount.mutate,
        updateAccount: updateAccount.mutate,
        deleteAccount: deleteAccount.mutate,

        // New Data
        transactions: transactions || [],
        isLoadingTransactions
    };
}

export function useFinanceImport() {
    const queryClient = useQueryClient();

    const previewImport = useMutation({
        mutationFn: async ({ file, bankId }: { file: File; bankId: string }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bankId', bankId);

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
