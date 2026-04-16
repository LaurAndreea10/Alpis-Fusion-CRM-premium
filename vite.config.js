import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const resolveBasePath = () => {
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH
  }

  const repository = process.env.GITHUB_REPOSITORY

  if (repository) {
    const repoName = repository.split('/')[1]
    return `/${repoName}/`
  }

  return '/'
}

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
})
