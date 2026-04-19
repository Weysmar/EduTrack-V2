import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction } from '../types/finance';

interface FinanceState {
    // UI State
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    
    hideInternalTransfers: boolean;
    toggleInternalTransfers: () => void;
    
    editingTransaction: Transaction | null;
    setEditingTransaction: (tx: Transaction | null) => void;

    // Filters
    filters: {
        month: number;
        year: number;
        accountId: string | null;
        categoryId: string | null;
        minAmount?: number;
        maxAmount?: number;
    };
    setFilters: (filters: Partial<FinanceState['filters']>) => void;
    resetFilters: () => void;
}

const now = new Date();

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set) => ({
            showArchived: false,
            setShowArchived: (show) => set({ showArchived: show }),
            
            hideInternalTransfers: true,
            toggleInternalTransfers: () => set((state) => ({ hideInternalTransfers: !state.hideInternalTransfers })),
            
            editingTransaction: null,
            setEditingTransaction: (tx) => set({ editingTransaction: tx }),

            filters: {
                month: now.getMonth(),
                year: now.getFullYear(),
                accountId: null,
                categoryId: null,
            },

            setFilters: (newFilters) => set((state) => ({
                filters: { ...state.filters, ...newFilters }
            })),

            resetFilters: () => set({
                filters: {
                    month: now.getMonth(),
                    year: now.getFullYear(),
                    accountId: null,
                    categoryId: null,
                }
            }),
        }),
        {
            name: 'finance-storage',
            partialize: (state) => ({
                showArchived: state.showArchived,
                hideInternalTransfers: state.hideInternalTransfers,
                filters: state.filters
            }),
        }
    )
);
