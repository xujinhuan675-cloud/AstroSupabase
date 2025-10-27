import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
// import { astroSpaceship } from 'astro-spaceship';

import tailwindcss from '@tailwindcss/vite';
// import websiteConfig from './website.config.json';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    // astroSpaceship(websiteConfig)  // 暂时禁用以生成类型定义
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  },

  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'static', // Static site generation
});