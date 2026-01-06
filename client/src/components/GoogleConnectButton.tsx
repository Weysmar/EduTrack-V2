import React, { useState } from 'react'
import { Calendar, Check } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'

export function GoogleConnectButton() {
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
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg cursor-default">
                <Check className="h-5 w-5" />
                Connected
            </button>
        )
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border shadow-sm hover:shadow hover:bg-gray-50 rounded-lg transition-all text-sm text-gray-700 font-medium"
        >
            <Calendar className="h-5 w-5 text-blue-500" />
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
        </button>
    )
}
