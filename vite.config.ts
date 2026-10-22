/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// build ปกติ → dist/ (นำไปวางใน XAMPP)
// build --mode preview → dist-preview/index.html ไฟล์เดียว (สำหรับลิงก์ทดลองบนมือถือ)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    emptyOutDir: true,
    copyPublicDir: mode !== 'preview',
  },
  define: { __PREVIEW__: JSON.stringify(mode === 'preview') },
  test: { include: ['src/**/*.test.ts'] },
}))
