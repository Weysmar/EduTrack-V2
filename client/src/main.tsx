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

import { pdfjs } from 'react-pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Use standard CDN-backed worker URL matched with exact pdfjs-dist version 5.4.296
const workerUrl = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

try {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    GlobalWorkerOptions.workerSrc = workerUrl;
} catch (e) {
    console.warn("Could not set workerSrc globally:", e);
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'


console.log('🔌 EduTrack Client Initialized (v0.5.21 - UI Refinements) 🚀');

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

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('PWA ServiceWorker registration failed: ', err);
        });
    });
}
