# Astro Supabase Blog Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Astro](https://img.shields.io/badge/Astro-5.7.13-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.7-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49.5-181818?logo=supabase&logoColor=white)](https://supabase.com/)

A modern blog starter built with Astro, featuring Supabase authentication, Markdown-based content management, and styled with Tailwind CSS.

## ✨ Features

- 🔐 User authentication with Supabase
- 📝 Complete blog post management with Markdown support
- 🎨 Clean, responsive design optimized for readability
- ⚡ Blazing fast performance with Astro
- 🛠️ Built with TypeScript for type safety and better developer experience
- 🌟 SEO-optimized with automatic sitemap generation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn or npm
- Supabase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/calpa/astro-supabase-blog-starter.git
   cd astro-supabase-blog-starter
   ```

2. Install dependencies
   ```bash
   yarn install
   # or
   npm install
   ```

3. Set up environment variables
   Copy `.env.example` to `.env` and update with your Supabase credentials:
   ```env
   PUBLIC_SUPABASE_URL=your_supabase_project_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_database_connection_string
   PUBLIC_SITE_URL=http://localhost:4321
   ```

4. Start the development server
   ```bash
   yarn dev
   ```
   Your app will be available at [http://localhost:4321](http://localhost:4321)

## 📂 Project Structure

```
/
├── public/               # Static files
├── src/
│   ├── components/       # Shared components
│   │   ├── auth/         # Authentication components
│   │   └── dashboard/    # Admin dashboard components
│   ├── db/               # Database related
│   ├── layout/           # Layout components
│   ├── lib/              # Utility functions
│   ├── middleware.ts     # Application middleware
│   └── pages/            # Page components
│       ├── api/          # API routes
│       ├── auth/         # Authentication pages
│       ├── dashboard/    # Admin dashboard pages
│       └── articles/     # Article pages
├── .env.example          # Environment variables example
├── package.json          # Project dependencies
└── tsconfig.json         # TypeScript configuration
```

## 🧑‍💻 Development Commands

| Command                 | Description                                    |
| :--------------------- | :-------------------------------------------- |
| `npm install`          | Install dependencies                          |
| `npm run dev`          | Start development server (http://localhost:4321) |
| `npm run build`        | Build for production (outputs to `./dist`)    |
| `npm run build:full`   | **Pre-render + build** (recommended for deployment) |
| `npm run preview`      | Preview production build                      |
| `npm run pre-render`   | Multi-threaded pre-render all articles        |
| `npm run import:git`   | Import Markdown from Git repository           |
| `npm run deploy:full`  | Import + pre-render + deploy to Vercel        |

## 🚀 Deployment (Cloud Auto Pre-rendering)

**This project is configured for automatic cloud pre-rendering on Vercel.**

### Simple Deployment (Recommended)

Just push to GitHub, and Vercel will automatically:
1. ✅ Pre-render all articles (multi-threaded)
2. ✅ Build the site
3. ✅ Deploy

```bash
git add .
git commit -m "Update content"
git push
```

**That's it!** No local configuration needed. Vercel uses its environment variables automatically.

### Performance Benefits

- **41x faster** first-time page loads (< 100ms vs 4138ms)
- **10x faster** cached page loads
- Multi-threaded Markdown processing
- Automatic database caching

For detailed deployment information, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 🔒 Environment Variables

Create a `.env` file based on `.env.example` and set the following variables:

- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `DATABASE_URL`: Database connection string
- `PUBLIC_SITE_URL`: Your site URL (usually http://localhost:4321 in development)

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [Astro](https://astro.build/) - The all-in-one web framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework

---

<p align="center">
  <a href="https://github.com/calpa/astro-supabase-blog-starter/stargazers">
    <img src="https://img.shields.io/github/stars/calpa/astro-supabase-blog-starter?style=social" alt="GitHub Stars">
  </a>
  <a href="https://github.com/calpa/astro-supabase-blog-starter/forks">
    <img src="https://img.shields.io/github/forks/calpa/astro-supabase-blog-starter?style=social" alt="GitHub Forks">
  </a>
  <a href="https://github.com/calpa/astro-supabase-blog-starter/issues">
    <img src="https://img.shields.io/github/issues/calpa/astro-supabase-blog-starter" alt="GitHub Issues">
  </a>
</p>
