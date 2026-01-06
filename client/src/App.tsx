import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/layouts/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { CourseView } from '@/pages/CourseView'
import { ItemView } from '@/pages/ItemView'
import { FolderView } from '@/pages/FolderView'
import { Flashcards } from '@/pages/Flashcards'
import { StudySession } from '@/pages/StudySession'
import { QuizStudy } from '@/pages/QuizStudy'
import { CalendarPage } from '@/pages/CalendarPage'
import { ProfileManager } from '@/pages/ProfileManager'
const KnowledgeGraph = lazy(() => import('@/components/KnowledgeGraph').then(module => ({ default: module.KnowledgeGraph })))
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from "@/components/theme-provider"

import { SettingsPage } from '@/pages/SettingsPage'

import { AuthPage } from '@/pages/AuthPage'
import { RequireAuth } from '@/components/RequireAuth'



const router = createBrowserRouter([
    {
        path: '/auth',
        element: <AuthPage />
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
                        element: <Dashboard />,
                    },
                    {
                        path: 'settings',
                        element: <SettingsPage />,
                    },
                    {
                        path: 'graph',
                        element: <Suspense fallback={<div className="flex items-center justify-center h-full">Loading 3D Engine...</div>}><KnowledgeGraph /></Suspense>,
                    },
                    {
                        path: 'course/:courseId',
                        element: <CourseView />,
                    },
                    {
                        path: 'course/:courseId/item/:itemId',
                        element: <ItemView />,
                    },
                    {
                        path: 'folder/:folderId',
                        element: <FolderView />,
                    },
                    {
                        path: 'flashcards',
                        element: <Flashcards />,
                    },
                    {
                        path: 'flashcards/study/:setId',
                        element: <StudySession />,
                    },
                    {
                        path: 'quiz/study/:id',
                        element: <QuizStudy />,
                    },
                    {
                        path: 'calendar',
                        element: <CalendarPage />,
                    },
                    {
                        path: 'profiles',
                        element: <ProfileManager />,
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



import { LanguageProvider } from "@/components/language-provider"

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider defaultLanguage="en" storageKey="vite-ui-language">
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <RouterProvider router={router} />
                </ThemeProvider>
            </LanguageProvider>
        </QueryClientProvider>
    )
}

export default App
