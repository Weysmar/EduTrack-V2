import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom'
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

// Custom lazy loader that auto-reloads once on error (crucial for Dokploy deployment asset updates)
const lazyWithRetry = (factory: () => Promise<any>) => {
    return lazy(async () => {
        const hasReloaded = sessionStorage.getItem('chunk_retry_attempt');
        try {
            const module = await factory();
            // Clear flag on successful load
            sessionStorage.removeItem('chunk_retry_attempt');
            return module;
        } catch (error: any) {
            const msg = error?.message || String(error);
            const isChunkError =
                msg.includes('Failed to fetch dynamically imported module') ||
                msg.includes('Importing a module script failed') ||
                msg.includes('error loading dynamically imported module') ||
                msg.includes('Unable to preload CSS');

            if (isChunkError && !hasReloaded) {
                console.warn('[ChunkLoader] Deployment update detected. Refreshing page for latest bundle...');
                sessionStorage.setItem('chunk_retry_attempt', 'true');
                window.location.reload();
                return new Promise(() => { });
            }
            sessionStorage.removeItem('chunk_retry_attempt');
            throw error;
        }
    });
};

// Legacy route redirect helpers
const LegacyFlashcardRedirect = () => {
    const { setId } = useParams();
    return <Navigate to={setId ? `/edu/flashcards/study/${setId}` : '/edu/flashcards'} replace />;
};

const LegacyQuizRedirect = () => {
    const { id } = useParams();
    return <Navigate to={id ? `/edu/quiz/study/${id}` : '/edu/dashboard'} replace />;
};

// Lazy load pages
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const HubPage = lazyWithRetry(() => import('@/pages/HubPage').then(m => ({ default: m.HubPage })))

const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const LibraryPage = lazyWithRetry(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })))
const FocusPage = lazyWithRetry(() => import('@/pages/FocusPage').then(m => ({ default: m.FocusPage })))
const CourseView = lazyWithRetry(() => import('@/pages/CourseView').then(m => ({ default: m.CourseView })))
const ItemView = lazyWithRetry(() => import('@/pages/ItemView').then(m => ({ default: m.ItemView })))
const FolderView = lazyWithRetry(() => import('@/pages/FolderView').then(m => ({ default: m.FolderView })))
const Flashcards = lazyWithRetry(() => import('@/pages/Flashcards').then(m => ({ default: m.Flashcards })))
const StudySession = lazyWithRetry(() => import('@/pages/StudySession').then(m => ({ default: m.StudySession })))
const QuizStudy = lazyWithRetry(() => import('@/pages/QuizStudy').then(m => ({ default: m.QuizStudy })))
const MindMapsPage = lazyWithRetry(() => import('@/pages/MindMapsPage').then(m => ({ default: m.MindMapsPage })))
const CalendarPage = lazyWithRetry(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const ProfileManager = lazyWithRetry(() => import('@/pages/ProfileManager').then(m => ({ default: m.ProfileManager })))
const SettingsPage = lazyWithRetry(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const FinanceDashboard = lazyWithRetry(() => import('@/pages/FinanceDashboard').then(m => ({ default: m.default })))
const ImportPage = lazyWithRetry(() => import('@/pages/finance/ImportPage').then(m => ({ default: m.default })))
const BankDetailsPage = lazyWithRetry(() => import('@/pages/finance/BankDetailsPage').then(m => ({ default: m.default })))
const AccountDetailsPage = lazyWithRetry(() => import('@/pages/finance/AccountDetailsPage').then(m => ({ default: m.default })))
const FinanceCategoriesPage = lazyWithRetry(() => import('@/pages/finance/FinanceCategoriesPage').then(m => ({ default: m.default })))
const RecurringPage = lazyWithRetry(() => import('@/pages/finance/RecurringPage').then(m => ({ default: m.default })))
const SavingsPage = lazyWithRetry(() => import('@/pages/finance/SavingsPage').then(m => ({ default: m.default })))
const RulesPage = lazyWithRetry(() => import('@/pages/finance/RulesPage').then(m => ({ default: m.default })))
const MonthlyReportPage = lazyWithRetry(() => import('@/pages/finance/MonthlyReportPage').then(m => ({ default: m.default })))
const PrivacyPolicyPage = lazyWithRetry(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsOfServicePage = lazyWithRetry(() => import('@/pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })))

// Remove sessionStorage flag on successful navigation to prevent loops
window.addEventListener('beforeunload', () => {
    // Optional: cleanup logic if needed, but session storage works well for single page reload context
});

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
                path: '/privacy',
                element: <LazyPage><PrivacyPolicyPage /></LazyPage>
            },
            {
                path: '/terms',
                element: <LazyPage><TermsOfServicePage /></LazyPage>
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
                    // Redirects for legacy root routes to EduTrack
                    {
                        path: '/flashcards',
                        element: <Navigate to="/edu/flashcards" replace />
                    },
                    {
                        path: '/flashcards/study/:setId',
                        element: <LegacyFlashcardRedirect />
                    },
                    {
                        path: '/quiz/study/:id',
                        element: <LegacyQuizRedirect />
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
                                path: 'mindmaps',
                                element: <LazyPage><MindMapsPage /></LazyPage>,
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
                                path: 'import',
                                element: <LazyPage><ImportPage /></LazyPage>,
                            },
                            {
                                path: 'categories',
                                element: <LazyPage><FinanceCategoriesPage /></LazyPage>,
                            },
                            {
                                path: 'bank/:bankId',
                                element: <LazyPage><BankDetailsPage /></LazyPage>,
                            },
                            {
                                path: 'account/:accountId',
                                element: <LazyPage><AccountDetailsPage /></LazyPage>,
                            },
                            {
                                path: 'settings',
                                element: <LazyPage><SettingsPage /></LazyPage>,
                            },
                            {
                                path: 'recurring',
                                element: <LazyPage><RecurringPage /></LazyPage>,
                            },
                            {
                                path: 'savings',
                                element: <LazyPage><SavingsPage /></LazyPage>,
                            },
                            {
                                path: 'rules',
                                element: <LazyPage><RulesPage /></LazyPage>,
                            },
                            {
                                path: 'reports',
                                element: <LazyPage><MonthlyReportPage /></LazyPage>,
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
