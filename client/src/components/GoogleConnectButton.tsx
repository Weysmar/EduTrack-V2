import React, { useState } from 'react'
import { Calendar, Check } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import { useLanguage } from '@/components/language-provider'

export function GoogleConnectButton() {
    const { t } = useLanguage()
    const { isConnected, setUrl } = useCalendarStore()
    const [isLoading, setIsLoading] = useState(false)

    const handleConnect = async () => {
        setIsLoading(true)
        // Simulate connection flow or implement real OAuth
        setTimeout(() => {
            setUrl('https://calendar.google.com/calendar/ical/example.ics')
            setIsLoading(false)
        }, 1000)
    }

    if (isConnected) {
        return (
            <button disabled className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500 rounded-full cursor-default text-sm font-medium transition-colors">
                <Check className="h-3.5 w-3.5" />
                {t('calendar.connected')}
            </button>
        )
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-transparent shadow-sm hover:shadow hover:bg-muted/80 rounded-full transition-all text-sm text-muted-foreground hover:text-foreground font-medium"
        >
            <Calendar className="h-4 w-4" />
            {isLoading ? t('calendar.connecting') : t('calendar.connect')}
        </button>
    )
}
}
