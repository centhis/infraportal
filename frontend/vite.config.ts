/* eslint-disable no-undef */
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
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
})
