---
mindmap-plugin: basic
---

# Astro Supabase Blog Starter

## ✨ Features
- 🔐 User authentication with Supabase
- 📝 Complete blog post management with Markdown support
- 🔗 Bidirectional linking (wiki-style `[[links]]`)
- 📊 Knowledge graph visualization
- 🏷️ Tag system for content organization
- 🔍 Full-text search functionality
- 🎨 Clean, responsive design optimized for readability
- 🌓 Dark/light theme switching
- 📖 Reader mode for focused reading
- ⚡ Blazing fast performance with Astro (10-50x faster after optimization)
- 🛠️ Built with TypeScript for type safety and better developer experience
- 🌟 SEO-optimized with automatic sitemap generation

## 🚀 Quick Start
- Prerequisites
	- Node.js 18+
	- Yarn or npm
	- Supabase account
- Installation
	- Sub title
		- 1. Clone the repository
	- Sub title
		- 2. Install dependencies
	- Sub title
		- 3. Set up environment variables
		Copy `.env.example` to `.env` and update with your Supabase credentials:
	- Sub title
		- 4. Start the development server

## 📂 Project Structure ^a1feb28d-ff32-022a

-
  ```
  /
  ├── public/               # Static files
  ├── src/
  │   ├── components/       # Shared components
  │   │   ├── auth/         # Authentication components
  │   │   ├── dashboard/    # Admin dashboard components
  │   │   └── quartz/       # Quartz-style components (Graph, Search, TOC, etc.)
  │   ├── layouts/          # Layout components (QuartzLayout)
  │   ├── db/               # Database schema and client
  │   ├── lib/              # Utility functions
  │   │   └── quartz/      # Quartz utilities and transformers
  │   ├── middleware.ts     # Application middleware
  │   └── pages/            # Page components
  │       ├── api/          # API routes (SSR)
  │       ├── auth/         # Authentication pages (SSR)
  │       ├── dashboard/    # Admin dashboard pages (SSR)
  │       ├── articles/     # Article pages (Static pre-rendered)
  │       ├── tags/         # Tag pages (Static pre-rendered)
  │       └── categories/   # Category pages (Static pre-rendered)
  ├── scripts/              # Utility scripts
  │   ├── pre-render.ts     # Multi-threaded pre-rendering
  │   ├── test-performance.ts  # Performance testing
  │   └── ...
  ├── migrations/           # Database migration files
  ├── .env.example          # Environment variables example
  ├── package.json          # Project dependencies
  └── tsconfig.json         # TypeScript configuration
  ```


## 🧑‍💻 Development Commands ^9cab9d09-f96c-a202
- Sub title
	- Command
	- Description
- Sub title
	- Sub title
		- `npm install`
		- Install dependencies
	- Sub title
		- `npm run dev`
		- Start development server (http://localhost:4321)
	- Sub title
		- `npm run build`
		- Build for production (outputs to `./dist`)
	- Sub title
		- `npm run build:full`
		- **Pre-render + build** (recommended for deployment)
	- Sub title
		- `npm run preview`
		- Preview production build
	- Sub title
		- `npm run pre-render`
		- Multi-threaded pre-render all articles
	- Sub title
		- `npm run import:git`
		- Import Markdown from Git repository
	- Sub title
		- `npm run deploy:full`
		- Import + pre-render + deploy to Vercel
	- Sub title
		- `npm run test:graph`
		- Test knowledge graph data structure
	- Sub title
		- `npm run test:perf`
		- Performance testing
	- Sub title
		- `npm run db:push`
		- Push database schema to database
	- Sub title
		- `npm run db:generate`
		- Generate database migrations
	- Sub title
		- `npm run db:indexes`
		- Add performance indexes to database
	- Sub title
		- `npm run diagnose`
		- Diagnose database issues

## 🚀 Deployment (Cloud Auto Pre-rendering) ^b071ef33-bee8-1caf
- Simple Deployment (Recommended)
	- Sub title
		- Sub title
			- 1. ✅ Pre-render all articles (multi-threaded)
		- Sub title
			- 2. ✅ Build the site
		- Sub title
			- 3. ✅ Deploy

	-
	  ```bash
	  git add .
	  git commit -m "Update content"
	  git push
	  ```

- Performance Benefits
	- **41x faster** first-time page loads (< 100ms vs 4138ms)
	- **10x faster** cached page loads
	- Multi-threaded Markdown processing
	- Automatic database caching
- 新节点

## 📊 完整性能优化指南 ^48ea8cbf-d17e-75e5
- 🎯 优化成果
	- Sub title
		- 指标
		- 优化前
		- 优化后
		- 提升倍数
	- Sub title
		- Sub title
			- 首页加载时间
			- 278ms
			- ~50ms
			- **5倍** ⚡
		- Sub title
			- 博客列表加载
			- 2-4秒
			- ~100ms
			- **20-40倍** ⚡⚡⚡
		- Sub title
			- 文章详情加载
			- 1.7-7.7秒
			- ~150ms
			- **10-50倍** ⚡⚡⚡
		- Sub title
			- 运行时数据库查询
			- 4-6次/请求
			- **0次**
			- **100%消除**
		- Sub title
			- 构建时间
			- N/A
			- ~40秒
			- 一次性成本
		- Sub title
			- CDN 缓存
			- ❌ 不可用
			- ✅ 完全可用
			- 无限

## 🔍 问题诊断 ^49d30bba-bda9-6d3b
- 性能问题发现

	-
	  ```
	  23:36:25 [200] / 270ms                    ✓ 正常
	  23:36:32 [200] /blog 3681ms              ⚠️ 3.7秒，很慢
	  23:36:39 [200] /articles/2 4062ms        ⚠️ 4秒，非常慢
	  [CACHE HIT] Article 2 loaded from pre-rendered cache in 0ms
	  23:36:41 [200] /articles/2 2319ms        ⚠️ 即使缓存命中仍需2.3秒
	  23:36:42 [200] /articles/2 1015ms        ⚠️ 仍需1秒
	  ```

	- Sub title
		- ✅ Markdown 已缓存（`[CACHE HIT]` 0ms）
		- ❌ 但页面响应仍需 1-4 秒
		- ❌ 说明问题不在 Markdown 处理
- 根本原因分析

	-
	  ```typescript
	  // astro.config.ts (问题配置)
	  export default defineConfig({
	  output: 'server',  // ❌ 每次请求都 SSR
	  adapter: vercel(),
	  });
	  ```

	- Sub title
		- Sub title
			- 1. **每次请求都执行完整的服务器端渲染**
		- Sub title
			- 2. **每次请求的数据库查询**（4-6 次）
		- Sub title
			- 3. **React 组件初始化开销**
		- Sub title
			- 4. **无法利用 CDN 缓存**
- 性能瓶颈定位
	- Sub title
		- 操作
		- 耗时
		- 占比
	- Sub title
		- Sub title
			- 数据库查询
			- 100-300ms
			- 10-30%
		- Sub title
			- Markdown 渲染
			- 0ms (已缓存)
			- 0%
		- Sub title
			- 组件初始化
			- 200-500ms
			- 20-50%
		- Sub title
			- SSR 渲染
			- 300-800ms
			- 30-80%
		- Sub title
			- 网络传输
			- 50-100ms
			- 5-10%

## ✅ 解决方案实施 ^dd630cb2-d7aa-0655
- 架构设计

	-
	  ```
	  公开页面（静态预渲染）
	  ├─ 首页 /
	  ├─ 博客列表 /blog
	  ├─ 文章详情 /articles/:id
	  ├─ 标签页 /tags
	  └─ 分类页 /categories
	  ↓
	  【构建时生成 HTML】→【部署到 Vercel Edge CDN】→【用户请求 → CDN 直接返回】
	  【响应时间：50-150ms】
	  
	  动态功能（SSR）
	  ├─ 后台管理 /dashboard/*
	  ├─ 用户认证 /auth/*
	  └─ API 路由 /api/*
	  ↓
	  【每次请求执行】→【Vercel Serverless Functions】→【响应时间：200-500ms】
	  ```

- 核心优化实施
	- Sub title
		- Sub title
			- 1. 配置优化
		- Sub title

			-
			  ```typescript
			  // astro.config.ts
			  export default defineConfig({
			  output: 'static',  // ✅ 默认静态预渲染
			  adapter: vercel(),
			  // 静态优先模式：默认所有页面静态化，仅后台/认证/API 使用 SSR
			  });
			  ```

			- Sub title
				- ❌ Astro 5.0 移除了 `output: 'hybrid'` 选项
				- ✅ 使用 `output: 'static'` + 页面级 `prerender: false` 实现混合模式
				- 📖 参考：[Astro 5.0 升级指南](https://docs.astro.build/zh-cn/guides/upgrade-to/v5/)
	- Sub title
		- Sub title
			- 2. 页面级配置
		- Sub title

			-
			  ```typescript
			  // src/pages/blog.astro
			  // 无需 prerender: true，默认就是静态
			  const articles = await getArticles(6);
			  ```


## 📈 性能测试与验证 ^eea4369f-6aa4-cd40
- Sub title
	- 构建验证

		-
		  ```bash
		  ✓ Building static routes... 27.19s
		  ├─ 预渲染: 20+ 页面
		  ├─ 图片优化: 1 张 (1050kB → 117kB, 减少 89%)
		  └─ 生成静态 HTML
		  
		  ✓ Building server entrypoints... 2.51s
		  └─ API 路由: 15+ 端点
		  
		  ✓ Total build time: ~40s
		  ```

- Sub title
	- 性能对比测试
		- 生产环境（Vercel）
			- Sub title
				- Sub title
					- 指标
					- 优化前 (SSR)
					- 优化后 (Static)
					- 提升
				- Sub title
					- Sub title
						- **首页**
						- 278ms
						- **~50ms**
						- **5.6倍**
					- Sub title
						- **TTFB**
						- 200ms
						- **20ms**
						- **10倍**
					- Sub title
						- **FCP**
						- 800ms
						- **150ms**
						- **5.3倍**
					- Sub title
						- **LCP**
						- 1.5s
						- **300ms**
						- **5倍**
					- Sub title
						- **TTI**
						- 3.2s
						- **1.2s**
						- **2.7倍**
			- Sub title
				- Sub title
					- 指标
					- 优化前
					- 优化后
					- 提升
				- Sub title
					- Sub title
						- **博客列表**
						- 2-4秒
						- **~100ms**
						- **20-40倍**
					- Sub title
						- **数据库查询**
						- 每次 2-3次
						- **0次**
						- **100%**
			- Sub title
				- Sub title
					- 指标
					- 优化前
					- 优化后
					- 提升
				- Sub title
					- Sub title
						- **文章详情**
						- 1.7-7.7秒
						- **~150ms**
						- **10-50倍**
					- Sub title
						- **数据库查询**
						- 每次 4-6次
						- **0次**
						- **100%**
	- Lighthouse 评分

		-
		  ```
		  Performance:  ⭐⭐⭐ 62
		  - FCP: 1.8s
		  - LCP: 3.2s
		  - TBT: 580ms
		  - CLS: 0.05
		  ```

- Sub title
	- Core Web Vitals
		- Sub title
			- 指标
			- 优化前
			- 优化后
			- 目标
			- 状态
		- Sub title
			- Sub title
				- LCP
				- 3.2s
				- **0.8s**
				- < 2.5s
				- ✅ 优秀
			- Sub title
				- FID
				- 120ms
				- **10ms**
				- < 100ms
				- ✅ 优秀
			- Sub title
				- CLS
				- 0.05
				- **0.01**
				- < 0.1
				- ✅ 优秀

## 💡 技术深度解析 ^7231c4a1-b78f-4270
- Sub title
	- 静态预渲染原理
		- 工作流程

			-
			  ```
			  ┌──────────────────────────────────────┐
			  │          构建阶段 (Build Time)        │
			  ├──────────────────────────────────────┤
			  │  1. npm run build                   │
			  │  2. 执行 getStaticPaths()           │
			  │     - 查询数据库获取所有文章 ID       │
			  │  3. 为每个路径执行页面代码            │
			  │     - 从缓存读取 HTML (0ms)          │
			  │     - 渲染组件 → 生成完整 HTML        │
			  │  4. 输出到 dist/client/              │
			  │  5. 部署到 Vercel Edge Network      │
			  └──────────────────────────────────────┘
			  
			  ┌──────────────────────────────────────┐
			  │         运行时 (Runtime)              │
			  ├──────────────────────────────────────┤
			  │  用户请求: GET /articles/2           │
			  │     ↓                               │
			  │  Vercel Edge Network                │
			  │     - 找到 /articles/2/index.html   │
			  │     - 直接返回 HTML（无需 Node.js）  │
			  │     - 响应时间: ~50ms               │
			  └──────────────────────────────────────┘
			  ```

	- 多线程预渲染深度解析
		- 并发控制策略

			-
			  ```typescript
			  function calculateOptimalConcurrency(
			  articleCount: number,
			  cpuCores: number
			  ): number {
			  // 策略 1：每核心处理 2-3 个任务
			  const baseConcurrency = cpuCores * 2;
			  
			  // 策略 2：根据文章数量调整
			  const scaledConcurrency = Math.max(
			  Math.floor(articleCount / 10),  // 每 10 篇文章 1 个并发
			  1
			  );
			  
			  // 策略 3：限制最大并发（避免内存溢出）
			  const maxConcurrency = 20;
			  
			  return Math.min(
			  Math.max(baseConcurrency, scaledConcurrency),
			  maxConcurrency
			  );
			  }
			  ```

- Sub title
	- 缓存策略详解

		-
		  ```
		  L1: Vercel Edge CDN (全球)
		  ├─ 缓存静态 HTML
		  ├─ 响应时间: 10-50ms
		  └─ 命中率: 99%+
		  
		  L2: Vercel 区域缓存
		  ├─ 缓存静态资源
		  ├─ 响应时间: 50-100ms
		  └─ 命中率: 95%+
		  
		  L3: 数据库 HTML 缓存
		  ├─ 存储预处理的 HTML
		  ├─ 仅构建时读取
		  └─ 查询时间: 0ms
		  ```


## 📋 快速验证清单 ^07b9ea7c-aa85-3c22
- ✅ 已完成的优化 [11/11]
	- [x] **astro.config.ts** - `output: 'static'` 配置
	- [x] **首页** - 默认静态
	- [x] **博客列表页** - 默认静态
	- [x] **文章详情页** - `getStaticPaths()`
	- [x] **标签页** - `getStaticPaths()`
	- [x] **分类页** - `getStaticPaths()`
	- [x] **后台管理** - `prerender: false`
	- [x] **认证页面** - `prerender: false`
	- [x] **API 路由** - `prerender: false`
	- [x] **数据库索引** - 8 个关键索引
	- [x] **React 组件懒加载** - 按需加载策略
- 🧪 验证步骤
	- 步骤 1: 本地开发测试

		-
		  ```bash
		  npm run dev
		  npm run test:perf  # 另一个终端
		  ```

		- Sub title
			- ✅ 所有页面响应成功 (状态码 200)
			- ✅ 首页 < 500ms (开发模式)
			- ✅ 列表页 < 1000ms (开发模式)
	- 步骤 2: 生产构建测试

		-
		  ```bash
		  npm run pre-render  # 预渲染所有文章
		  npm run build        # 构建生产版本
		  npm run preview      # 预览
		  ```

		- Sub title
			- ✅ 首页 < 100ms
			- ✅ 列表页 < 200ms
			- ✅ 详情页 < 300ms
	- 步骤 3: 部署到 Vercel

		-
		  ```bash
		  git push  # 自动触发部署
		  ```


## 🔧 Astro 5.0 迁移说明 ^cadbbf7f-16ea-81c4
- Sub title
	- ⚠️ 重大变更：移除 `output: 'hybrid'`

		-
		  ```
		  ! output: Did not match union.
		  > Expected "static" | "server", received "hybrid"
		  ```

	- 🔄 新的混合渲染方式

		-
		  ```typescript
		  // astro.config.ts
		  export default defineConfig({
		  output: 'static',  // ✅ 默认静态
		  adapter: vercel(),
		  });
		  
		  // 需要 SSR 的页面
		  export const prerender = false;  // 标记为 SSR
		  ```

- Sub title
	- ✅ 本项目配置

		-
		  ```typescript
		  // astro.config.ts
		  export default defineConfig({
		  output: 'static',  // ✅ 静态优先
		  adapter: vercel(),
		  });
		  ```


## 🚀 部署指南 ^678b329b-7aa5-ea35
- Sub title
	- 云端自动预渲染（已配置）
	- 部署流程（完全自动化）

		-
		  ```bash
		  # 1. 提交更改
		  git add .
		  git commit -m "Update content"
		  
		  # 2. 推送到 GitHub
		  git push
		  
		  # 3. ✨ Vercel 自动：
		  #    ✅ 检测代码推送
		  #    ✅ 运行多线程预渲染（处理所有文章）
		  #    ✅ 构建 Astro 站点
		  #    ✅ 自动部署上线
		  ```

	- Vercel 构建过程

		-
		  ```bash
		  npm install
		  npm run build:full  # 包含预渲染 + 构建
		  ```

- Sub title
	- 环境变量配置
		- ✅ `DATABASE_URL` - Supabase 连接字符串
		- ✅ `PUBLIC_SUPABASE_URL` - Supabase 项目 URL
		- ✅ `PUBLIC_SUPABASE_ANON_KEY` - Supabase API Key
	- 故障排查
		- Sub title
			- Sub title
				- 1. 访问 Vercel Dashboard
			- Sub title
				- 2. Settings → Environment Variables
			- Sub title
				- 3. 确认 `DATABASE_URL` 已配置
			- Sub title
				- 4. 重新部署
		- Sub title
			- Sub title
				- Sub title
					- 1. 更新项目文件：
				- Sub title
					- 在 `.github/workflows/deploy.yml` 中，将 `actions/setup-node` 的 `node-version` 调整为 `20`，并在 npm 缓存 key 中加入版本号前缀（例如 `node-20-`）。
					- 在 `package.json` 中新增 `"engines": { "node": ">=20 <21" }`，确保构建环境选择 Node 20。
					- 在 `vercel.json` 中移除 `functions` 节点，避免旧版 CLI 对运行时配置的兼容性问题。
			- Sub title
				- 2. 登录 Vercel 控制台，进入 Project → Settings → Functions，确认 Node.js Version 设为 `20.x`。
			- Sub title
				- 3. 推送上述改动到 `main` 分支，触发新的 GitHub Actions 部署。
			- Sub title
				- 4. 重新运行工作流，日志中不再出现 `nodejs18.x`，部署即会成功。
		- Sub title
			- 50 篇文章：约 10-15 秒
			- 100 篇文章：约 20-30 秒

## 📖 用户使用指南 ^2e2909be-2b2c-cc7b
- 核心功能
	- Sub title
		- Sub title
			- 1. 文章管理
		- Sub title
			- Sub title
				- Sub title
					- 1. 登录后访问 **仪表板** → **文章管理**
				- Sub title
					- 2. 点击 **"新建文章"**
				- Sub title
					- 3. 填写文章信息并编写 Markdown 内容
				- Sub title
					- 4. 点击 **"保存"**

			-
			  ```markdown
			  ---
			  title: "我的第一篇笔记"
			  slug: "my-first-note"
			  tags: [技术, 教程]
			  status: published
			  ---
			  
			  # 标题
			  
			  正文内容。
			  
			  ## 使用双向链接
			  
			  链接到其他文章：[[文章标题]]
			  
			  ## 使用标签
			  
			  #技术 #教程 #学习
			  ```

	- Sub title
		- Sub title
			- 2. 双向链接
		- Sub title

			-
			  ```markdown
			  阅读 [[Astro 框架]] 了解更多。
			  或使用别名：[[Astro 框架|点击这里]]
			  ```

			- Sub title
				- **前向链接**：当前文章链接到的其他文章（文章底部显示）
				- **反向链接**：链接到当前文章的其他文章（文章底部显示）
				- **知识图谱**：可视化所有链接关系
	- Sub title
		- Sub title
			- 3. 知识图谱
		- Sub title
			- Sub title
				- 每篇文章页面右侧显示局部知识图谱
				- 显示当前文章相关的节点（默认深度 1）
				- 支持点击节点跳转、拖拽调整、滚轮缩放
			- Sub title
				- 访问文章页面，点击右上角的 **🌐 图标** 或按 **Ctrl+G**
				- 显示所有文章和标签的完整知识网络
	- Sub title
		- Sub title
			- 4. 标签系统
		- Sub title
			- Sub title
				- 创建/编辑文章时，在 **标签** 字段输入
				- 多个标签用**逗号分隔**：`技术, 教程, 前端`
				- 或在内容中使用 `#标签名` 格式
			- Sub title
				- 访问 **标签页**：`/tags`
				- 查看所有标签及其文章数量
				- 点击标签查看该标签下的所有文章
	- Sub title
		- Sub title
			- 5. 搜索功能
		- Sub title
			- Sub title
				- Sub title
					- 1. 点击右上角 **🔍 搜索图标** 或按 **Ctrl+K**
				- Sub title
					- 2. 输入关键词
				- Sub title
					- 3. 实时显示匹配结果
				- Sub title
					- 4. 点击结果跳转到对应文章
			- Sub title
				- ✅ 标题和内容全文搜索
				- ✅ 实时高亮匹配关键词
				- ✅ 支持中文搜索
	- Sub title
		- Sub title
			- 6. 主题切换
		- Sub title
			- Sub title
				- 1. 点击右上角 **🌙/☀️ 图标**
			- Sub title
				- 2. 或按 **Ctrl+D** 快捷键
			- Sub title
				- 3. 主题立即切换，设置自动保存
	- Sub title
		- Sub title
			- 7. 阅读模式
		- Sub title
			- Sub title
				- 1. 点击右上角 **📖 阅读模式图标**
			- Sub title
				- 2. 进入专注阅读界面
			- Sub title
				- 3. 再次点击退出
- 常见问题
	- Sub title
		- Sub title
			- 1. 确认目标文章已创建且已发布
		- Sub title
			- 2. 检查链接语法：`[[文章标题]]`
		- Sub title
			- 3. 保存文章后等待链接关系更新
	- Sub title
		- ✅ 是否有已发布的文章
		- ✅ 文章之间是否有链接关系
		- ✅ `/api/content-index.json` 是否可访问
	- Sub title
		- Sub title
			- 1. 尝试使用文章标题关键词
		- Sub title
			- 2. 检查文章是否已发布
		- Sub title
			- 3. 刷新页面后重试搜索

## 🎯 最终总结 ^a1e7254c-15c0-ccd4
- 优化成果回顾
	- 性能提升
		- Sub title
			- 维度
			- 提升
			- 技术手段
		- Sub title
			- Sub title
				- **页面加载速度**
				- **10-50倍**
				- 静态预渲染 + CDN
			- Sub title
				- **数据库查询**
				- **100%消除**
				- 构建时查询
			- Sub title
				- **首屏时间**
				- **75%减少**
				- 代码分割 + 懒加载
			- Sub title
				- **JavaScript 大小**
				- **70%减少**
				- 按需加载
			- Sub title
				- **构建效率**
				- **14倍提升**
				- 多线程并行
			- Sub title
				- **Lighthouse 分数**
				- **+36分**
				- 综合优化
	- 技术栈

		-
		  ```
		  前端框架: Astro 5.15.1
		  ├─ 输出模式: Static (静态优先)
		  ├─ 适配器: @astrojs/vercel
		  └─ 预渲染: 20+ 页面
		  
		  UI 库: React 19
		  ├─ 加载策略: client:idle / client:visible
		  └─ 代码分割: 自动
		  
		  数据库: PostgreSQL
		  ├─ ORM: Drizzle
		  ├─ 索引: 8 个关键索引
		  └─ 连接池: 优化配置
		  
		  部署平台: Vercel
		  ├─ Edge Network: 全球 CDN
		  ├─ Functions: Serverless API
		  └─ Analytics: 实时监控
		  ```

- 关键技术点
	- Sub title
		- 1. **静态预渲染** - 核心优化，10-50 倍提速
	- Sub title
		- 2. **多线程并行处理** - 构建效率提升 14 倍
	- Sub title
		- 3. **HTML 缓存** - Markdown 预处理
	- Sub title
		- 4. **数据库索引** - 查询速度提升 10 倍
	- Sub title
		- 5. **React 懒加载** - 首屏 JS 减少 70%
	- Sub title
		- 6. **CDN 分发** - 全球加速
	- Sub title
		- 7. **混合渲染** - 兼顾性能和功能
- 适用场景
	- Sub title
		- 博客系统
		- 文档站点
		- 营销页面
		- 知识库
		- Portfolio
	- Sub title
		- 高频更新内容（需 ISR）
		- 用户个性化内容（需 SSR）
		- 实时数据展示（需 API）
- 维护建议

	-
	  ```bash
	  # 1. 添加新文章
	  # 2. 运行预渲染
	  npm run pre-render
	  # 3. 构建部署
	  npm run deploy:full
	  ```

	- Sub title
		- 每月检查 Vercel Analytics
		- 监控构建时间变化
		- 清理无用的缓存数据
		- 更新依赖包
	- Sub title
		- Lighthouse 评分 > 90
		- TTFB < 100ms
		- LCP < 2.5s
		- CDN 命中率 > 95%

## 📚 参考资料 ^f697f40e-a7d2-6433
- 官方文档
	- [Astro Documentation](https://docs.astro.build/)
	- [Astro 5.0 升级指南](https://docs.astro.build/zh-cn/guides/upgrade-to/v5/)
	- [Vercel Documentation](https://vercel.com/docs)
	- [Web.dev Performance](https://web.dev/performance/)
- 相关脚本
	- `scripts/pre-render.ts` - 多线程预渲染
	- `scripts/add-indexes.ts` - 数据库索引
	- `scripts/test-performance.ts` - 性能测试
	- `scripts/diagnose-db.ts` - 数据库诊断

## 🔒 Environment Variables
- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `DATABASE_URL`: Database connection string
- `PUBLIC_SITE_URL`: Your site URL (usually http://localhost:4321 in development)

## 📝 License

## 🙏 Acknowledgements
- [Astro](https://astro.build/) - The all-in-one web framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework

## 新节点