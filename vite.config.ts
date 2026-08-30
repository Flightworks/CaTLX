import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: mode === 'github-pages' ? '/CaTLX/' : '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'icon.svg', 'pwa-icon.png'],
        manifest: {
          name: 'CaTLX Workload Assessment',
          short_name: 'CaTLX',
          description: 'A web application to conduct NASA Task Load Index (TLX) assessments.',
          id: '/CaTLX/',
          start_url: '/CaTLX/',
          scope: '/CaTLX/',
          display: 'standalone',
          background_color: '#1a1f28',
          theme_color: '#0B3D91',
          icons: [
            {
              src: 'logo.png',
              sizes: '100x94',
              type: 'image/png'
            },
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      exclude: ['**/node_modules/**', 'tests/firestore/**/*.test.ts']
    }
  };
});
