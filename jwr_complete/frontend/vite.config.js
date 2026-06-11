import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      mangle: { toplevel: false },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — smallest possible chunk loaded on every route
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core'
          }
          // Router
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) {
            return 'router'
          }
          // Everything else in node_modules → vendor
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          // Admin code — only loaded on /admin/* routes
          if (id.includes('/src/admin/')) {
            return 'admin'
          }
          // Staff auth pages
          if (id.includes('/src/pages/Staff') || id.includes('/src/pages/Forgot') ||
              id.includes('/src/pages/Reset') || id.includes('/src/pages/Verify')) {
            return 'staff-auth'
          }
        },
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096,
    // Emit compressed sizes so Vite reports real payloads
    reportCompressedSize: true,
  },
  css: {
    devSourcemap: true,
  },
})
