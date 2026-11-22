import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // library mode 不會替換 process.env.NODE_ENV，React 需要它
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/index.tsx', formats: ['es'], fileName: () => 'menu-runtime.js' },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
