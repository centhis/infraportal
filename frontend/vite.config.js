/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/setupTests.js',
    server: {
      deps: {
        inline: ['@mui/x-data-grid']
      }
    },
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  }
})
