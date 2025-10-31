import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwind from '@astrojs/tailwind';

import vercel from '@astrojs/vercel';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // 网站地址（必须配置，用于生成 sitemap 和 RSS）
  site: 'https://astrosupabase.vercel.app',
  
  integrations: [
    react(), 
    tailwind(),
    // Sitemap 自动生成
    sitemap(),
  ],
  
  output: 'server',
  adapter: vercel(),
});