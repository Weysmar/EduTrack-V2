import { prisma } from '../lib/prisma';
import { getApiKey, getFinanceApiKey, getStoredProviderKey, validateApiKey } from './apiKeyService';

jest.mock('../lib/prisma', () => ({
    prisma: { profile: { findUnique: jest.fn() } },
}));

const findUnique = prisma.profile.findUnique as unknown as jest.Mock;
const withSettings = (settings: Record<string, unknown> | null) => findUnique.mockResolvedValue({ settings });

const GEMINI_KEY = 'AIzaSyA-0123456789abcdefghijklmnopqrstu';
const OLD_GEMINI_KEY = 'AIzaSyB-old-0123456789abcdefghijklmnop';
const PPLX_KEY = 'pplx-0123456789abcdef';
const CLAUDE_KEY = 'sk-ant-api03-0123456789abcdefghijklmnop';

describe('apiKeyService — one key slot per provider', () => {
    const envBackup = { ...process.env };

    beforeEach(() => {
        delete process.env.GEMINI_API_KEY;
        delete process.env.PERPLEXITY_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
    });

    afterAll(() => {
        process.env = envBackup;
    });

    it('validates the key format of each provider', () => {
        expect(validateApiKey(CLAUDE_KEY, 'anthropic')).toBe(true);
        expect(validateApiKey('sk-ant-short', 'anthropic')).toBe(false);
        expect(validateApiKey(GEMINI_KEY, 'google')).toBe(true);
        expect(validateApiKey(PPLX_KEY, 'perplexity')).toBe(true);
        expect(validateApiKey('   ', 'google')).toBe(false);
    });

    it('prefers the single slot over the legacy per-purpose slots', () => {
        const settings = { google_gemini_api_key: GEMINI_KEY, google_gemini_summaries: OLD_GEMINI_KEY };
        expect(getStoredProviderKey(settings, 'google')).toBe(GEMINI_KEY);
    });

    it('still reads legacy slots for accounts that never re-saved their settings', () => {
        expect(getStoredProviderKey({ google_gemini_exercises: OLD_GEMINI_KEY }, 'google')).toBe(OLD_GEMINI_KEY);
        expect(getStoredProviderKey({ perplexity_summaries: PPLX_KEY }, 'perplexity')).toBe(PPLX_KEY);
        expect(getStoredProviderKey({ google_gemini_summaries: OLD_GEMINI_KEY }, 'anthropic')).toBeNull();
    });

    it('returns the stored Claude key with the default Claude model', async () => {
        withSettings({ anthropic_api_key: CLAUDE_KEY });
        await expect(getApiKey('profile-1', 'anthropic')).resolves.toEqual({
            provider: 'anthropic',
            apiKey: CLAUDE_KEY,
            model: 'claude-sonnet-5-5',
            source: 'profile_settings',
        });
    });

    it('uses a valid key sent with the request first, then the environment', async () => {
        withSettings({ anthropic_api_key: CLAUDE_KEY });
        const fromRequest = await getApiKey('profile-1', 'anthropic', { requestApiKey: ` ${CLAUDE_KEY}x ` });
        expect(fromRequest).toMatchObject({ apiKey: `${CLAUDE_KEY}x`, source: 'request' });

        withSettings(null);
        process.env.ANTHROPIC_API_KEY = CLAUDE_KEY;
        await expect(getApiKey('profile-1', 'anthropic')).resolves.toMatchObject({ source: 'environment' });
    });

    it('fails with a clear message when no key exists', async () => {
        withSettings({});
        await expect(getApiKey('profile-1', 'anthropic')).rejects.toThrow(/Claude/);
    });

    it('falls back to another configured provider for finance and keeps the model consistent', async () => {
        // Finance set to Gemini with a Gemini model, but only a Claude key is configured
        withSettings({ finance_audit_provider: 'google', finance_audit_model: 'gemini-3.8-flash', anthropic_api_key: CLAUDE_KEY });
        await expect(getFinanceApiKey('profile-1')).resolves.toMatchObject({
            provider: 'anthropic',
            model: 'claude-sonnet-5-5',
        });
    });

    it('uses the finance model chosen in the settings when it matches the provider', async () => {
        withSettings({ finance_audit_provider: 'anthropic', finance_audit_model: 'claude-haiku-5-5', anthropic_api_key: CLAUDE_KEY });
        await expect(getFinanceApiKey('profile-1')).resolves.toMatchObject({
            provider: 'anthropic',
            model: 'claude-haiku-5-5',
        });
    });
});
