import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { EduLayout } from '@/layouts/EduLayout'
import { FinanceLayout } from '@/layouts/FinanceLayout'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from "@/components/theme-provider"
import { RequireAuth } from '@/components/RequireAuth'
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "sonner"
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load pages
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const HubPage = lazy(() => import('@/pages/HubPage').then(m => ({ default: m.HubPage })))

const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })))
const FocusPage = lazy(() => import('@/pages/FocusPage').then(m => ({ default: m.FocusPage })))
const CourseView = lazy(() => import('@/pages/CourseView').then(m => ({ default: m.CourseView })))
const ItemView = lazy(() => import('@/pages/ItemView').then(m => ({ default: m.ItemView })))
const FolderView = lazy(() => import('@/pages/FolderView').then(m => ({ default: m.FolderView })))
const Flashcards = lazy(() => import('@/pages/Flashcards').then(m => ({ default: m.Flashcards })))
const StudySession = lazy(() => import('@/pages/StudySession').then(m => ({ default: m.StudySession })))
const QuizStudy = lazy(() => import('@/pages/QuizStudy').then(m => ({ default: m.QuizStudy })))
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const ProfileManager = lazy(() => import('@/pages/ProfileManager').then(m => ({ default: m.ProfileManager })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const MindMapsPage = lazy(() => import('@/pages/MindMapsPage').then(m => ({ default: m.MindMapsPage })))
const InvestigationBoard = lazy(() => import('@/pages/InvestigationBoard').then(m => ({ default: m.InvestigationBoard })))
const FinanceDashboard = lazy(() => import('@/pages/FinanceDashboard').then(m => ({ default: m.default })))
const FinanceSettings = lazy(() => import('@/pages/finance/FinanceSettings').then(m => ({ default: m.FinanceSettings })))
const ImportPage = lazy(() => import('@/pages/finance/ImportPage').then(m => ({ default: m.default })))
const BankDetailsPage = lazy(() => import('@/pages/finance/BankDetailsPage').then(m => ({ default: m.default })))
const AccountDetailsPage = lazy(() => import('@/pages/finance/AccountDetailsPage').then(m => ({ default: m.default })))

// Suspense Wrapper
const LazyPage = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<LoadingSpinner />}>
        {children}
    </Suspense>
)

import { MetaManager } from '@/components/MetaManager';
import { Outlet } from 'react-router-dom';

const RootLayout = () => (
    <>
        <MetaManager />
        <Outlet />
    </>
);

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <LazyPage><LandingPage /></LazyPage>
            },
            {
                path: '/auth',
                element: <Navigate to="/" replace />
            },
            {
                element: <RequireAuth />,
                children: [
                    {
                        path: '/hub',
                        element: <LazyPage><HubPage /></LazyPage>
                    },
                    // EduTrack Routes
                    {
                        path: '/edu',
                        element: <EduLayout />,
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/edu/dashboard" replace />
                            },
                            {
                                path: 'dashboard',
                                element: <LazyPage><Dashboard /></LazyPage>,
                            },
                            {
                                path: 'library',
                                element: <LazyPage><LibraryPage /></LazyPage>,
                            },
                            {
                                path: 'focus',
                                element: <LazyPage><FocusPage /></LazyPage>,
                            },
                            {
                                path: 'settings',
                                element: <LazyPage><SettingsPage /></LazyPage>,
                            },
                            {
                                path: 'board',
                                element: <LazyPage><InvestigationBoard /></LazyPage>,
                            },
                            {
                                path: 'mindmaps',
                                element: <LazyPage><MindMapsPage /></LazyPage>,
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
                            }
                        ]
                    },
                    // FinanceTrack Routes
                    {
                        path: '/finance',
                        element: <FinanceLayout />,
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/finance/dashboard" replace />
                            },
                            {
                                path: 'dashboard',
                                element: <LazyPage><FinanceDashboard /></LazyPage>,
                            },
                            {
                                path: 'settings',
                                element: <LazyPage><FinanceSettings /></LazyPage>,
                            },
                            {
                                path: 'import',
                                element: <LazyPage><ImportPage /></LazyPage>,
                            },
                            {
                                path: 'bank/:bankId',
                                element: <LazyPage><BankDetailsPage /></LazyPage>,
                            },
                            {
                                path: 'account/:accountId',
                                element: <LazyPage><AccountDetailsPage /></LazyPage>,
                            }
                        ]
                    }
                ]
            },
            // Fallback
            {
                path: '*',
                element: <Navigate to="/" replace />,
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
