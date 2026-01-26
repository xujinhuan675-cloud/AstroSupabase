# Astro Supabase Blog Starter

基于 Astro 5.x 和 Supabase 的现代化数字花园博客系统，支持双向链接、知识图谱、全文搜索等功能。

## ✨ 功能特性

- 🔐 用户认证（Supabase Auth）
- 📝 Markdown 文章管理
- 🔗 双向链接（Wiki 风格 `[[links]]`）
- 📊 知识图谱可视化
- 🏷️ 标签系统
- 🔍 全文搜索
- 🎨 响应式设计
- 🌓 深色/浅色主题
- 📖 阅读模式
- ⚡ 极致性能（10-50倍提速）
- 🛠️ TypeScript 类型安全
- 🌟 SEO 优化

## 🚀 快速开始

### 前置要求

- Node.js 20+
- Yarn 或 npm
- Supabase 账号

### 安装

```bash
# 1. 克隆仓库
git clone <repository-url>
cd AstroSupabase

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Supabase 凭证

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:4321

## 📂 项目结构

```
/
├── src/
│   ├── components/       # 组件
│   ├── pages/            # 页面
│   ├── layouts/          # 布局
│   ├── db/               # 数据库
│   └── lib/              # 工具函数
├── scripts/              # 脚本
├── public/               # 静态文件
└── drizzle/              # 数据库迁移
```

## 🧑‍💻 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run build:full   # 预渲染 + 构建（推荐）
npm run preview      # 预览生产构建

npm run pre-render   # 多线程预渲染
npm run import:git   # 从 Git 导入 Markdown
npm run deploy:full  # 导入 + 预渲染 + 部署

npm run db:push      # 推送数据库模式
npm run db:generate  # 生成迁移文件
npm run db:indexes   # 添加性能索引
```

## 🚀 部署

### 自动部署（推荐）

```bash
git add .
git commit -m "Update content"
git push
```

Vercel 会自动：
1. 检测代码推送
2. 运行多线程预渲染
3. 构建 Astro 站点
4. 部署上线

### 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 中配置：

- `DATABASE_URL` - PostgreSQL 连接字符串
- `PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `PUBLIC_SUPABASE_ANON_KEY` - Supabase API Key

## 📊 性能优化

本项目经过深度性能优化：

- **页面加载速度**：提升 10-50 倍
- **数据库查询**：100% 消除运行时查询
- **首屏时间**：减少 75%
- **Lighthouse 评分**：98/100

详见：[性能优化指南](../4-Outcome/IOTO研发/总结/AstroSupabase架构文档.md#性能优化)

## 📖 详细文档

- [架构文档](../4-Outcome/IOTO研发/总结/AstroSupabase架构文档.md) - 完整的技术架构说明
  - 技术栈详解
  - 数据库设计
  - API 设计
  - 性能优化策略
  - 搜索功能实现
  - 已知问题与解决方案

## � 技术栈

- **前端**：Astro 5.x + React 19
- **数据库**：PostgreSQL (Supabase)
- **ORM**：Drizzle ORM
- **样式**：Tailwind CSS
- **部署**：Vercel
- **可视化**：D3.js

## 📝 License

MIT

## 🙏 致谢

- [Astro](https://astro.build/) - Web 框架
- [Supabase](https://supabase.com/) - 后端服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [D3.js](https://d3js.org/) - 数据可视化
