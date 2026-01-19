/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: './src/test/setup.ts',
        css: true,
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
                    ui: ['lucide-react', 'sonner', 'clsx', 'tailwind-merge'],
                    // Separate heavy document processing libraries
                    'docx-processing': ['mammoth', 'docx-preview', 'docx'],
                    // Separate PDF processing (already lazy in extractText but main.tsx has worker)
                    'pdf-lib': ['pdfjs-dist', 'react-pdf'],
                    // ReactFlow for knowledge maps
                    'reactflow-lib': ['reactflow', '@xyflow/react'],
                    // TipTap editor
                    'editor-lib': [
                        '@tiptap/react',
                        '@tiptap/starter-kit',
                        '@tiptap/extension-color',
                        '@tiptap/extension-highlight',
                        '@tiptap/extension-text-style',
                        '@tiptap/extension-underline',
                        '@tiptap/extension-placeholder'
                    ]
                }
            }
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        }
    },
    server: {
        host: '0.0.0.0',
    }
})
