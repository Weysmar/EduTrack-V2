import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/layouts/AppLayout'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from "@/components/theme-provider"
import { RequireAuth } from '@/components/RequireAuth'
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "sonner"
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load pages to split bundle
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage }))) // Added
const CourseView = lazy(() => import('@/pages/CourseView').then(m => ({ default: m.CourseView })))
const ItemView = lazy(() => import('@/pages/ItemView').then(m => ({ default: m.ItemView })))
const FolderView = lazy(() => import('@/pages/FolderView').then(m => ({ default: m.FolderView })))
const Flashcards = lazy(() => import('@/pages/Flashcards').then(m => ({ default: m.Flashcards })))
const StudySession = lazy(() => import('@/pages/StudySession').then(m => ({ default: m.StudySession })))
const QuizStudy = lazy(() => import('@/pages/QuizStudy').then(m => ({ default: m.QuizStudy })))
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const ProfileManager = lazy(() => import('@/pages/ProfileManager').then(m => ({ default: m.ProfileManager })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuthPage = lazy(() => import('@/pages/AuthPage').then(m => ({ default: m.AuthPage })))
const InvestigationBoard = lazy(() => import('@/pages/InvestigationBoard').then(m => ({ default: m.InvestigationBoard })))

// Suspense Wrapper
const LazyPage = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<LoadingSpinner />}>
        {children}
    </Suspense>
)

const router = createBrowserRouter([
    {
        path: '/auth',
        element: <LazyPage><AuthPage /></LazyPage>
    },
    {
        path: '/',
        element: <RequireAuth />,
        children: [
            {
                element: (
                    <AppLayout />
                ),
                children: [
                    {
                        index: true,
                        element: <LazyPage><Dashboard /></LazyPage>,
                    },
                    {
                        path: 'library', // New Route
                        element: <LazyPage><LibraryPage /></LazyPage>,
                    },
                    {
                        path: 'settings',
                        element: <LazyPage><SettingsPage /></LazyPage>,
                    },
                    {
                        path: 'board', // New Route
                        element: <LazyPage><InvestigationBoard /></LazyPage>,
                    },
                    {
                        path: 'course/:courseId',
                        element: <LazyPage><CourseView /></LazyPage>,
                    },
                    {
                        path: 'course/:courseId/item/:itemId',
                        element: <LazyPage><ItemView /></LazyPage>,
                    },
                    {
                        path: 'folder/:folderId',
                        element: <LazyPage><FolderView /></LazyPage>,
                    },
                    {
                        path: 'flashcards',
                        element: <LazyPage><Flashcards /></LazyPage>,
                    },
                    {
                        path: 'flashcards/study/:setId',
                        element: <LazyPage><StudySession /></LazyPage>,
                    },
                    {
                        path: 'quiz/study/:id',
                        element: <LazyPage><QuizStudy /></LazyPage>,
                    },
                    {
                        path: 'calendar',
                        element: <LazyPage><CalendarPage /></LazyPage>,
                    },
                    {
                        path: 'profiles',
                        element: <LazyPage><ProfileManager /></LazyPage>,
                    },
                    {
                        path: '*',
                        element: <Navigate to="/" replace />,
                    }
                ]
            }
        ]
    }
])

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider defaultLanguage="fr" storageKey="vite-ui-language">
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <RouterProvider router={router} />
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </LanguageProvider>
        </QueryClientProvider>
    )
}

export default App
