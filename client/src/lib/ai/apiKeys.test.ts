import { describe, it, expect } from 'vitest'
import { clearedLegacyKeyFields, firstProviderWithKey, resolveProviderKey, resolveProviderKeys } from './apiKeys'
import { apiKeysFromSettings } from '@/store/profileStore'

describe('one API key slot per provider', () => {
    it('reads the single slot first, then the legacy per-purpose slots', () => {
        expect(resolveProviderKey('google', { google_gemini_api_key: 'new', google_gemini_summaries: 'old' })).toBe('new')
        expect(resolveProviderKey('google', { google_gemini_exercises: ' old ' })).toBe('old')
        expect(resolveProviderKey('perplexity', { perplexity_summaries: 'pplx-old' })).toBe('pplx-old')
        expect(resolveProviderKey('anthropic', { google_gemini_summaries: 'AIza' })).toBeNull()
    })

    it('prefers a single-slot key from any source over a legacy key', () => {
        const localState = { google_gemini_summaries: 'legacy-local' }
        const profileSettings = { google_gemini_api_key: 'new-on-server' }
        expect(resolveProviderKey('google', localState, profileSettings)).toBe('new-on-server')
    })

    it('ignores empty values and missing sources', () => {
        expect(resolveProviderKey('anthropic', null, undefined, { anthropic_api_key: '   ' })).toBeNull()
        expect(resolveProviderKeys({ anthropic_api_key: 'sk-ant-x' })).toEqual({ google: null, perplexity: null, anthropic: 'sk-ant-x' })
    })

    it('clears every legacy slot on save', () => {
        expect(clearedLegacyKeyFields()).toEqual({
            google_gemini_summaries: null,
            google_gemini_exercises: null,
            google_gemini_categorization: null,
            perplexity_summaries: null,
            perplexity_exercises: null,
        })
    })

    it('picks the first provider that has a key', () => {
        expect(firstProviderWithKey({ google: null, perplexity: null, anthropic: 'k' })).toBe('anthropic')
        expect(firstProviderWithKey({ google: 'g', perplexity: 'p', anthropic: null })).toBe('perplexity')
        expect(firstProviderWithKey({ google: 'g', perplexity: 'p', anthropic: null }, ['google', 'perplexity', 'anthropic'])).toBe('google')
        expect(firstProviderWithKey({ google: null, perplexity: null, anthropic: null })).toBeNull()
    })

    it('migrates legacy profile settings into the single slots when the profile loads', () => {
        const keys = apiKeysFromSettings({
            google_gemini_summaries: 'AIza-old',
            perplexity_exercises: 'pplx-old',
            anthropic_api_key: 'sk-ant-new',
            finance_audit_provider: 'anthropic',
        })
        expect(keys.google_gemini_api_key).toBe('AIza-old')
        expect(keys.perplexity_api_key).toBe('pplx-old')
        expect(keys.anthropic_api_key).toBe('sk-ant-new')
        expect(keys.finance_audit_provider).toBe('anthropic')
        expect((keys as any).google_gemini_summaries).toBeNull()
        expect(apiKeysFromSettings(null).google_gemini_api_key).toBeNull()
    })
})
