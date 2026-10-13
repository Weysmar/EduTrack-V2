import { describe, it, expect } from 'vitest'
import {
    AI_MODELS,
    AI_PROVIDERS,
    DEFAULT_MODELS,
    PROVIDER_LABELS,
    checkContextFit,
    detectProvider,
    getDefaultModel,
    getModelsForProvider,
    normalizeModelId,
} from './aiModels'
import { resolveDefaultProvider } from '@/hooks/useAIProvider'

describe('client AI model registry', () => {
    it('has unique model ids', () => {
        const ids = AI_MODELS.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it.each(AI_PROVIDERS)('offers selectable models, a label and a recommended default for %s', provider => {
        expect(PROVIDER_LABELS[provider]).toBeTruthy()
        const models = getModelsForProvider(provider)
        expect(models.length).toBeGreaterThan(0)
        expect(models.every(m => detectProvider(m.id) === provider)).toBe(true)
        expect(getDefaultModel(provider)).toBe(DEFAULT_MODELS[provider])
        expect(models.map(m => m.id)).toContain(getDefaultModel(provider))
    })

    it('offers the three Claude models with Sonnet by default', () => {
        expect(getModelsForProvider('anthropic').map(m => m.id)).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'])
        expect(getDefaultModel('anthropic')).toBe('claude-sonnet-5-5')
    })

    it('flags Gemini 3.1 Pro as a preview model', () => {
        expect(AI_MODELS.find(m => m.id === 'gemini-3.1-pro-preview')?.preview).toBe(true)
        expect(AI_MODELS.find(m => m.id === 'gemini-3.5-flash-lite')?.preview).toBeFalsy()
    })

    it('maps deprecated saved ids to current models', () => {
        expect(normalizeModelId('gemini-3.7-flash')).toBe('gemini-3.8-flash')
        expect(normalizeModelId('claude-opus-5-5')).toBe('claude-opus-5-5')
        expect(normalizeModelId(null)).toBeUndefined()
    })

    it('uses the Claude tokenizer ratio for the context warning', () => {
        const chars = 2_500_000
        expect(checkContextFit(chars, 'gemini-3.8-flash').fits).toBe(true)
        expect(checkContextFit(chars, 'claude-sonnet-5-5').fits).toBe(false)
    })

    it('picks a default provider from the configured keys', () => {
        expect(resolveDefaultProvider({ anthropic: 'sk-ant' })).toBe('anthropic')
        expect(resolveDefaultProvider({ google: 'AIza', anthropic: 'sk-ant' })).toBe('google')
        expect(resolveDefaultProvider({})).toBe('perplexity')
        expect(resolveDefaultProvider({ google: 'AIza' }, 'anthropic')).toBe('anthropic')
    })
})
