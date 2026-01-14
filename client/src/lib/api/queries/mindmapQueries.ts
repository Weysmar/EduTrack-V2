import { client } from '../client';

export const mindmapQueries = {
    generate: async (data: {
        noteIds?: string[];
        name?: string;
        apiKey?: string;
        model?: string;
    }) => {
        const response = await client.post('/mindmaps/generate', data);
        return response.data;
    },

    getAll: async () => {
        const response = await client.get('/mindmaps');
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await client.get(`/mindmaps/${id}`);
        return response.data;
    },

    update: async (id: string, data: { name?: string; description?: string; content?: string }) => {
        const response = await client.patch(`/mindmaps/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await client.delete(`/mindmaps/${id}`);
        return response.data;
    }
};
