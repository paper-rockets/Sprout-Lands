import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 8190,
    strictPort: true,
    host: '0.0.0.0'
  },
  preview: {
    port: 8190,
    strictPort: true,
    host: '0.0.0.0'
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: true
  }
});
