import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [react()],
        // Explicitly define environment variables with fallback to loaded env files.
        // Priority: System Env (Docker) > .env file (Local)
        define: {
            'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL),
            'import.meta.env.VITE_ALERT_TIMEOUT': JSON.stringify(process.env.VITE_ALERT_TIMEOUT || env.VITE_ALERT_TIMEOUT),
        },
        resolve: {
            alias: {
                '@app': resolve(__dirname, 'src/app'),
                '@core': resolve(__dirname, 'src/core'),
                '@shared': resolve(__dirname, 'src/shared'),
                '@modules': resolve(__dirname, 'src/modules'),
                '@types': resolve(__dirname, 'src/types'),
                '@mocks': resolve(__dirname, 'src/mocks'),
            },
        },
        server: {
            port: 3000,
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: 'src/setupTests.ts',
            server: {
                deps: {
                    inline: ['@mui/x-data-grid'],
                },
            },
            css: {
                modules: {
                    classNameStrategy: 'non-scoped',
                },
            },
        },
    }
})
