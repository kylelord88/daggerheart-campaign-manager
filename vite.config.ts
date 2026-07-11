import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project site URL: https://<user>.github.io/daggerheart-campaign-manager/
export default defineConfig({
  base: '/daggerheart-campaign-manager/',
  plugins: [react()],
})
