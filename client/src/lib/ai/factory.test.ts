import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AIServiceFactory } from './factory'
import { apiClient } from '@/lib/api/client'
import { useProfileStore } from '@/store/profileStore'
import { DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'

describe('AIServiceFactory routing', () => {
    let post: ReturnType<typeof vi.spyOn>

    afterEach(() => {
        vi.restoreAllMocks()
    })

    beforeEach(() => {
        post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { text: 'réponse' } } as any)
        useProfileStore.setState({
            activeProfile: null,
            apiKeys: {
                ...useProfileStore.getState().apiKeys,
                google_gemini_api_key: null,
                perplexity_api_key: null,
                anthropic_api_key: 'sk-ant-test',
            },
        })
    })

    it('sends Claude requests through the backend with the single Claude key', async () => {
        await expect(AIServiceFactory.generateGeneric('Bonjour', 'system', 'anthropic')).resolves.toBe('réponse')
        expect(post).toHaveBeenCalledWith('/ai/generate', expect.objectContaining({
            provider: 'anthropic',
            model: 'claude-sonnet-5-5',
            apiKey: 'sk-ant-test',
            prompt: 'Bonjour',
        }), expect.anything())
    })

    it('builds Claude summaries with the shared academic prompt and the chosen model', async () => {
        await AIServiceFactory.generateSummary('Texte du cours', {
            ...DEFAULT_SUMMARY_OPTIONS,
            provider: 'anthropic',
            model: 'claude-haiku-5-5',
        })
        const body = post.mock.calls[0][1] as any
        expect(body.provider).toBe('anthropic')
        expect(body.model).toBe('claude-haiku-5-5')
        expect(body.systemPrompt).toMatch(/expert en synthèse académique/)
    })

    it('falls back to a legacy Gemini slot still present in the profile settings', async () => {
        useProfileStore.setState({ activeProfile: { id: 'p1', name: 'Test', theme: 'light', language: 'fr', settings: { google_gemini_exercises: 'AIza-legacy' } } })
        await AIServiceFactory.generateGeneric('Bonjour', 'system', 'google')
        expect((post.mock.calls[0][1] as any).apiKey).toBe('AIza-legacy')
    })

    it('reports a missing key without calling the backend', async () => {
        await expect(AIServiceFactory.generateGeneric('Bonjour', 'system', 'perplexity')).rejects.toMatchObject({ code: 'missing_key' })
        expect(post).not.toHaveBeenCalled()
    })
})
