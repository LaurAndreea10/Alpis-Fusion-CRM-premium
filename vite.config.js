import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative asset paths so the app works on GitHub Pages, subfolders,
  // and direct file previews without hardcoded repository names.
  base: './',
})
