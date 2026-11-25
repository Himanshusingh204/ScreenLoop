import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The ONNX wasm (~27 MB) and caption worker load on demand when captions are enabled, never precached.
      workbox: { globIgnores: ['**/*.wasm', '**/captionWorker-*.js'] },
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'Screenloop',
        short_name: 'Screenloop',
        description: 'Watch movies together with friends — no login, no fuss.',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          livekit: ['livekit-client', '@livekit/components-react'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    include: ['src/**/*.test.{js,jsx}', 'src/**/*.spec.{js,jsx}'],
  },
});
