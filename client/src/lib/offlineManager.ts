/**
 * Offline Storage Manager for EduTrack using IndexedDB.
 * Allows storing full courses, items (notes, exercises, resources), and tasks
 * locally so students can study without internet connection.
 */

const DB_NAME = 'edutrack_offline_db'
const DB_VERSION = 1

export interface OfflineCourseData {
    id: string | number
    title: string
    code?: string
    color: string
    icon?: string
    description?: string
    savedAt: string
    itemsCount: number
    items: any[]
    tasks?: any[]
    folders?: any[]
}

export interface OfflineItemData {
    id: string | number
    courseId: string | number
    type: string
    title: string
    content?: string
    extractedContent?: string
    updatedAt?: string | Date
    savedAt: string
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            return reject(new Error("IndexedDB non supporté par ce navigateur."))
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result

            if (!db.objectStoreNames.contains('courses')) {
                db.createObjectStore('courses', { keyPath: 'id' })
            }

            if (!db.objectStoreNames.contains('items')) {
                const itemStore = db.createObjectStore('items', { keyPath: 'id' })
                itemStore.createIndex('courseId', 'courseId', { unique: false })
            }

            if (!db.objectStoreNames.contains('tasks')) {
                const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
                taskStore.createIndex('courseId', 'courseId', { unique: false })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Saves or updates a full course, including its items and tasks, for offline access.
 */
export async function saveCourseForOffline(
    course: any,
    items: any[] = [],
    tasks: any[] = []
): Promise<void> {
    const db = await openDB()
    const courseId = String(course.id)
    const now = new Date().toISOString()

    return new Promise((resolve, reject) => {
        const tx = db.transaction(['courses', 'items', 'tasks'], 'readwrite')
        const courseStore = tx.objectStore('courses')
        const itemStore = tx.objectStore('items')
        const taskStore = tx.objectStore('tasks')

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)

        // 1. Save Course Record
        const courseRecord: OfflineCourseData = {
            id: courseId,
            title: course.title || 'Cours sans titre',
            code: course.code,
            color: course.color || '#3b82f6',
            icon: course.icon,
            description: course.description,
            savedAt: now,
            itemsCount: items.length,
            items: items.map(item => ({
                id: String(item.id),
                courseId,
                title: item.title,
                type: item.type,
                updatedAt: item.updatedAt
            })),
            tasks
        }
        courseStore.put(courseRecord)

        // 2. Save Full Items
        items.forEach(item => {
            const itemRecord: OfflineItemData = {
                id: String(item.id),
                courseId,
                type: item.type,
                title: item.title,
                content: item.content || '',
                extractedContent: item.extractedContent || '',
                updatedAt: item.updatedAt,
                savedAt: now
            }
            itemStore.put(itemRecord)
        })

        // 3. Save Tasks
        tasks.forEach(task => {
            taskStore.put({
                ...task,
                id: String(task.id),
                courseId,
                savedAt: now
            })
        })
    })
}

/**
 * Removes a course and all associated items from offline storage.
 */
export async function removeCourseFromOffline(courseId: string | number): Promise<void> {
    const db = await openDB()
    const id = String(courseId)

    return new Promise((resolve, reject) => {
        const tx = db.transaction(['courses', 'items', 'tasks'], 'readwrite')
        const courseStore = tx.objectStore('courses')
        const itemStore = tx.objectStore('items')
        const taskStore = tx.objectStore('tasks')

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)

        courseStore.delete(id)

        // Delete items with this courseId
        const itemIndex = itemStore.index('courseId')
        const itemKeyRange = IDBKeyRange.only(id)
        const itemRequest = itemIndex.openCursor(itemKeyRange)
        itemRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
            if (cursor) {
                cursor.delete()
                cursor.continue()
            }
        }

        // Delete tasks with this courseId
        const taskIndex = taskStore.index('courseId')
        const taskKeyRange = IDBKeyRange.only(id)
        const taskRequest = taskIndex.openCursor(taskKeyRange)
        taskRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
            if (cursor) {
                cursor.delete()
                cursor.continue()
            }
        }
    })
}

/**
 * Checks if a course is currently available offline.
 */
export async function isCourseSavedOffline(courseId: string | number): Promise<boolean> {
    try {
        const db = await openDB()
        const id = String(courseId)
        return new Promise((resolve) => {
            const tx = db.transaction('courses', 'readonly')
            const store = tx.objectStore('courses')
            const request = store.get(id)
            request.onsuccess = () => resolve(!!request.result)
            request.onerror = () => resolve(false)
        })
    } catch {
        return false
    }
}

/**
 * Lists all offline courses saved locally.
 */
export async function getOfflineCourses(): Promise<OfflineCourseData[]> {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction('courses', 'readonly')
            const store = tx.objectStore('courses')
            const request = store.getAll()
            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(request.error)
        })
    } catch {
        return []
    }
}

/**
 * Retrieves a single course and its items from offline storage.
 */
export async function getOfflineCourse(courseId: string | number): Promise<{ course: any; items: any[]; tasks: any[] } | null> {
    try {
        const db = await openDB()
        const id = String(courseId)

        return new Promise((resolve, reject) => {
            const tx = db.transaction(['courses', 'items', 'tasks'], 'readonly')
            const courseStore = tx.objectStore('courses')
            const itemStore = tx.objectStore('items')
            const taskStore = tx.objectStore('tasks')

            let courseResult: any = null
            let itemsResult: any[] = []
            let tasksResult: any[] = []

            const courseReq = courseStore.get(id)
            courseReq.onsuccess = () => {
                courseResult = courseReq.result
            }

            const itemIndex = itemStore.index('courseId')
            const itemReq = itemIndex.getAll(IDBKeyRange.only(id))
            itemReq.onsuccess = () => {
                itemsResult = itemReq.result || []
            }

            const taskIndex = taskStore.index('courseId')
            const taskReq = taskIndex.getAll(IDBKeyRange.only(id))
            taskReq.onsuccess = () => {
                tasksResult = taskReq.result || []
            }

            tx.oncomplete = () => {
                if (!courseResult) {
                    resolve(null)
                } else {
                    resolve({
                        course: courseResult,
                        items: itemsResult,
                        tasks: tasksResult
                    })
                }
            }

            tx.onerror = () => reject(tx.error)
        })
    } catch {
        return null
    }
}

/**
 * Retrieves a single note/item from offline storage.
 */
export async function getOfflineItem(itemId: string | number): Promise<OfflineItemData | null> {
    try {
        const db = await openDB()
        const id = String(itemId)

        return new Promise((resolve, reject) => {
            const tx = db.transaction('items', 'readonly')
            const store = tx.objectStore('items')
            const request = store.get(id)
            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    } catch {
        return null
    }
}

/**
 * Calculates storage statistics for saved offline courses.
 */
export async function getOfflineStorageUsage(): Promise<{ coursesCount: number; itemsCount: number; estimatedSizeKb: number }> {
    try {
        const courses = await getOfflineCourses()
        let totalItems = 0
        let totalChars = 0

        courses.forEach(c => {
            totalItems += c.itemsCount || 0
            totalChars += JSON.stringify(c).length
        })

        const db = await openDB()
        const items = await new Promise<any[]>((resolve) => {
            const tx = db.transaction('items', 'readonly')
            const store = tx.objectStore('items')
            const req = store.getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
        })

        items.forEach(it => {
            totalChars += (it.content?.length || 0) + (it.extractedContent?.length || 0) + (it.title?.length || 0)
        })

        const estimatedSizeKb = Math.round(totalChars / 1024)

        return {
            coursesCount: courses.length,
            itemsCount: items.length,
            estimatedSizeKb
        }
    } catch {
        return { coursesCount: 0, itemsCount: 0, estimatedSizeKb: 0 }
    }
}

/**
 * Clears all cached offline data.
 */
export async function clearAllOfflineData(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['courses', 'items', 'tasks'], 'readwrite')
        tx.objectStore('courses').clear()
        tx.objectStore('items').clear()
        tx.objectStore('tasks').clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}
