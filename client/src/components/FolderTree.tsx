import { useState } from 'react'
import { Course, Folder } from '@/lib/types';
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronRight, Folder as FolderIcon } from 'lucide-react'

interface FolderTreeProps {
    folders: Folder[]
    courses: Course[]
    parentId?: number | string
    level?: number
}

export function FolderTree({ folders, courses, parentId, level = 0 }: FolderTreeProps) {
    // Use loose equality to matches null/undefined parentId
    const currentFolders = folders.filter(f => (f.parentId ?? null) == (parentId ?? null))
    const currentCourses = courses.filter(c => (c.folderId ?? null) == (parentId ?? null))

    if (currentFolders.length === 0 && currentCourses.length === 0) return null

    return (
        <div className="space-y-0.5">
            {currentFolders.map(folder => (
                <FolderItem
                    key={`folder-${folder.id}`}
                    folder={folder}
                    allFolders={folders}
                    allCourses={courses}
                    level={level}
                />
            ))}
            {currentCourses.map(course => (
                <CourseItem
                    key={`course-${course.id}`}
                    course={course}
                    level={level}
                />
            ))}
        </div>
    )
}

function FolderItem({ folder, allFolders, allCourses, level }: { folder: Folder, allFolders: Folder[], allCourses: Course[], level: number }) {
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()
    const isActive = location.pathname === `/folder/${folder.id}`

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const courseId = e.dataTransfer.getData('courseId')
        if (courseId) {
            // Check if courseId is purely numeric (legacy) or string (UUID)
            // But db.courses.update accepts the key type.
            // If the ID coming from setData is string "123", we might need to parse it if the DB key is number 123.
            // Let's try to be smart.

            const idToUpdate = String(courseId);

            console.log(`[FolderTree] Dropping course ${idToUpdate} into folder ${folder.id}`);
            const { courseQueries } = await import('@/lib/api/queries')
            await courseQueries.update(String(idToUpdate), { folderId: folder.id })
            console.log(`[FolderTree] Update complete.`);
        }
    }

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center justify-between px-2 py-1.5 rounded-md transition-colors select-none",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={{ paddingLeft: `${Math.max(8, level * 12 + 8)}px` }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <button
                        onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen) }}
                        className="p-0.5 hover:bg-muted-foreground/10 rounded-sm transition-colors"
                    >
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-90")} />
                    </button>

                    <Link to={`/folder/${folder.id}`} className="flex items-center gap-2 flex-1 truncate py-0.5">
                        <FolderIcon className={cn("h-4 w-4", isOpen ? "fill-current" : "fill-transparent")} />
                        <span className="truncate">{folder.name}</span>
                    </Link>
                </div>
            </div>

            {isOpen && (
                <FolderTree
                    folders={allFolders}
                    courses={allCourses}
                    parentId={folder.id}
                    level={level + 1}
                />
            )}
        </div>
    )
}

function CourseItem({ course, level }: { course: Course, level: number }) {
    const location = useLocation()
    const isActive = location.pathname === `/course/${course.id}`

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('courseId', course.id!.toString())
    }

    return (
        <Link
            to={`/course/${course.id}`}
            draggable
            onDragStart={handleDragStart}
            className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 text-sm font-medium rounded-md transition-colors cursor-grab active:cursor-grabbing",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={{ paddingLeft: `${Math.max(8, level * 12 + 24)}px` }}
        >
            {course.icon ? (
                <span className="w-5 h-5 flex items-center justify-center text-lg leading-none">{course.icon}</span>
            ) : (
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: course.color }}
                />
            )}
            <span className="truncate">{course.title}</span>
        </Link>
    )
}
