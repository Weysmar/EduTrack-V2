
import { apiClient } from '../client';

export const mindmapQueries = {
    generate: async (data: {
        noteIds?: string[];
        fileItemIds?: string[]; // Added
        name?: string;
        apiKey?: string;
        model?: string;
    }) => {
        const response = await apiClient.post('/mindmaps/generate', data);
        return response.data;
    },

    getAll: async () => {
        const response = await apiClient.get('/mindmaps');
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await apiClient.get(`/mindmaps/${id}`);
        return response.data;
    },

    update: async (id: string, data: { name?: string; description?: string; content?: string }) => {
        const response = await apiClient.patch(`/mindmaps/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/mindmaps/${id}`);
        return response.data;
    }
};
