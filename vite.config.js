import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './', // use env var for CI web build, relative path otherwise
  root: 'src', // Set the project root to the src directory
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: '../dist', // Ensure the build output goes back to the real project root
    emptyOutDir: true, // Clean the output directory before building
    target: 'esnext', // Support top-level await
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./test-setup.ts']
  }
})
