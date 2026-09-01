import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
        },
        manifest: {
          name: 'SPLENDID CHAT',
          short_name: 'SplendidChat',
          description: 'A modern messaging app with mirror glass aesthetics',
          theme_color: '#dc2626',
          background_color: '#121418',
          display: 'standalone',
          launch_handler: {
            client_mode: 'focus-existing'
          },
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
