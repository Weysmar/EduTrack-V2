import { describe, it, expect } from 'vitest'
import { toAIError, isAbortError, getAIErrorMessage } from './errors'

const axiosError = (status: number | undefined, data?: any, extra: Record<string, any> = {}) => ({
    isAxiosError: true,
    message: status ? `Request failed with status code ${status}` : 'Network Error',
    response: status ? { status, data } : undefined,
    ...extra,
})

describe('toAIError', () => {
    it('formats the EduTrack daily limit (429) with the reset time, not "Rate limit exceeded"', () => {
        const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        const err = toAIError(axiosError(429, { error: 'Rate limit exceeded', message: 'Vous avez atteint…', limit: 100, current: 100, resetAt }), { lang: 'fr' })
        expect(err.code).toBe('rate_limit')
        expect(err.message).toMatch(/^Limite quotidienne atteinte \(100\/100\) — réinitialisation (demain )?à \d{2}:\d{2}\.$/)
        expect(err.message).not.toContain('Rate limit exceeded')
    })

    it('maps a provider 429 (no resetAt) to a provider quota message', () => {
        const err = toAIError(axiosError(429, { message: 'Too Many Requests' }), { provider: 'google', lang: 'fr' })
        expect(err.code).toBe('provider_quota')
        expect(err.message).toContain('Google Gemini')
    })

    it('maps axios timeouts and network errors to actionable messages', () => {
        expect(toAIError({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 300000ms exceeded' }).code).toBe('timeout')
        expect(toAIError(axiosError(undefined, undefined, { code: 'ERR_NETWORK' })).code).toBe('network')
    })

    it('prefers the French server message over the technical error field', () => {
        const msg = getAIErrorMessage(axiosError(400, { message: 'Le texte/prompt est requis.', error: 'Bad Request' }))
        expect(msg).toBe('Le texte/prompt est requis.')
    })

    it('does not surface the generic English "Generation failed" message', () => {
        const err = toAIError(axiosError(500, { message: 'Generation failed', error: 'something odd happened' }), { lang: 'fr' })
        expect(err.message).toBe('Échec de la génération : something odd happened')
    })

    it('detects invalid keys from provider details', () => {
        const err = toAIError(axiosError(500, { message: 'Generation failed', error: '[GoogleGenerativeAI Error]: API key not valid. Please pass a valid API key.' }), { provider: 'google' })
        expect(err.code).toBe('invalid_key')
    })

    it('recognises cancellations', () => {
        expect(isAbortError({ name: 'CanceledError', code: 'ERR_CANCELED' })).toBe(true)
        expect(toAIError({ code: 'ERR_CANCELED', name: 'CanceledError', message: 'canceled' }).code).toBe('aborted')
        expect(isAbortError(new Error('boom'))).toBe(false)
    })

    it('uses English when requested', () => {
        const err = toAIError(axiosError(undefined, undefined, { code: 'ERR_NETWORK' }), { lang: 'en' })
        expect(err.message).toMatch(/^Can't reach the server/)
    })
})
