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
    },
  },
  plugins: [],
}
