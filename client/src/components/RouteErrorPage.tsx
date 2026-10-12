import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

/**
 * Route-level error screen. Without an errorElement, any render error replaced the whole app
 * (sidebar included) with React Router's default English screen; the root ErrorBoundary never saw it.
 */
export function RouteErrorPage() {
    const error = useRouteError()
    const navigate = useNavigate()
    const { t } = useLanguage()

    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error ? error.message : String(error ?? '')

    // A stale chunk after a deployment: reloading fetches the new bundle
    const isChunkError = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message)

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertTriangle className="h-7 w-7" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold">
                    {isChunkError ? t('error.page.updateTitle') : t('error.page.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isChunkError ? t('error.page.updateBody') : t('error.page.body')}
                </p>
                {!isChunkError && message && (
                    <pre className="text-xs text-left bg-muted rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                        {message}
                    </pre>
                )}
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 min-h-[44px]"
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        {t('error.page.reload')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/edu/dashboard')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border bg-background hover:bg-muted font-medium min-h-[44px]"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        {t('error.page.home')}
                    </button>
                </div>
            </div>
        </div>
    )
}
