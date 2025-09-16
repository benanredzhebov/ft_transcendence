import { defineConfig } from 'vite'

export default defineConfig({
  envDir: '../', // Look for .env file in parent directory
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    proxy: {
      // Proxy API requests to backend service
      '/api': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Proxy other backend routes
      '/username-google': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/username-google': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.APP_URL || 'https://backend:8443',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})