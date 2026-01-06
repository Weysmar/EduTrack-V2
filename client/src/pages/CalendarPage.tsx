import React from 'react'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useCalendarStore } from '@/store/calendarStore'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { Calendar } from 'lucide-react'

export function CalendarPage() {
    const { isConnected } = useCalendarStore()

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
                <div className="bg-muted rounded-full p-8">
                    <Calendar className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="text-center max-w-md space-y-2">
                    <h1 className="text-2xl font-bold">Connect your Calendar</h1>
                    <p className="text-muted-foreground">
                        Integrate your Google Calendar (iCal) to view your schedule alongside your learning materials.
                    </p>
                </div>
                <GoogleConnectButton />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    My Calendar
                </h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Connected
                    </span>
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
