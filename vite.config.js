import path from 'node:path';
import { defineConfig } from 'vite';
import { pwaPlugin } from './scripts/tools/pwa-plugin.mjs';

// Which content package to build. A new gift game is a copy of
// src/content/starter-adventure with its own name, e.g. CONTENT_PACKAGE=emmas-adventure.
const contentPackage = process.env.CONTENT_PACKAGE || 'starter-adventure';

export default defineConfig({
  base: './',
  // The built game can be installed on a tablet and played offline (see the plugin).
  plugins: [pwaPlugin({ contentDir: path.resolve(import.meta.dirname, 'src/content', contentPackage) })],
  resolve: {
    alias: {
      '@content': path.resolve(import.meta.dirname, 'src/content', contentPackage)
    }
  },
  server: {
    port: 8190,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com']
  },
  preview: {
    port: 8190,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com']
  },
  build: {
    target: 'es2022',
    // Built code goes in build/, so it never mixes with the art in public/assets.
    assetsDir: 'build',
    assetsInlineLimit: 0,
    sourcemap: true
  }
});
