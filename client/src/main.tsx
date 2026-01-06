import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'


console.log('🔌 EduTrack Client Initialized (v0.4.0 - Cloud Sync Overhaul) 🚀');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
