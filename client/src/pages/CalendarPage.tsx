import React from 'react'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useCalendarStore } from '@/store/calendarStore'
import { useProfileStore } from '@/store/profileStore'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { Calendar } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

export function CalendarPage() {
    const { isConnected: storeConnected, icalUrl: storeUrl } = useCalendarStore()
    const { apiKeys } = useProfileStore()
    const { language } = useLanguage()

    const isConnected = !!(apiKeys.google_calendar || storeConnected || storeUrl)

    return (
        <div className="h-full flex flex-col space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    <span>{language === 'fr' ? 'Mon Agenda' : 'My Calendar'}</span>
                </h1>
                <div className="flex items-center gap-2">
                    <GoogleConnectButton />
                </div>
            </header>

            <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden h-full min-h-[600px]">
                <div className="h-full w-full">
                    <CalendarWidget />
                </div>
            </div>
        </div>
    )
}
