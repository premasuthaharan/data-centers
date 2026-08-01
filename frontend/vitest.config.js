import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/setupTests.js', 'src/**/__tests__/**'],
      // 10%, a few points below the current measured ~13% statement
      // coverage — most components (App.jsx, DataCenterCard.jsx, most of
      // Map.jsx) have no component-level tests yet, only their extracted
      // pure-helper files do. This is a floor to catch regressions, not
      // an aspirational target; ratchet up as component tests are added.
      thresholds: {
        statements: 10,
        branches: 10,
        functions: 10,
        lines: 10,
      },
    },
  },
})
