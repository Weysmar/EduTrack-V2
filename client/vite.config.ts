import { defineConfig } from 'vite'
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
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
                    ui: ['lucide-react', 'sonner', 'clsx', 'tailwind-merge']
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
