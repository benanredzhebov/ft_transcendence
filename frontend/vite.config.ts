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
      // Add other backend routes you need to proxy
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
      // You might need a proxy for socket.io upgrade requests too,
      // although direct connection from client might be simpler.
      // '/socket.io': {
      //   target: 'wss://localhost:3000', // Use wss for secure websockets
      //   ws: true, // Enable websocket proxying
      //   secure: false,
      //   changeOrigin: true,
      // }
    },
  },
});