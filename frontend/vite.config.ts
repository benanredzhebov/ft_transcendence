import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // If you are using HTTPS for Vite dev server, configure it here too
    // https: {
    //   key: './path/to/your/vite-key.pem',
    //   cert: './path/to/your/vite-cert.pem',
    // },
    proxy: {
      // Proxy API requests
      '/api': {
        target: `${process.env.APP_URL}`,
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false,      // Set to false if your backend uses SSL 
        ws: true,           // Enable WebSocket proxying

      }
    }
  },
})