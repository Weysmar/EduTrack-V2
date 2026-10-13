import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studyPlanQueries } from '@/lib/api/queries'
import { useAuthStore } from '@/store/authStore'
import { checkAndDispatchDeadlineReminders, isNotificationEnabled, getNotificationPermission } from '@/lib/deadlineNotificationService'

export function useDeadlineReminders() {
    // Mounted in the root layout, i.e. also on the public landing/login page: never call the
    // authenticated API without a session (the 401 used to trigger a redirect → reload loop)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const isEnabled = isAuthenticated && isNotificationEnabled() && getNotificationPermission() === 'granted'

    const { data: tasks = [] } = useQuery({
        queryKey: ['studyTasks', 'all_deadlines'],
        queryFn: () => studyPlanQueries.getTasks(),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 10, // 10 minutes
        refetchInterval: 1000 * 60 * 15 // Check every 15 minutes
    })

    useEffect(() => {
        if (isEnabled && Array.isArray(tasks) && tasks.length > 0) {
            checkAndDispatchDeadlineReminders(tasks).catch(console.warn)
        }
    }, [tasks, isEnabled])
}
