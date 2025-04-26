import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests starting with /signUp, /logIn, /data, etc.
      '/signUp': {
        target: 'https://localhost:3000', // Target the HTTPS backend
        changeOrigin: true,
        secure: false, // Disable SSL verification for self-signed certs in dev
      },
      '/logIn': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/data': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Add WebSocket proxy for socket.io
      '/socket.io': {
        target: 'https://localhost:3000', // Use wss for secure WebSocket connections
        ws: true, // Enable WebSocket proxying
        secure: false,
        changeOrigin: true,
      },
    },
  },
});