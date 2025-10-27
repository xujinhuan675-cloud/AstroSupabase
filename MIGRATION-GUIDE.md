# 🎯 AstrOb → astro-supabase-blog 迁移指南

> 混合模式迁移完成 - 同时支持 Obsidian Vault 和数据库文章管理

## 📋 迁移概述

本项目已成功整合 **AstrOb** 的 Obsidian 知识库功能和原有的 **astro-supabase-blog** 动态文章管理功能，实现了两种内容管理方式的完美结合。

### ✨ 迁移后的功能

#### 🔹 Obsidian Vault 功能（来自 AstrOb）
- ✅ Wiki 链接支持 `[[note-name]]`
- ✅ 标签系统和分类
- ✅ 反向链接（Backlinks）
- ✅ 文件树导航
- ✅ 主题切换（亮色/暗色模式）
- ✅ Markdown 全功能支持
- ✅ 静态生成，超快速度

#### 🔹 数据库文章功能（原有）
- ✅ Web 后台管理界面
- ✅ 用户认证系统（Supabase Auth）
- ✅ 在线文章编辑器
- ✅ 文章 CRUD 操作
- ✅ Drizzle ORM + PostgreSQL
- ✅ 动态数据管理

---

## 🏗️ 项目结构

```
astro-supabase-blog/
├── src/
│   ├── collections/          # Content collections 配置
│   │   ├── authors.ts        # 作者集合
│   │   ├── documents.ts      # Obsidian 文档集合
│   │   └── tags.ts           # 标签集合
│   ├── components/
│   │   ├── auth/             # 认证组件
│   │   ├── dashboard/        # 后台管理组件
│   │   ├── ArticleCard.astro
│   │   └── ThemeToggle.astro # 主题切换组件
│   ├── content/              # 内容目录
│   │   ├── vault/            # 📝 Obsidian 笔记目录
│   │   │   ├── welcome.md
│   │   │   └── getting-started.md
│   │   ├── authors/          # 作者元数据
│   │   └── tags/             # 标签元数据
│   ├── content.config.ts     # Content collections 配置
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts         # 数据库表定义
│   ├── pages/
│   │   ├── vault/            # 📚 Obsidian 笔记页面
│   │   │   ├── [...slug].astro
│   │   │   └── index.astro
│   │   ├── articles/         # 📰 数据库文章页面
│   │   ├── dashboard/        # 后台管理页面
│   │   ├── tags/             # 标签页面
│   │   └── index.astro       # 首页（整合两种内容）
│   ├── styles/
│   │   ├── global.css        # 全局样式（已整合）
│   │   └── theme.default.css # 默认主题
│   └── lib/
│       ├── supabase.ts
│       └── articles.ts
├── website.config.json       # 网站配置
├── astro.config.ts           # Astro 配置（已集成 astro-spaceship）
├── package.json              # 已添加所需依赖
└── README.md
```

---

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
cd astro-supabase-blog
yarn install
# 或
npm install
```

### 2️⃣ 环境变量配置

创建 `.env` 文件：

```env
# Supabase 配置（用于数据库文章和认证）
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_connection_string

# 网站配置
PUBLIC_SITE_URL=http://localhost:4321

# Obsidian Vault 目录（可选，默认为 ./src/content/vault）
OBSIDIAN_VAULT_DIR=./src/content/vault
```

### 3️⃣ 添加 Obsidian 笔记

将您的 Obsidian 笔记复制到 `src/content/vault/` 目录：

```markdown
---
title: 我的第一篇笔记
description: 这是一篇测试笔记
tags: ["测试", "Obsidian"]
publish: true
author: default
---

# 我的笔记

这是正文内容。

可以使用 [[其他笔记]] 创建链接。

#标签 也会自动识别。
```

### 4️⃣ 启动开发服务器

```bash
yarn dev
```

访问 `http://localhost:4321`

---

## 📚 使用指南

### 内容管理方式对比

| 特性 | Obsidian Vault | 数据库文章 |
|------|---------------|-----------|
| **管理方式** | 本地 Markdown 文件 | Web 后台界面 |
| **编辑工具** | Obsidian / VS Code | 在线编辑器 |
| **内容类型** | 知识笔记、文档 | 博客文章、公告 |
| **链接方式** | `[[wiki-links]]` | `/articles/[id]` |
| **部署方式** | Git 提交后自动部署 | 实时更新 |
| **适用场景** | 个人知识库、文档系统 | 动态内容、团队协作 |

### 📝 添加 Obsidian 笔记

1. 在 `src/content/vault/` 创建 `.md` 文件
2. 添加 frontmatter：
   ```yaml
   ---
   title: 笔记标题
   description: 简短描述
   tags: ["标签1", "标签2"]
   publish: true
   author: default
   ---
   ```
3. 编写内容，使用 `[[链接]]` 连接笔记
4. Git 提交，自动部署

### 📰 管理数据库文章

1. 访问 `/auth/login` 登录
2. 进入 `/dashboard` 后台
3. 点击"新建文章"
4. 使用编辑器创建内容
5. 发布或保存草稿

### 🎨 主题切换

- 点击右上角 🌙/☀️ 图标切换明暗模式
- 主题设置会自动保存到 localStorage

### 🔍 浏览内容

- **首页** (`/`): 同时展示两种内容
- **Vault 笔记** (`/vault`): 浏览所有 Obsidian 笔记
- **数据库文章** (`/articles`): 查看所有数据库文章
- **标签** (`/tags/[tag]`): 按标签浏览笔记

---

## 🎯 路由说明

### Vault 相关路由
- `/vault` - Obsidian 笔记列表
- `/vault/[slug]` - 单个笔记页面
- `/tags/[tag]` - 标签筛选页面

### 文章相关路由
- `/articles` - 文章列表
- `/articles/[id]` - 单篇文章
- `/dashboard` - 后台管理首页
- `/dashboard/article/new` - 创建新文章
- `/dashboard/article/[id]` - 编辑文章

### 认证路由
- `/auth/login` - 登录
- `/auth/signup` - 注册
- `/auth/signout` - 登出

---

## ⚙️ 配置说明

### website.config.json

```json
{
  "title": "My Knowledge Base",
  "description": "A hybrid blog combining Obsidian vault and dynamic articles",
  "author": "Your Name",
  "defaultLocale": "en"
}
```

### astro.config.ts

已集成 `astro-spaceship` 和 React：

```typescript
export default defineConfig({
  integrations: [
    react(),
    astroSpaceship(websiteConfig)
  ],
  output: 'hybrid', // 混合模式：静态 + SSR
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
})
```

---

## 📦 新增依赖

迁移后新增的 npm 包：

```json
{
  "alpinejs": "^3.15.0",
  "astro-loader-obsidian": "^0.9.1",
  "astro-spaceship": "^0.9.8",
  "sharp": "^0.32.5",
  "spaceship-monolith": "^0.9.8",
  "varlock": "^0.0.15"
}
```

---

## 🎨 样式系统

### 全局样式

- 使用 TailwindCSS 作为基础
- 支持明暗模式切换
- 使用 CSS 变量定义主题颜色
- 自动导入 `spaceship-monolith` 主题

### 主题变量

```css
:root {
  --theme-primary: #06b6d4;
  --theme-bg-main: #ffffff;
  --theme-text-primary: #111827;
  /* ... */
}

.dark {
  --theme-primary: #22d3ee;
  --theme-bg-main: #0f172a;
  --theme-text-primary: #f1f5f9;
  /* ... */
}
```

---

## 🚢 部署指南

### Vercel 部署（推荐）

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量（同 `.env` 文件）
3. 构建命令：`yarn build` 或 `npm run build`
4. 输出目录：`dist`
5. 自动部署

### 环境变量设置

在 Vercel Dashboard 设置：
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `PUBLIC_SITE_URL`

---

## 🔧 开发命令

| 命令 | 说明 |
|------|------|
| `yarn dev` | 启动开发服务器 |
| `yarn build` | 构建生产版本 |
| `yarn preview` | 预览生产构建 |
| `yarn astro sync` | 同步 content collections |

---

## 🎉 迁移完成！

现在您可以：
- ✅ 在 Obsidian 中管理知识笔记
- ✅ 通过 Web 后台发布动态文章
- ✅ 享受两种内容管理方式的优势
- ✅ 统一的用户体验和设计

### 下一步

1. 添加您的第一篇 Obsidian 笔记
2. 通过 Dashboard 创建第一篇文章
3. 自定义主题和样式
4. 部署到生产环境

---

## 🆘 常见问题

### Q: Obsidian 笔记不显示？
A: 确保笔记的 frontmatter 中 `publish: true`

### Q: Wiki 链接不工作？
A: 检查目标笔记的文件名是否匹配，链接格式为 `[[file-name]]`

### Q: 数据库文章无法创建？
A: 检查 Supabase 环境变量是否配置正确，数据库表是否已创建

### Q: 主题切换不生效？
A: 清除浏览器缓存，确保 `ThemeToggle.astro` 组件已正确引入

---

## 📖 参考资料

- [Astro 官方文档](https://docs.astro.build/)
- [astro-spaceship 文档](https://github.com/aitorllj93/astro-theme-spaceship)
- [Supabase 文档](https://supabase.com/docs)
- [TailwindCSS 文档](https://tailwindcss.com/)

---

**🎊 享受您的混合博客系统！**

