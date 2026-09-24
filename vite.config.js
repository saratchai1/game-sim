import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        farm: fileURLToPath(new URL('./index.html', import.meta.url)),
        action: fileURLToPath(new URL('./action/index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three-core'
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'ui-vendor'
        },
      },
    },
  },
})
