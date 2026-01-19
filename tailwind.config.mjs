/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1200px',
      '2xl': '1400px',
    },
    extend: {
      colors: {
        // 紫色渐变主题
        primary: {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // 功能色
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: '#0EA5E9',
          light: '#38BDF8',
          dark: '#0284C7',
        },
        // 特色卡片背景
        card: {
          purple: '#F5F3FF',
          yellow: '#FEF3C7',
          green: '#DCFCE7',
          blue: '#E0F2FE',
        },
      },
      spacing: {
        'touch': '44px', // 最小触摸目标尺寸
      },
      fontSize: {
        'mobile-h1': '1.75rem', // 28px
        'mobile-h2': '1.5rem',  // 24px
        'mobile-h3': '1.25rem', // 20px
      },
      lineHeight: {
        'mobile': '1.75',
      },
      boxShadow: {
        'primary': '0 2px 8px rgba(139, 92, 246, 0.2)',
        'primary-lg': '0 4px 12px rgba(139, 92, 246, 0.3)',
      },
    },
  },
  plugins: [],
}
