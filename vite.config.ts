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
  build: {
    /*
     * 压缩器默认会把 `@media (max-width: 768px)` 改写成 Level 4 的区间语法
     * `@media (width <= 768px)` —— 省几个字节，但 iOS 16.4（2023-03）以前的
     * Safari 不认，整条规则连同里面的手机版式一起被丢掉。这个站要投到讲台的
     * 手机上，压不起这个赌注，把 CSS 目标锁回旧 Safari。
     */
    cssTarget: 'safari14',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
