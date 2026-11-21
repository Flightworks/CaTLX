import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const base = mode === 'github-pages' ? '/CaTLX/' : '/';
  const env = loadEnv(mode, '.', 'VITE_');
  const cloudEnvironment = env.VITE_CATLX_ENV;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const siteUrl = env.VITE_CATLX_SITE_URL;

  if (process.env.CF_PAGES === '1') {
    const branch = process.env.CF_PAGES_BRANCH;
    const expectedEnvironment = branch === 'preprod' ? 'preprod' : branch === 'main' ? 'production' : null;
    if (!expectedEnvironment || base !== '/' || cloudEnvironment !== expectedEnvironment) {
      throw new Error('Cloudflare Pages requires preprod on preprod or production on main.');
    }
    const site = siteUrl && new URL(siteUrl);
    if (!site || site.protocol !== 'https:' || site.href !== site.origin + '/' || site.username || site.password) {
      throw new Error('Set VITE_CATLX_SITE_URL to the canonical HTTPS URL with a trailing slash.');
    }
    if (expectedEnvironment === 'preprod' && !/^preprod\.[a-z0-9-]+\.pages\.dev$/.test(site.host)) {
      throw new Error('Use the preprod branch alias as the canonical preview URL.');
    }
    if (!supabaseUrl || !/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(supabaseUrl)) {
      throw new Error('Set VITE_SUPABASE_URL to the URL of the Supabase project for this environment.');
    }
  }

  if (mode !== 'github-pages' && (cloudEnvironment || supabaseUrl || publishableKey || siteUrl)) {
    const localSupabase = process.env.CF_PAGES !== '1' &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(supabaseUrl || '');
    if ((cloudEnvironment !== 'preprod' && cloudEnvironment !== 'production') ||
        !supabaseUrl || !publishableKey ||
        (!publishableKey.startsWith('sb_publishable_') && !(localSupabase && publishableKey.startsWith('eyJ')))) {
      throw new Error('Set VITE_CATLX_ENV, VITE_SUPABASE_URL and a Supabase publishable key together.');
    }
  }

  return {
    base,
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
          name: 'CaTLX',
          short_name: 'CaTLX',
          description: 'A web application to conduct NASA Task Load Index (TLX) assessments.',
          id: base,
          start_url: base,
          scope: base,
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
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
      setupFiles: './vitest.setup.ts'
    }
  };
});
