/**
 * errors.ts — Normalisation des erreurs de génération IA en messages actionnables.
 *
 * - HTTP 429 de notre serveur (aiRateLimit) → "Limite quotidienne atteinte (100/100) — réinitialisation à HH:MM"
 * - Quota du fournisseur, clé invalide, surcharge, timeout, réseau → messages explicites
 * - Annulation (AbortController) → code 'aborted' (à ne pas afficher comme une erreur)
 * - Sinon : on préfère `data.message` (français côté serveur) à `data.error` (souvent technique / anglais)
 */

import axios from 'axios'
import { aiMessage, getUILanguage, type UILanguage } from './messages'
import { AI_DAILY_LIMIT, providerLabel } from './constants'

export type AIErrorCode =
    | 'aborted'
    | 'rate_limit'
    | 'provider_quota'
    | 'timeout'
    | 'network'
    | 'missing_key'
    | 'invalid_key'
    | 'overloaded'
    | 'context_too_long'
    | 'model_not_found'
    | 'invalid_response'
    | 'server'
    | 'unknown'

export class AIRequestError extends Error {
    readonly code: AIErrorCode
    readonly status?: number
    readonly resetAt?: string

    constructor(message: string, code: AIErrorCode, opts: { status?: number; resetAt?: string } = {}) {
        super(message)
        this.name = 'AIRequestError'
        this.code = code
        this.status = opts.status
        this.resetAt = opts.resetAt
    }
}

interface ErrorContext {
    provider?: 'google' | 'perplexity' | 'anthropic' | string | null
    lang?: UILanguage
}

/** Vrai si l'erreur provient d'une annulation volontaire (AbortController / axios cancel). */
export function isAbortError(error: unknown): boolean {
    if (!error) return false
    if (error instanceof AIRequestError) return error.code === 'aborted'
    if (axios.isCancel(error)) return true
    const e = error as { name?: string; code?: string }
    return e?.name === 'AbortError' || e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED'
}

/** Formate l'heure de réinitialisation (HH:MM) et indique si elle tombe un autre jour. */
export function formatResetTime(resetAt: string | undefined | null, lang: UILanguage = getUILanguage()): { time: string; otherDay: boolean } | null {
    if (!resetAt) return null
    const date = new Date(resetAt)
    if (Number.isNaN(date.getTime())) return null
    const time = date.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })
    return { time, otherDay: date.toDateString() !== new Date().toDateString() }
}

const GENERIC_SERVER_MESSAGES = /^(generation failed|json generation failed|internal server error|rate limit exceeded|unknown error|error|request failed with status code \d+)\.?$/i

const isMeaningful = (s: unknown): s is string =>
    typeof s === 'string' && s.trim().length > 0 && !GENERIC_SERVER_MESSAGES.test(s.trim())

/** Convertit n'importe quelle erreur (axios, Error, string) en AIRequestError avec un message utilisateur. */
export function toAIError(error: unknown, ctx: ErrorContext = {}): AIRequestError {
    if (error instanceof AIRequestError) return error

    const lang = ctx.lang ?? getUILanguage()
    const provider = providerLabel(ctx.provider)
    const msg = (key: string, vars?: Record<string, string | number>) => aiMessage(key, vars, lang)

    if (isAbortError(error)) {
        return new AIRequestError(msg('ai.error.aborted'), 'aborted')
    }

    const e = (error ?? {}) as any
    const status: number | undefined = e?.response?.status
    const data = e?.response?.data
    const dataMessage = typeof data?.message === 'string' ? data.message : ''
    const dataError = typeof data?.error === 'string' ? data.error : ''
    const dataDetails = typeof data?.details === 'string'
        ? data.details
        : data?.details ? safeStringify(data.details) : ''
    const rawMessage = typeof e?.message === 'string' ? e.message : (typeof error === 'string' ? error : '')

    // 1. Limite quotidienne EduTrack (notre middleware) ou quota du fournisseur
    if (status === 429) {
        const isOurLimit = !!data && (data.resetAt !== undefined || data.limit !== undefined)
        if (isOurLimit) {
            const limit = Number(data.limit) || AI_DAILY_LIMIT
            const used = Number(data.current) || limit
            const reset = formatResetTime(data.resetAt, lang)
            const text = !reset
                ? msg('ai.error.rateLimitNoTime', { used, limit })
                : msg(reset.otherDay ? 'ai.error.rateLimitTomorrow' : 'ai.error.rateLimit', { used, limit, time: reset.time })
            return new AIRequestError(text, 'rate_limit', { status, resetAt: data.resetAt })
        }
        return new AIRequestError(msg('ai.error.providerQuota', { provider }), 'provider_quota', { status })
    }

    // 2. Timeout (axios: ECONNABORTED "timeout of 300000ms exceeded")
    if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT' || (!e?.response && /timeout/i.test(rawMessage))) {
        return new AIRequestError(msg('ai.error.timeout'), 'timeout', { status })
    }

    // 3. Réseau (aucune réponse du serveur)
    if (e?.code === 'ERR_NETWORK' || (e?.isAxiosError && !e?.response)) {
        return new AIRequestError(msg('ai.error.network'), 'network')
    }

    // 4. Classification à partir du contenu de l'erreur
    const haystack = [dataMessage, dataError, dataDetails, rawMessage].join(' \n ')

    if (/cl[ée] api manquante|aucune cl[ée] api|missing api key|no api key/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.missingKey', { provider }), 'missing_key', { status })
    }
    if (/quota|resource[_ ]?exhausted|too many requests|rate[_ ]?limit/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.providerQuota', { provider }), 'provider_quota', { status })
    }
    if (/api[_ ]?key[_ ]?(not valid|invalid)|invalid[_ ]api[_ ]?key|incorrect api key|API_KEY_INVALID|permission[_ ]denied|unauthenticated|\b401\b/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.invalidKey', { provider }), 'invalid_key', { status })
    }
    if (/overloaded|service unavailable|\bUNAVAILABLE\b|\b503\b/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.overloaded', { provider }), 'overloaded', { status })
    }
    if (/context[_ ](length|window)|too many tokens|token limit|exceeds the maximum|input (is )?too long|request too large|\b413\b/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.contextTooLong'), 'context_too_long', { status })
    }
    if (/model[^.\n]{0,40}not found|not found[^.\n]{0,40}model|unknown model|invalid model|model[^.\n]{0,20}(is )?not supported/i.test(haystack)) {
        return new AIRequestError(msg('ai.error.modelNotFound', { provider }), 'model_not_found', { status })
    }
    if (error instanceof SyntaxError || /unexpected token|in JSON at position|JSON\.parse|is not valid JSON/i.test(rawMessage)) {
        return new AIRequestError(msg('ai.error.invalidResponse'), 'invalid_response', { status })
    }

    // 5. Message serveur exploitable : `message` (FR) d'abord, puis `error`
    if (e?.response) {
        if (isMeaningful(dataMessage)) return new AIRequestError(dataMessage, 'server', { status })
        if (isMeaningful(dataError)) return new AIRequestError(msg('ai.error.withDetail', { detail: dataError }), 'server', { status })
        return new AIRequestError(msg(status && status >= 500 ? 'ai.error.server' : 'ai.error.generic'), 'server', { status })
    }

    // 6. Erreur locale (ex: "Format JSON invalide reçu de l'IA…")
    if (isMeaningful(rawMessage)) return new AIRequestError(rawMessage, 'unknown')
    return new AIRequestError(msg('ai.error.generic'), 'unknown')
}

/** Raccourci : message utilisateur d'une erreur de génération. */
export function getAIErrorMessage(error: unknown, ctx: ErrorContext = {}): string {
    return toAIError(error, ctx).message
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return ''
    }
}
