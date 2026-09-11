import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'edutrack_pwa_banner_dismissed_until'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

export function usePWAInstall() {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isDismissed, setIsDismissed] = useState(true)

    useEffect(() => {
        // 1. Check if app is running in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://')

        setIsInstalled(isStandalone)

        // 2. Check dismissal cooldown (7 days)
        const dismissedUntil = localStorage.getItem(DISMISSED_KEY)
        const now = Date.now()
        if (dismissedUntil && now < Number(dismissedUntil)) {
            setIsDismissed(true)
        } else {
            setIsDismissed(false)
        }

        // 3. Listen for native browser install prompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPromptEvent(e as BeforeInstallPromptEvent)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setInstallPromptEvent(null)
            setIsDismissed(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const promptInstall = async (): Promise<boolean> => {
        if (!installPromptEvent) return false
        try {
            await installPromptEvent.prompt()
            const choiceResult = await installPromptEvent.userChoice
            if (choiceResult.outcome === 'accepted') {
                setIsInstalled(true)
                setInstallPromptEvent(null)
                return true
            }
            return false
        } catch (err) {
            console.warn('Install prompt error:', err)
            return false
        }
    }

    const dismissBanner = (days: number = 7) => {
        setIsDismissed(true)
        const cooldown = Date.now() + days * 24 * 60 * 60 * 1000
        localStorage.setItem(DISMISSED_KEY, String(cooldown))
    }

    return {
        isInstallable: !!installPromptEvent && !isInstalled,
        isInstalled,
        isDismissed,
        promptInstall,
        dismissBanner
    }
}
