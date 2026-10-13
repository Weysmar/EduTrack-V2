import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from './client'

// Adapter answering 401 to every request, to exercise the response interceptor
const unauthorizedAdapter = async (config: any) => {
    const error: any = new Error('Request failed with status code 401')
    error.config = config
    error.response = { status: 401, data: { message: 'Authentication required' }, config }
    throw error
}

describe('apiClient 401 handling', () => {
    let hrefSetter: ReturnType<typeof vi.fn>

    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        hrefSetter = vi.fn()
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                pathname: '/',
                get href() { return 'http://localhost/' },
                set href(value: string) { hrefSetter(value) },
            },
        })
    })

    it('does not redirect on a 401 for a request sent without token (no reload loop on the login page)', async () => {
        await expect(apiClient.get('/study-plans/tasks', { adapter: unauthorizedAdapter })).rejects.toBeTruthy()
        expect(hrefSetter).not.toHaveBeenCalled()
    })

    it('does not redirect from a public page even when the session token is rejected', async () => {
        localStorage.setItem('jwt_token', 'expired-token')
        await expect(apiClient.get('/auth/me', { adapter: unauthorizedAdapter })).rejects.toBeTruthy()
        expect(localStorage.getItem('jwt_token')).toBeNull()
        expect(hrefSetter).not.toHaveBeenCalled()
    })
})
