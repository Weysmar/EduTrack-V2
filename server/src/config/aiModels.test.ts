import {
    AI_MODELS,
    AI_PROVIDERS,
    DEFAULT_MODELS,
    FAST_MODELS,
    checkContextFit,
    detectProvider,
    getFallbackChain,
    isAIProvider,
    modelForProvider,
    resolveModelId,
} from './aiModels';

describe('AI model registry', () => {
    it('has unique ids and aliases that never shadow another model', () => {
        const ids = AI_MODELS.map(m => m.id);
        expect(new Set(ids).size).toBe(ids.length);
        const aliases = AI_MODELS.flatMap(m => m.aliases ?? []);
        expect(new Set(aliases).size).toBe(aliases.length);
        for (const alias of aliases) expect(ids).not.toContain(alias);
    });

    it.each(AI_PROVIDERS)('has a usable default and fast model for %s', provider => {
        for (const id of [DEFAULT_MODELS[provider], FAST_MODELS[provider]]) {
            const entry = AI_MODELS.find(m => m.id === id);
            expect(entry).toBeDefined();
            expect(entry!.provider).toBe(provider);
            expect(entry!.deprecated).toBeFalsy();
            expect(entry!.preview).toBeFalsy();
        }
        expect(AI_MODELS.filter(m => m.provider === provider && m.recommended)).toHaveLength(1);
    });

    it('uses Gemini 3.8 Flash by default and maps deprecated ids', () => {
        expect(DEFAULT_MODELS.google).toBe('gemini-3.8-flash');
        expect(resolveModelId('gemini-3.7-flash')).toBe('gemini-3.8-flash');
        expect(resolveModelId('gemini-3.5-flash')).toBe('gemini-3.6-flash');
        expect(resolveModelId('llama-3.1-sonar-small-128k-online')).toBe('sonar');
        expect(resolveModelId('')).toBe('gemini-3.8-flash');
    });

    it('detects the provider of Claude models, including ids not in the registry', () => {
        expect(detectProvider('claude-sonnet-5-5')).toBe('anthropic');
        expect(detectProvider('claude-some-future-model')).toBe('anthropic');
        expect(detectProvider('sonar-pro')).toBe('perplexity');
        expect(detectProvider('gemini-3.5-flash-lite')).toBe('google');
    });

    it('validates provider names', () => {
        expect(isAIProvider('anthropic')).toBe(true);
        expect(isAIProvider('openai')).toBe(false);
        expect(isAIProvider(undefined)).toBe(false);
    });

    it('keeps fallback chains within the provider and never falls back to a preview model', () => {
        const chain = getFallbackChain('gemini-3.8-flash');
        expect(chain[0]).toBe('gemini-3.8-flash');
        expect(chain).not.toContain('gemini-3.1-pro-preview');
        expect(chain.every(id => detectProvider(id) === 'google')).toBe(true);

        // A preview model can still be the requested (primary) model
        expect(getFallbackChain('gemini-3.1-pro-preview')[0]).toBe('gemini-3.1-pro-preview');

        const claudeChain = getFallbackChain('claude-haiku-5-5');
        expect(claudeChain[0]).toBe('claude-haiku-5-5');
        expect(claudeChain.every(id => detectProvider(id) === 'anthropic')).toBe(true);
    });

    it('only keeps a requested model when it belongs to the provider', () => {
        expect(modelForProvider('anthropic', 'claude-opus-5-5')).toBe('claude-opus-5-5');
        expect(modelForProvider('anthropic', 'gemini-3.8-flash')).toBe('claude-sonnet-5-5');
        expect(modelForProvider('google', 'gemini-3.7-flash')).toBe('gemini-3.8-flash');
        expect(modelForProvider('perplexity', undefined)).toBe('sonar-pro');
    });

    it('estimates Claude context with its denser tokenizer', () => {
        const chars = 2_500_000; // usable window = 85% of 1M tokens (15% kept for the answer)
        expect(checkContextFit(chars, 'gemini-3.8-flash').fits).toBe(true);   // ~714k tokens at 3.5 chars/token
        expect(checkContextFit(chars, 'claude-sonnet-5-5').fits).toBe(false); // ~1M tokens at 2.5 chars/token
    });
});
