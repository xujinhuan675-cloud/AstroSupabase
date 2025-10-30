# 🌱 AstroSupabase + Quartz 数字花园

[![Astro](https://img.shields.io/badge/Astro-5.7.13-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Quartz](https://img.shields.io/badge/Quartz-Integrated-6366F1)](https://quartz.jzhao.xyz/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

一个集成了 Quartz 数字花园特性的 Astro + Supabase 博客系统，支持双向链接、知识图谱和 Obsidian 工作流。

## ✨ 特性

- 🔗 **双向链接**：使用 `[[链接]]` 语法建立文章关联
- 🌐 **知识图谱**：可视化展示文章关系网络
- 🔙 **反向链接**：自动显示引用当前文章的其他文章
- 🏷️ **智能标签**：支持 frontmatter 和 #标签 两种方式
- 📝 **Markdown 增强**：完整支持 GFM 和 Obsidian 语法
- 🔄 **Obsidian 集成**：无缝对接 Obsidian 工作流
- 🎨 **现代 UI**：基于 Tailwind CSS 的精美界面
- ⚡ **高性能**：Astro SSR + PostgreSQL 全文搜索

## 📁 文章存放位置

### 推荐位置（本地 Markdown 文件）

```
F:\IOTO-Doc\AstroSupabase\content\articles\
```

这是专门为本地 Markdown 文件准备的目录。

### 从 IOTO 框架导入

你也可以从 IOTO 框架的任何目录导入：
- `F:\IOTO-Doc\1-Input\2-碎片笔记\`
- `F:\IOTO-Doc\1-Input\4-系统笔记\`
- `F:\IOTO-Doc\2-Output\2-卡片笔记\`

### Web 界面创建

访问 http://localhost:4321/dashboard/article/new 在线创建。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd F:\IOTO-Doc\AstroSupabase
npm install
```

### 2. 配置数据库

执行 `drizzle/0003_add_links_support.sql` 中的迁移脚本。

### 3. 创建文章

在 `content/articles/` 目录创建 Markdown 文件：

```markdown
---
title: "我的第一篇笔记"
slug: "my-first-note"
excerpt: "这是一篇测试笔记"
tags: [测试, 笔记]
status: published
---

# 我的第一篇笔记

这是正文内容。

使用 [[双向链接]] 连接其他文章。

使用 #标签 标记内容。
```

### 4. 导入文章

```bash
npm run import
```

### 5. 启动服务

```bash
npm run dev
```

访问：
- 首页：http://localhost:4321
- 知识图谱：http://localhost:4321/graph

## 📖 文档

- [**QUICKSTART.md**](./QUICKSTART.md) - 快速开始指南 ⭐ **推荐阅读**
- [**QUARTZ_USAGE_GUIDE.md**](./QUARTZ_USAGE_GUIDE.md) - 完整使用手册
- [**QUARTZ_INTEGRATION_PLAN.md**](./QUARTZ_INTEGRATION_PLAN.md) - 技术实现方案

## 🎯 核心功能

### 双向链接

```markdown
[[文章标题]]              # 基础链接
[[文章标题|别名]]          # 带别名的链接
```

链接会自动解析并建立数据库关系。

### 知识图谱

访问 `/graph` 查看可交互的知识图谱：
- 点击节点跳转到文章
- 拖拽节点调整位置
- 滚轮缩放查看
- 悬停高亮关联节点

### 反向链接

每篇文章底部自动显示所有链接到它的其他文章。

### 标签系统

两种标签方式：

**Frontmatter 标签**：
```yaml
tags: [标签1, 标签2]
```

**内容标签**：
```markdown
这篇文章讨论了 #数字花园 和 #知识管理。
```

## 📂 项目结构

```
AstroSupabase/
├── content/
│   └── articles/              # 📍 本地 Markdown 文件存放处
│       ├── example.md
│       └── your-article.md
├── scripts/
│   └── import-markdown.ts     # 导入脚本
├── src/
│   ├── components/
│   │   ├── Backlinks.tsx      # 反向链接组件
│   │   └── KnowledgeGraph.tsx # 知识图谱组件
│   ├── lib/
│   │   ├── markdown-processor.ts  # Markdown 处理
│   │   └── links-service.ts       # 链接管理
│   ├── pages/
│   │   ├── articles/[id].astro    # 文章页面
│   │   ├── graph.astro            # 图谱页面
│   │   └── api/
│   │       ├── graph-data.ts      # 图谱数据 API
│   │       ├── articles/[id]/
│   │       │   ├── backlinks.ts   # 反向链接 API
│   │       │   └── forward-links.ts
│   │       └── tags/
│   │           ├── index.ts       # 标签列表 API
│   │           └── [tag].ts       # 标签文章 API
│   └── db/
│       └── schema.ts              # 数据库 Schema
└── drizzle/
    └── 0003_add_links_support.sql # 数据库迁移
```

## 🛠️ 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm run import` | 导入 Markdown 文件 |
| `npm run db:push` | 推送数据库 Schema |
| `npm run db:generate` | 生成数据库迁移 |

## 🔄 与 Obsidian 集成

### 方式一：导出导入

1. 在 Obsidian 中编辑
2. 复制到 `content/articles/`
3. 运行 `npm run import`

### 方式二：直接使用

将 Obsidian Vault 设为 `F:\IOTO-Doc\AstroSupabase\content`。

### 方式三：软链接

```powershell
New-Item -ItemType SymbolicLink -Path "content\ioto" -Target "F:\IOTO-Doc\1-Input\4-系统笔记"
```

## 🎨 技术栈

- **框架**：Astro 5.7 + React 19
- **数据库**：PostgreSQL (Supabase)
- **ORM**：Drizzle ORM
- **样式**：Tailwind CSS
- **Markdown**：unified + remark + rehype
- **图谱**：react-force-graph-2d
- **部署**：Vercel

## 📊 API 端点

- `GET /api/articles` - 获取文章列表
- `GET /api/articles/{id}` - 获取单篇文章
- `GET /api/articles/{id}/backlinks` - 获取反向链接
- `GET /api/articles/{id}/forward-links` - 获取前向链接
- `GET /api/graph-data` - 获取图谱数据
- `GET /api/tags` - 获取所有标签
- `GET /api/tags/{tag}` - 按标签查询文章

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

## 🎉 开始使用

```bash
# 1. 安装依赖
npm install

# 2. 导入示例文章
npm run import

# 3. 启动开发服务器
npm run dev

# 4. 访问知识图谱
# http://localhost:4321/graph
```

**祝你构建出色的数字花园！🌱**

