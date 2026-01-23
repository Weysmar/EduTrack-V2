import { apiClient } from './client';

export const financeApi = {
    // Enrich a single transaction (description, amount)
    enrichToken: async (token: string, description: string, amount: number) => {
        // We pass data in body. Token is handled by interceptor ideally, but here explicit if needed?
        // Interceptor handles it.
        const response = await apiClient.post('/finance/transactions/enrich', { description, amount });
        return response.data;
    },

    // Or simpler signature relying on interceptor
    enrich: async (description: string, amount: number) => {
        const response = await apiClient.post('/finance/transactions/1/enrich', { description, amount });
        // Note: Backend route is /transactions/:id/enrich, but controller now ignores ID and uses body.
        // We pass a dummy ID '1' to satisfy the router pattern if necessary, or better, change route to generic.
        // My backend route definition was: router.post('/transactions/:id/enrich', ...)
        // So I must provide an ID in URL, even if ignored.
        return response.data;
    },

    audit: async (transactions: any[]) => {
        const response = await apiClient.post('/finance/audit', { transactions });
        return response.data;
    }
};
