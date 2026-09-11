/**
 * Service for managing deadline notifications & exam reminders in EduTrack PWA.
 * Dispatches native push/local notifications 24 hours (J-1) and 2 hours (H-2)
 * before a task, homework, or exam deadline.
 */

const STORAGE_NOTIFIED_KEY = 'edutrack_notified_deadlines_v1'
const SETTINGS_KEY = 'edutrack_notifications_enabled'

export interface DeadlineTask {
    id: string | number
    title?: string
    description?: string
    dueDate?: string | Date
    date?: string
    dueTime?: string
    isCompleted?: boolean
    course?: {
        title?: string
        code?: string
    }
}

/**
 * Checks if notifications are supported in the current environment.
 */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Retrieves the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) return 'denied'
    return Notification.permission
}

/**
 * Requests native notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) return 'denied'
    try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
            setNotificationSetting(true)
        }
        return permission
    } catch {
        return 'denied'
    }
}

/**
 * Checks if notifications are enabled in user settings.
 */
export function isNotificationEnabled(): boolean {
    if (typeof localStorage === 'undefined') return false
    const val = localStorage.getItem(SETTINGS_KEY)
    return val === null ? true : val === 'true' // enabled by default if permission granted
}

/**
 * Sets notification preference in user settings.
 */
export function setNotificationSetting(enabled: boolean): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_KEY, String(enabled))
    }
}

/**
 * Sends a native notification using Service Worker or Notification API.
 */
export async function sendNativeNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return false
    }

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready
            if (registration && registration.showNotification) {
                await registration.showNotification(title, {
                    icon: '/app-icon.png',
                    badge: '/app-icon.png',
                    vibrate: [200, 100, 200],
                    ...options
                })
                return true
            }
        }

        // Fallback to standard window Notification
        new Notification(title, {
            icon: '/app-icon.png',
            ...options
        })
        return true
    } catch (err) {
        console.warn("Failed to dispatch notification:", err)
        return false
    }
}

/**
 * Evaluates pending tasks and dispatches reminders for J-1 (24h) and H-2 (2h).
 */
export async function checkAndDispatchDeadlineReminders(tasks: DeadlineTask[]): Promise<number> {
    if (!isNotificationSupported() || Notification.permission !== 'granted' || !isNotificationEnabled()) {
        return 0
    }

    const notifiedMap: Record<string, boolean> = (() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_NOTIFIED_KEY) || '{}')
        } catch {
            return {}
        }
    })()

    const now = Date.now()
    let sentCount = 0

    for (const task of tasks) {
        if (task.isCompleted) continue

        // Parse task date/time
        let targetTimestamp: number | null = null
        if (task.dueDate) {
            targetTimestamp = new Date(task.dueDate).getTime()
        } else if (task.date) {
            const timeStr = task.dueTime || '23:59'
            targetTimestamp = new Date(`${task.date}T${timeStr}:00`).getTime()
        }

        if (!targetTimestamp || isNaN(targetTimestamp)) continue

        const diffHours = (targetTimestamp - now) / (1000 * 60 * 60)
        const taskTitle = task.description || task.title || 'Échéance académique'
        const coursePrefix = task.course?.title ? `[${task.course.title}] ` : ''

        // 1. Reminder H-2 (Between 0.2h and 2.5h remaining)
        const keyH2 = `h2_${task.id}_${Math.floor(targetTimestamp / 100000)}`
        if (diffHours > 0.1 && diffHours <= 2.5 && !notifiedMap[keyH2]) {
            const sent = await sendNativeNotification(`⏰ Échéance dans 2h !`, {
                body: `${coursePrefix}${taskTitle}\nIl est temps de finaliser votre travail.`,
                tag: keyH2,
                data: { taskId: task.id }
            })
            if (sent) {
                notifiedMap[keyH2] = true
                sentCount++
            }
        }

        // 2. Reminder J-1 (Between 20h and 26h remaining)
        const keyJ1 = `j1_${task.id}_${Math.floor(targetTimestamp / 100000)}`
        if (diffHours > 20 && diffHours <= 26 && !notifiedMap[keyJ1]) {
            const sent = await sendNativeNotification(`📅 Rappel J-1 : Échéance demain`, {
                body: `${coursePrefix}${taskTitle}\nÀ rendre demain. Pensez à vos révisions !`,
                tag: keyJ1,
                data: { taskId: task.id }
            })
            if (sent) {
                notifiedMap[keyJ1] = true
                sentCount++
            }
        }
    }

    if (sentCount > 0) {
        try {
            localStorage.setItem(STORAGE_NOTIFIED_KEY, JSON.stringify(notifiedMap))
        } catch (e) {
            console.warn("Storage full for notification keys", e)
        }
    }

    return sentCount
}
