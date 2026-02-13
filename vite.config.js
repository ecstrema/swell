import { defineConfig } from 'vite'
import { execSync } from 'child_process'

// Get git commit hash for build info
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch (e) {
    console.warn('Failed to get git commit hash:', e instanceof Error ? e.message : e)
    return 'unknown'
  }
}

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
  define: {
    'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(getGitCommit()),
    'import.meta.env.VITE_VERSION': JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./test-setup.ts']
  }
})
