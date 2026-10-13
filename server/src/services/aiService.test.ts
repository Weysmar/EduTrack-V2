import { aiService, callAnthropic, parseLooseJSON } from './aiService';

const jsonResponse = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
});

describe('Anthropic (Claude) provider', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('calls the Messages API with the key, model and system prompt, and returns only text blocks', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, {
            content: [
                { type: 'thinking', thinking: 'internal reasoning' },
                { type: 'text', text: 'Bonjour ' },
                { type: 'text', text: 'le monde' },
            ],
            stop_reason: 'end_turn',
        }));

        const text = await aiService.generateText('Salut', 'Sois bref', 'claude-sonnet', 'sk-ant-test-key-0123456789abcdef', 'anthropic');

        expect(text).toBe('Bonjour le monde');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(init.headers['x-api-key']).toBe('sk-ant-test-key-0123456789abcdef');
        expect(init.headers['anthropic-version']).toBe('2023-06-01');
        const body = JSON.parse(init.body);
        expect(body.model).toBe('claude-sonnet-5-5'); // alias resolved by the registry
        expect(body.system).toBe('Sois bref');
        expect(body.messages).toEqual([{ role: 'user', content: 'Salut' }]);
        expect(body.max_tokens).toBeGreaterThan(0);
    });

    it('retries when Claude is overloaded (529)', async () => {
        jest.useFakeTimers();
        fetchMock
            .mockResolvedValueOnce(jsonResponse(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }))
            .mockResolvedValueOnce(jsonResponse(200, { content: [{ type: 'text', text: 'ok' }] }));

        const promise = callAnthropic('sk-ant-key', 'claude-haiku-5-5', undefined, 'ping');
        await jest.advanceTimersByTimeAsync(2000);

        await expect(promise).resolves.toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).system).toBeUndefined();
    });

    it('does not retry an invalid key and returns an actionable French message', async () => {
        fetchMock.mockResolvedValue(jsonResponse(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }));

        await expect(aiService.generateText('x', undefined, 'claude-sonnet-5-5', 'sk-ant-bad', 'anthropic'))
            .rejects.toThrow(/Clé API invalide/);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('explains an empty Anthropic credit balance', async () => {
        fetchMock.mockResolvedValue(jsonResponse(400, {
            type: 'error',
            error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' },
        }));

        await expect(aiService.generateText('x', undefined, 'claude-sonnet-5-5', 'sk-ant-key', 'anthropic'))
            .rejects.toThrow(/Crédit Anthropic insuffisant/);
    });

    it('requires an API key', async () => {
        await expect(aiService.generateText('x', undefined, 'claude-sonnet-5-5', undefined, 'anthropic'))
            .rejects.toThrow(/Anthropic/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('parses JSON answers wrapped in a Markdown fence', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, {
            content: [{ type: 'text', text: 'Voici le plan :\n```json\n{"program": {"totalHours": 12}}\n```' }],
        }));

        const plan = await aiService.generateJSON('plan', 'coach', 'claude-sonnet-5-5', 'sk-ant-key', 'anthropic');
        expect(plan).toEqual({ program: { totalHours: 12 } });
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).system).toMatch(/strictly valid JSON/);
    });
});

describe('parseLooseJSON', () => {
    it('parses plain, fenced and surrounded JSON', () => {
        expect(parseLooseJSON('{"a":1}')).toEqual({ a: 1 });
        expect(parseLooseJSON('```json\n[1,2]\n```')).toEqual([1, 2]);
        expect(parseLooseJSON('Résultat : {"1": "Transport"} merci')).toEqual({ 1: 'Transport' });
    });

    it('throws when there is no JSON at all', () => {
        expect(() => parseLooseJSON('pas de json ici')).toThrow();
    });
});
