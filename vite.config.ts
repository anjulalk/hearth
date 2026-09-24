import { fileURLToPath, URL } from 'node:url'
// vitest/config re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwind()],
  // The custom domain serves from the root (see public/CNAME). A project-page
  // preview can override with BASE_PATH=/hearth/.
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  server: {
    port: 5174,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
