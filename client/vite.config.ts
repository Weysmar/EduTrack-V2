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
        // No manualChunks: every manual group (ui, reactflow, editor, docx) made Rollup move shared runtime code into
        // it, so the group was preloaded on every page. Automatic splitting keeps heavy libraries in the lazy routes.
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
