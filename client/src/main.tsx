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
import * as pdfjsLib from 'pdfjs-dist';

// Pin worker version to 5.4.296 to match the API version bundled with react-pdf 10.3.0
const workerUrl = `//unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'


console.log('🔌 EduTrack Client Initialized (v0.5.21 - UI Refinements) 🚀');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
