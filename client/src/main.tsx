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

// Pin worker version to 5.4.296 to match the API version bundled with react-pdf 10.3.0
// Use absolute URL from CDN to avoid relative path resolution issues in SPA routes
const workerUrl = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
GlobalWorkerOptions.workerSrc = workerUrl;

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
