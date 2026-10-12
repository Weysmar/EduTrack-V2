// Polyfill for URL.parse (required by newer pdfjs-dist versions)
if (typeof URL.parse === 'undefined') {
    URL.parse = (url: string, base?: string) => {
        try {
            return new URL(url, base);
        } catch (e) {
            return null;
        }
    };
}

// The pdf.js worker is configured by the modules that use pdf.js (PDFViewer, FilePreview, extractText):
// importing it here put the whole library in the startup bundle of every page

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'katex/dist/katex.min.css'


// Auto-reload on Vite chunk updates/deployments
window.addEventListener('vite:preloadError', (event) => {
    console.warn('New deployment detected (preload error), reloading to fetch latest assets...', event);
    window.location.reload();
});

console.log('🔌 EduTrack Client Initialized (v2.0.0 - Major Overhaul) 🚀');

// Basic Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("APP CRASH:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
                    <h1>Something went wrong.</h1>
                    <pre>{this.state.error?.toString()}</pre>
                    <button onClick={() => window.location.reload()}>Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)

// Register Service Worker for PWA installability & offline support
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('PWA ServiceWorker registration failed: ', err);
        });
    });
}
