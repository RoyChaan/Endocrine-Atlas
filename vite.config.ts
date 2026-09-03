import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * 部署前缀。GitHub Pages 的项目页在 `/<repo>/` 下，CI 里把 `VITE_BASE`
 * 设成 `/Endocrine-Atlas/`；本地开发和根域部署留空即可。
 */
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
