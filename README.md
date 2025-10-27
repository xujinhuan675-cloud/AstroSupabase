# 🌌 Hybrid Blog - Obsidian + Supabase

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Astro](https://img.shields.io/badge/Astro-5.7.13-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49.5-181818?logo=supabase&logoColor=white)](https://supabase.com/)

A powerful hybrid blog system that combines **Obsidian vault management** with **dynamic article publishing**. Get the best of both worlds: static knowledge management and dynamic content creation.

---

## ✨ Features

### 📝 Obsidian Vault (Static Notes)
- **Wiki Links**: Full support for `[[wikilinks]]` between notes
- **Backlinks**: Automatic bidirectional linking
- **Tags System**: Organize with tags and frontmatter
- **File Tree Navigation**: Browse your knowledge base easily
- **Markdown Support**: Full Obsidian-compatible markdown
- **Fast Performance**: Static generation with Astro

### 📰 Dynamic Articles (Database)
- **Web Dashboard**: Manage articles via browser
- **WYSIWYG Editor**: Rich text editing interface
- **User Authentication**: Secure Supabase auth
- **CRUD Operations**: Create, read, update, delete articles
- **Real-time Updates**: Instant content publishing
- **PostgreSQL + Drizzle**: Type-safe database operations

### 🎨 Shared Features
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **SEO Optimized**: Meta tags and sitemaps
- **Lightning Fast**: Astro hybrid rendering (static + SSR)
- **Beautiful UI**: Modern, clean design
- **Type Safety**: Full TypeScript support

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm (included with Node.js)
- Supabase account (for dynamic articles)

### Installation

#### Option 1: 使用快捷脚本（推荐 Windows 用户）⭐

**首次使用**：
1. 双击运行 `dev-install.ps1` 安装依赖
2. 创建 `.env` 文件并配置 Supabase 信息
3. 双击运行 `dev-local.ps1` 启动开发服务器

**日常开发**：
- 双击 `dev-local.ps1` 即可启动

> 详细说明请查看 [启动脚本说明.md](./启动脚本说明.md)

#### Option 2: 传统命令行方式

   ```bash
# Clone the repository
git clone https://github.com/yourname/astro-supabase-blog.git
cd astro-supabase-blog

# Install dependencies
   npm install

# Set up environment variables
# Create .env file with your Supabase credentials

# Start development server (需要先设置 PWD 环境变量)
npm run dev
```

#### 解决 Windows "PWD is not set" 错误

如果遇到 `Error: PWD is not set` 错误，请使用提供的脚本：
- 使用 `dev-local.ps1` 替代 `npm run dev`
- 脚本会自动设置所需的环境变量

Visit `http://localhost:4321` 🎉

---

## 📂 Project Structure

```
astro-supabase-blog/
├── src/
│   ├── collections/          # Content collections config
│   ├── components/           # Reusable components
│   ├── content/
│   │   ├── vault/           # 📝 Your Obsidian notes here!
│   │   ├── authors/         # Author metadata
│   │   └── tags/            # Tag definitions
│   ├── db/                  # Database schema
│   ├── pages/
│   │   ├── vault/          # Obsidian note pages
│   │   ├── articles/       # Database article pages
│   │   └── dashboard/      # Admin dashboard
│   ├── styles/             # Global styles
│   └── lib/                # Utilities
├── website.config.json     # Site configuration
├── astro.config.ts         # Astro configuration
└── package.json
```

---

## 📝 Adding Content

### Option 1: Obsidian Notes (Recommended for Knowledge Base)

1. Add `.md` files to `src/content/vault/`
2. Include frontmatter:
   ```markdown
   ---
   title: My Note
   description: A brief description
   tags: ["obsidian", "notes"]
   publish: true
   author: default
   ---

   # My Note Content

   Use [[wiki-links]] to connect notes!
   ```
3. Commit and deploy

### Option 2: Database Articles (Recommended for Blog Posts)

1. Login at `/auth/login`
2. Go to `/dashboard`
3. Click "New Article"
4. Write and publish via web interface

---

## 🎯 Use Cases

### Perfect for:
- 📚 **Digital Gardens**: Publish your Obsidian vault as a website
- 🎓 **Documentation Sites**: Combine static docs with dynamic updates
- ✍️ **Personal Blogs**: Mix knowledge notes with blog articles
- 👥 **Team Knowledge Bases**: Collaborate via dashboard, curate via Obsidian
- 🔬 **Research Notes**: Static research with dynamic announcements

---

## 🛠️ Development

### Commands

| Command | Action |
|---------|--------|
| `yarn dev` | Start dev server at `localhost:4321` |
| `yarn build` | Build for production to `./dist` |
| `yarn preview` | Preview production build |
| `yarn astro sync` | Sync content collections |

### Tech Stack

- **Framework**: [Astro](https://astro.build/) 5.7+
- **UI Library**: [React](https://react.dev/) 19.1+
- **Styling**: [TailwindCSS](https://tailwindcss.com/) 4.1+
- **Database**: [Supabase](https://supabase.com/) + PostgreSQL
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Content**: [astro-spaceship](https://github.com/aitorllj93/astro-theme-spaceship) + [astro-loader-obsidian](https://github.com/aitorllj93/astro-loader-obsidian)

---

## 🔒 Environment Variables

Create a `.env` file:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_connection_string

# Site Configuration
PUBLIC_SITE_URL=http://localhost:4321

# Optional: Custom vault directory
OBSIDIAN_VAULT_DIR=./src/content/vault
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Compatible with:
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted with Node.js

---

## 📖 Documentation

- **[Migration Guide](./MIGRATION-GUIDE.md)** - How this project was created
- **[Configuration Guide](./website.config.json)** - Customize your site
- **[API Reference](./src/db/schema.ts)** - Database schema

---

## 🎨 Customization

### Themes

Edit `src/styles/theme.default.css` to customize colors:

```css
:root {
  --theme-primary: #06b6d4;
  --theme-bg-main: #ffffff;
  /* ... */
}
```

### Layout

Modify `src/layout/Layout.astro` for global layout changes.

### Components

All components in `src/components/` are customizable.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Astro](https://astro.build/) - Amazing web framework
- [astro-spaceship](https://github.com/aitorllj93/astro-theme-spaceship) - Obsidian support
- [Supabase](https://supabase.com/) - Backend infrastructure
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS
- Original [astro-supabase-blog-starter](https://github.com/calpa/astro-supabase-blog-starter)

---

## 📬 Contact

Have questions? Open an issue or reach out!

---

**Made with ❤️ using Astro, React, and Supabase**

[⬆ Back to top](#-hybrid-blog---obsidian--supabase)
