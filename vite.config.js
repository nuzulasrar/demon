import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/demon/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.glb', '**/*.obj', '**/*.png', '**/*.wasm', '**/*.mp3']
})
