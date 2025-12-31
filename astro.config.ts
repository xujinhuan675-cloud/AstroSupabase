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
  
  // 关键变更：从 'server' 改为 'static'，实现静态优先
  // 大部分页面在构建时预渲染为静态 HTML，部署到 Edge CDN
  // 动态页面（dashboard、auth、api）通过 prerender: false 保持 SSR
  output: 'static',
  adapter: vercel({
    // 启用图片优化服务
    imageService: true,
    // 启用 ISR（增量静态再生成）- 可选
    // 允许在不重新部署的情况下更新静态页面
    isr: {
      // 页面缓存 1 小时后重新验证
      expiration: 60 * 60,
    },
  }),
  
  // 构建优化
  build: {
    // 自动内联小于 4KB 的样式表
    inlineStylesheets: 'auto',
  },
  
  // Vite 构建优化
  vite: {
    build: {
      // 代码分割策略：分离大型依赖
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'd3-vendor': ['d3'],
          },
        },
      },
      // 使用 esbuild 压缩（更快）
      minify: 'esbuild',
      cssMinify: true,
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['d3'], // D3 按需加载，不预构建
    },
  },
});