import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

    useEffect(() => {
        let hasBeenOffline = false

        const handleOnline = () => {
            setIsOnline(true)
            if (hasBeenOffline) {
                toast.success("Connexion rétablie !", {
                    description: "Vos données et cours sont de nouveau synchronisés en temps réel.",
                    duration: 4000
                })
            }
        }

        const handleOffline = () => {
            hasBeenOffline = true
            setIsOnline(false)
            toast.warning("Mode Hors-Ligne activé", {
                description: "Vous êtes actuellement déconnecté. Vos cours enregistrés restent accessibles.",
                duration: 5000
            })
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return {
        isOnline,
        isOffline: !isOnline
    }
}
