import { apiClient } from './client';

export const courseQueries = {
    getAll: async () => {
        const { data } = await apiClient.get('/courses');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/courses/${id}`);
        return data;
    },
    create: async (data: any) => {
        const { data: res } = await apiClient.post('/courses', data);
        return res;
    },
    update: async (id: string, data: any) => {
        const { data: res } = await apiClient.put(`/courses/${id}`, data);
        return res;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/courses/${id}`);
    }
};

export const itemQueries = {
    getByCourse: async (courseId: string) => {
        const { data } = await apiClient.get(`/items?courseId=${courseId}`);
        return data;
    },
    getAll: async () => {
        const { data } = await apiClient.get('/items');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/items/${id}`);
        return data;
    },
    create: async (data: any) => {
        // Handle multipart if file exists
        // This is a simplified version, ideally separate logic for file vs json
        if (data instanceof FormData) {
            const { data: res } = await apiClient.post('/items', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res;
        }
        const { data: res } = await apiClient.post('/items', data);
        return res;
    },
    update: async (id: string, data: any) => {
        // Handle multipart if file exists (same logic as create)
        if (data instanceof FormData) {
            const { data: res } = await apiClient.put(`/items/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res;
        }
        const { data: res } = await apiClient.put(`/items/${id}`, data);
        return res;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/items/${id}`);
    },
    bulkDelete: async (itemIds: string[]) => {
        const { data } = await apiClient.post('/items/bulk/delete', { itemIds });
        return data;
    }
};

export const flashcardQueries = {
    getAll: async () => {
        const { data } = await apiClient.get('/flashcards');
        return data;
    },
    getByCourse: async (courseId: string) => {
        const { data } = await apiClient.get(`/flashcards?courseId=${courseId}`);
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/flashcards/${id}`);
        return data;
    },
    create: async (data: any) => {
        const { data: res } = await apiClient.post('/flashcards', data);
        return res;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/flashcards/${id}`);
    },
    updateProgress: async (id: string, updates: any[]) => {
        const { data } = await apiClient.post(`/flashcards/${id}/study`, { updates });
        return data;
    }
};

export const quizQueries = {
    getAll: async () => {
        const { data } = await apiClient.get('/quizzes');
        return data;
    },
    getByCourse: async (courseId: string) => {
        const { data } = await apiClient.get(`/quizzes?courseId=${courseId}`);
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/quizzes/${id}`);
        return data;
    },
    create: async (data: any) => {
        const { data: res } = await apiClient.post('/quizzes', data);
        return res;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/quizzes/${id}`);
    },
    submit: async (id: string, score: number) => {
        const { data } = await apiClient.post(`/quizzes/${id}/submit`, { score });
        return data;
    }
};

export const folderQueries = {
    getAll: async () => {
        const { data } = await apiClient.get('/folders');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/folders/${id}`);
        return data;
    },
    create: async (data: any) => {
        const { data: res } = await apiClient.post('/folders', data);
        return res;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/folders/${id}`);
    }
};

export const summaryQueries = {
    getOne: async (itemId: string) => {
        const { data } = await apiClient.get(`/summaries?itemId=${itemId}`);
        return data; // Should return { summary: ... } or array? Let's say it returns list and we pick first, or endpoint returns one.
    },
    save: async (data: any) => {
        const { data: res } = await apiClient.post('/summaries', data);
        return res;
    }
};

export const studyPlanQueries = {
    getAll: async (courseId?: string) => {
        const { data } = await apiClient.get(courseId ? `/plans?courseId=${courseId}` : '/plans');
        return data;
    },
    create: async (data: any) => {
        const { data: res } = await apiClient.post('/plans', data);
        return res;
    },
    getByCourse: async (courseId: string) => {
        const { data } = await apiClient.get(`/plans/course/${courseId}`);
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/plans/${id}`);
        return data;
    },
    updateTask: async (taskId: string, data: any) => {
        const { data: res } = await apiClient.put(`/plans/tasks/${taskId}`, data);
        return res;
    },
    generate: async (data: any, apiKey?: string) => {
        const headers: any = {};
        if (apiKey) {
            if (data.provider === 'perplexity') {
                headers['x-perplexity-api-key'] = apiKey;
            } else {
                headers['x-gemini-api-key'] = apiKey;
            }
        }
        const config = { headers };
        const { data: res } = await apiClient.post('/planning/generate', data, config);
        return res;
    }
};

export const analyticsQueries = {
    recordSession: async (data: any) => {
        const { data: res } = await apiClient.post('/analytics/sessions', data);
        return res;
    },
    updateTopicPerformance: async (data: any) => {
        const { data: res } = await apiClient.post('/analytics/topics', data);
        return res;
    },
    updateQuestionPerformance: async (data: any) => {
        const { data: res } = await apiClient.post('/analytics/questions', data);
        return res;
    },
    getWeeklyGoals: async () => {
        const { data } = await apiClient.get('/analytics/goals');
        return data;
    },
    updateWeeklyGoal: async (id: string, data: any) => {
        const { data: res } = await apiClient.put(`/analytics/goals/${id}`, data);
        return res;
    },
    createWeeklyGoal: async (data: any) => {
        const { data: res } = await apiClient.post('/analytics/goals', data);
        return res;
    },
    getAchievements: async () => {
        const { data } = await apiClient.get('/analytics/achievements');
        return data;
    },
    getSessions: async () => {
        const { data } = await apiClient.get('/analytics/sessions');
        return data;
    },
    unlockAchievement: async (data: any) => {
        const { data: res } = await apiClient.post('/analytics/achievements', data);
        return res;
    }
};

export const mindmapQueries = {
    generate: async (data: {
        noteIds?: string[];
        fileItemIds?: string[];
        name?: string;
        apiKey?: string;
        model?: string;
    }) => {
        const { data: res } = await apiClient.post('/mindmaps/generate', data);
        return res;
    },
    getAll: async () => {
        const { data } = await apiClient.get('/mindmaps');
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await apiClient.get(`/mindmaps/${id}`);
        return data;
    },
    update: async (id: string, updateData: { name?: string; description?: string; content?: string }) => {
        const { data } = await apiClient.patch(`/mindmaps/${id}`, updateData);
        return data;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/mindmaps/${id}`);
    }
};
