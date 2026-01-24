import { useQuery } from '@tanstack/react-query'
import { courseQueries } from '@/lib/api/queries'
import { useProfileStore } from '@/store/profileStore'
import { Link } from 'react-router-dom'
import { Folder, ArrowRight, Loader2, Plus, Search } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useState } from 'react'
import { CreateCourseModal } from '@/components/CreateCourseModal'

export function LibraryPage() {
    const { t } = useLanguage()
    const { activeProfile } = useProfileStore()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const { data: courses, isLoading } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    })

    const courseList = courses || []

    const filteredCourses = courseList.filter((course: any) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('nav.library') || "Bibliothèque"}</h1>
                    <p className="text-muted-foreground mt-1">
                        {courseList.length} {t('common.courses') || "cours"} • {t('library.desc') || "Gérez tous vos sujets d'apprentissage"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('common.search') || "Rechercher..."}
                            className="bg-card border rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <Plus className="h-4 w-4" />
                        {t('action.createCourse') || "Nouveau Cours"}
                    </button>
                </div>
            </div>

            {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map((course: any) => (
                        <Link
                            key={course.id}
                            to={`/edu/course/${course.id}`}
                            className="group bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full"
                        >
                            <div className="h-3 w-full" style={{ backgroundColor: course.color }} />
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    {course.icon ? (
                                        <span className="text-3xl bg-muted/30 p-3 rounded-xl">{course.icon}</span>
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                                            <Folder className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="bg-muted/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-xl mb-2 line-clamp-1">{course.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">{course.description || "Aucune description"}</p>
                                <div className="text-xs font-medium text-muted-foreground pt-4 border-t mt-auto">
                                    {new Date(course.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl">
                    <Folder className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t('empty.noCourses') || "Aucun cours trouvé"}</h3>
                    <p className="text-muted-foreground mb-6 text-center max-w-md">
                        {searchQuery ? "Essayez d'autres termes de recherche." : "Commencez votre voyage d'apprentissage en créant votre premier cours."}
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-primary hover:underline font-medium"
                    >
                        {t('action.createFirstCourse') || "Créer un cours maintenant"}
                    </button>
                </div>
            )}

            <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    )
}
