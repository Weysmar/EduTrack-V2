export interface ChangelogEntry {
    version: string
    date: string
    title: string
    changes: {
        type: 'new' | 'fix' | 'improvement'
        description: string
    }[]
}

export const changelogs: ChangelogEntry[] = [
    {
        version: "0.4.1",
        date: "2026-01-06",
        title: "Resource Hub Upgrade 📂",
        changes: [
            { type: 'new', description: "Multi-Format Viewer: Native support for PDF, Office documents (Word, Excel, PowerPoint), and Images directly in the app." },
            { type: 'improvement', description: "Metadata Display: Clearer resource cards showing file format, full date, and filename at a glance." },
            { type: 'fix', description: "Secure Deletion: Fixed 'File not found' errors when deleting resources; added visual feedback during deletion." },
            { type: 'fix', description: "Document Detection: Robust file type detection ensures Office docs always open in the correct viewer." }
        ]
    },
    {
        version: "0.4.0",
        date: "2026-01-04",
        title: "Cloud Sync Overhaul 🔄",
        changes: [
            { type: 'fix', description: "Cloud Sync Infrastructure: Completely rebuilt synchronization backend to fix authentication, routing, and database issues. Multi-device sync now works reliably!" },
            { type: 'fix', description: "File Upload Fixed: Resolved 404 errors when uploading PDFs and documents. Storage now properly routes through Nginx reverse proxy." },
            { type: 'fix', description: "Database Schema: Fixed UUID primary key generation for folders and courses, preventing null value errors during sync." },
            { type: 'improvement', description: "Sync Speed: Reduced polling interval from 30s to 3s for near-instantaneous updates across devices (optimized for small user groups)." },
            { type: 'improvement', description: "Smart Cleanup: Automated removal of old deletion records (>7 days) prevents infinite deletion loops and keeps database lean." },
            { type: 'improvement', description: "Tombstone Optimization: Only sync deletions from last 24 hours instead of all history, perfect for daily multi-device usage." },
            { type: 'fix', description: "Nginx Configuration: Fixed all API routing issues (/api/, /auth/, /sync, /storage) to properly communicate with backend on port 3001." }
        ]
    },
    {
        version: "0.3.0",
        date: "2026-01-01",
        title: "Focus Mode & Localization 🌍",
        changes: [
            { type: 'new', description: "Focus Mode: Immerse yourself in learning with a distraction-free, full-screen summary view. Toggle with one click or use `Esc` to exit." },
            { type: 'new', description: "Multi-Language Support: Now fully localized in English, French, and... Minecraft? Yes, try the 'Minecraft' language for a blocky surprise!" },
            { type: 'new', description: "AI Summaries 2.0: Drafting academic summaries uses local Chrome AI (Gemini Nano) for privacy-first, offline-capable generation." },
            { type: 'improvement', description: "Export Power: Download your summaries not just as PDF, but now as formatted Microsoft Word (.docx) documents for further editing." }
        ]
    },
    {
        version: "0.2.0",
        date: "2026-01-01",
        title: "PDF Export & Global Search",
        changes: [
            { type: 'new', description: "Smart PDF Export: Generate professional-grade PDFs of your course summaries with automatic formatting and styling." },
            { type: 'new', description: "Command Center: Press `Cmd+K` (or `Ctrl+K`) to instantly search across all your notes, exercises, and folders." },
            { type: 'improvement', description: "Dashboard Analytics: New activity timeline tracks your daily progress and recent file interactions." },
            { type: 'fix', description: "Optimized large file handling when attaching resources to items." }
        ]
    },
    {
        version: "0.1.5",
        date: "2025-12-31",
        title: "Structure & Organization",
        changes: [
            { type: 'new', description: "Recursive Folders: Organize your complex subjects with infinite growing folder structures." },
            { type: 'new', description: "Quick Favorites: Pin your most critical courses to the top for instant access." },
            { type: 'improvement', description: "Drag & Drop: Intuitive reordering of sidebar items and course contents." }
        ]
    },
    {
        version: "0.1.0",
        date: "2025-12-30",
        title: "Genesis",
        changes: [
            { type: 'new', description: "Core Learning Engine: Create Courses, Notes, and Exercises with rich text editing." },
            { type: 'new', description: "Graph Visualization: See how your knowledge connects with an interactive force-directed graph." }
        ]
    }
]
