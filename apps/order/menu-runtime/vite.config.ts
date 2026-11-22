// runtime Menu 打包成 Web Component（比照舊 demo 的 c/widget/）。
// 輸出到 order 的 public/，隨 order 部署；瀏覽器用 import() 從同網域的 /menu-runtime/menu-runtime.js 載入。
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false, // 輸出就在 public/ 底下，不要把 public/ 再複製一次
  plugins: [react()],
  // library mode 不會替換 process.env.NODE_ENV，React 需要它
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./index.tsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'menu-runtime.js',
    },
    outDir: fileURLToPath(new URL('../public/menu-runtime', import.meta.url)),
    emptyOutDir: true,
    minify: true,
    // Vite 8 在 lib + es 格式時把 oxc minify 設成 { compress, mangle, codegen: false }（保留空白），
    // build.minify: true 改不到這一層；要連空白一起壓縮，得在 rolldown 的 output 指定。
    rolldownOptions: { output: { minify: true } },
  },
})
