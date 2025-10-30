# 🚀 Quartz 深度完整迁移方案

## 🎯 目标

完整迁移 Quartz 4 的所有功能到 AstroSupabase，同时保留：
- ✅ 后台管理系统（Dashboard）
- ✅ Supabase 认证和数据库集成
- ✅ 现有的文章管理功能

---

## 📐 架构设计

### 双模式架构

```
┌─────────────────────────────────────────────┐
│           AstroSupabase 统一入口             │
├─────────────────┬───────────────────────────┤
│                 │                           │
│  📖 前台展示      │    🔐 后台管理            │
│  (Quartz Layout)│   (Dashboard)            │
│                 │                           │
│  - 三栏布局      │   - 认证页面              │
│  - Explorer     │   - 文章编辑器            │
│  - Search       │   - 文章列表              │
│  - Graph        │   - 用户管理              │
│  - TOC          │                           │
│  - Backlinks    │   (保持原有设计)          │
│                 │                           │
└─────────────────┴───────────────────────────┘
         │                    │
         └────────┬───────────┘
                  │
         Supabase (统一数据层)
```

### 路由规划

```
/                          → Quartz 首页（三栏布局）
/articles/[slug]           → Quartz 文章页（三栏布局）
/tags/[tag]                → Quartz 标签页（三栏布局）
/graph                     → Quartz 知识图谱页（三栏布局）

/auth/login                → 登录页（独立布局）
/auth/signup               → 注册页（独立布局）

/dashboard                 → 后台首页（Dashboard 布局）
/dashboard/articles        → 文章管理（Dashboard 布局）
/dashboard/articles/new    → 新建文章（Dashboard 布局）
/dashboard/articles/[id]   → 编辑文章（Dashboard 布局）
```

---

## 🏗️ 文件结构规划

```
src/
├── layouts/
│   ├── QuartzLayout.astro           ← 新建：Quartz 三栏布局
│   ├── DashboardLayout.astro        ← 保留：后台布局
│   └── AuthLayout.astro             ← 保留：认证布局
│
├── components/
│   ├── quartz/                      ← 新建：Quartz 组件目录
│   │   ├── PageTitle.tsx
│   │   ├── Explorer.tsx
│   │   ├── Search.tsx
│   │   ├── TableOfContents.tsx
│   │   ├── Darkmode.tsx
│   │   ├── ContentMeta.tsx
│   │   ├── TagList.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── ArticleTitle.tsx
│   │   ├── Footer.tsx
│   │   ├── ReaderMode.tsx
│   │   ├── Popover.tsx
│   │   ├── Graph.tsx                ← 升级：完整 D3 实现
│   │   └── Backlinks.tsx            ← 已有
│   │
│   ├── dashboard/                   ← 保留：后台组件
│   │   ├── ArticleEditor.tsx
│   │   ├── ArticleList.tsx
│   │   └── ArticleManager.tsx
│   │
│   └── auth/                        ← 保留：认证组件
│       ├── LoginForm.tsx
│       └── SignupForm.tsx
│
├── lib/
│   └── quartz/                      ← 已有：Quartz 核心库
│       ├── util/
│       ├── transformers/
│       └── graph/                   ← 新建：完整图谱实现
│
├── scripts/
│   └── quartz/                      ← 新建：Quartz 客户端脚本
│       ├── search.ts
│       ├── graph.ts
│       ├── toc.ts
│       ├── darkmode.ts
│       ├── explorer.ts
│       ├── popover.ts
│       ├── spa.ts
│       └── readermode.ts
│
└── styles/
    └── quartz/                      ← 扩展：更多样式
        ├── layout.css               ← 新建：三栏布局
        ├── explorer.css             ← 新建
        ├── search.css               ← 新建
        ├── toc.css                  ← 新建
        ├── darkmode.css             ← 新建
        ├── popover.css              ← 新建
        └── ... (已有的样式)
```

---

## 📋 详细迁移计划

### 🔴 阶段 1：核心布局系统（第 1-2 天）

#### 1.1 创建 Quartz 三栏布局

**文件**: `src/layouts/QuartzLayout.astro`

**功能**:
- 三栏响应式布局
- 左侧栏：PageTitle + Search + Darkmode + Explorer
- 主内容：Breadcrumbs + ArticleTitle + ContentMeta + TagList + Body
- 右侧栏：Graph + TableOfContents + Backlinks
- 移动端适配

**任务**:
- [ ] 创建基础布局结构
- [ ] 实现响应式断点
- [ ] 添加侧边栏切换按钮（移动端）
- [ ] 集成 Quartz 基础样式

#### 1.2 迁移 PageTitle 组件

**文件**: `src/components/quartz/PageTitle.tsx`

**源文件**: `quartz-4/quartz/components/PageTitle.tsx`

**功能**:
- 显示网站标题
- 支持自定义 Logo
- 点击返回首页

#### 1.3 迁移 Footer 组件

**文件**: `src/components/quartz/Footer.tsx`

**源文件**: `quartz-4/quartz/components/Footer.tsx`

**功能**:
- 显示页脚链接
- GitHub、Discord 等社交链接
- 版权信息

---

### 🔴 阶段 2：文件浏览器（第 3-4 天）

#### 2.1 迁移 Explorer 组件

**文件**: `src/components/quartz/Explorer.tsx`

**源文件**: `quartz-4/quartz/components/Explorer.tsx`

**功能**:
- 文件树显示（基于数据库文章）
- 文件夹折叠/展开
- 文件搜索过滤
- 文件计数显示

**数据源**:
```typescript
// 从 Supabase 获取文章树形结构
const articles = await db.select().from(articles)
// 转换为树形结构
const tree = buildFileTree(articles)
```

#### 2.2 Explorer 客户端脚本

**文件**: `src/scripts/quartz/explorer.ts`

**源文件**: `quartz-4/quartz/components/scripts/explorer.inline.ts`

**功能**:
- 文件夹展开/折叠动画
- 搜索过滤逻辑
- 状态持久化（localStorage）

---

### 🔴 阶段 3：全文搜索（第 5-6 天）

#### 3.1 迁移 Search 组件

**文件**: `src/components/quartz/Search.tsx`

**源文件**: `quartz-4/quartz/components/Search.tsx`

**功能**:
- 搜索框 UI
- 搜索结果列表
- 快捷键支持（Cmd/Ctrl + K）
- 搜索历史

#### 3.2 搜索索引系统

**文件**: `src/lib/search/index.ts`

**功能**:
- 构建搜索索引（基于数据库）
- 全文搜索算法
- 模糊匹配
- 搜索结果排序

**实现方案**:
```typescript
// 选项 1：使用 FlexSearch（Quartz 使用）
import FlexSearch from 'flexsearch'

// 选项 2：使用 PostgreSQL 全文搜索
// 已有的 search_vector 字段

// 推荐：混合方案
// - 静态页面用 FlexSearch（客户端）
// - 动态内容用 PostgreSQL（服务端）
```

#### 3.3 搜索客户端脚本

**文件**: `src/scripts/quartz/search.ts`

**源文件**: `quartz-4/quartz/components/scripts/search.inline.ts`

**功能**:
- 搜索交互逻辑
- 快捷键绑定
- 搜索结果高亮

---

### 🔴 阶段 4：目录和导航（第 7-8 天）

#### 4.1 迁移 TableOfContents 组件

**文件**: `src/components/quartz/TableOfContents.tsx`

**源文件**: `quartz-4/quartz/components/TableOfContents.tsx`

**功能**:
- 自动提取文章标题
- 生成目录树
- 滚动同步高亮
- 点击跳转

#### 4.2 TOC 客户端脚本

**文件**: `src/scripts/quartz/toc.ts`

**源文件**: `quartz-4/quartz/components/scripts/toc.inline.ts`

**功能**:
- 滚动监听
- 高亮当前章节
- 平滑滚动

#### 4.3 迁移 Breadcrumbs 组件

**文件**: `src/components/quartz/Breadcrumbs.tsx`

**源文件**: `quartz-4/quartz/components/Breadcrumbs.tsx`

**功能**:
- 面包屑导航
- 路径显示
- 点击跳转

---

### 🟡 阶段 5：主题和阅读模式（第 9-10 天）

#### 5.1 迁移 Darkmode 组件

**文件**: `src/components/quartz/Darkmode.tsx`

**源文件**: `quartz-4/quartz/components/Darkmode.tsx`

**功能**:
- 暗色模式切换按钮
- 主题状态管理
- 系统主题检测

#### 5.2 Darkmode 客户端脚本

**文件**: `src/scripts/quartz/darkmode.ts`

**源文件**: `quartz-4/quartz/components/scripts/darkmode.inline.ts`

**功能**:
- 主题切换逻辑
- 持久化存储
- CSS 变量切换

#### 5.3 迁移 ReaderMode 组件

**文件**: `src/components/quartz/ReaderMode.tsx`

**源文件**: `quartz-4/quartz/components/ReaderMode.tsx`

**功能**:
- 阅读模式切换
- 隐藏侧边栏
- 专注阅读体验

---

### 🟡 阶段 6：内容元数据（第 11-12 天）

#### 6.1 迁移 ArticleTitle 组件

**文件**: `src/components/quartz/ArticleTitle.tsx`

**源文件**: `quartz-4/quartz/components/ArticleTitle.tsx`

#### 6.2 迁移 ContentMeta 组件

**文件**: `src/components/quartz/ContentMeta.tsx`

**源文件**: `quartz-4/quartz/components/ContentMeta.tsx`

**功能**:
- 发布日期
- 更新日期
- 阅读时间
- 字数统计

#### 6.3 迁移 TagList 组件

**文件**: `src/components/quartz/TagList.tsx`

**源文件**: `quartz-4/quartz/components/TagList.tsx`

**功能**:
- 标签列表显示
- 标签链接
- 标签计数

---

### 🟡 阶段 7：完整图谱实现（第 13-15 天）⭐

#### 7.1 迁移 D3 + PixiJS 图谱

**文件**: `src/lib/quartz/graph/index.ts`

**源文件**: `quartz-4/quartz/components/scripts/graph.inline.ts` (650+ 行)

**功能**:
- D3 力导向图
- PixiJS 高性能渲染
- 深度过滤
- 全局/局部图谱切换
- 标签节点支持
- 径向布局
- Tween 动画

**依赖**:
```json
{
  "d3": "^7.9.0",
  "pixi.js": "^8.14.0",
  "@tweenjs/tween.js": "^25.0.0"
}
```

#### 7.2 创建完整 Graph 组件

**文件**: `src/components/quartz/Graph.tsx`

**功能**:
- 集成 D3 + PixiJS 渲染
- 全局/局部切换按钮
- 深度滑块控制
- 标签过滤

#### 7.3 Graph 数据适配

**文件**: `src/lib/quartz/graph/data-adapter.ts`

**功能**:
```typescript
// 将 Supabase 数据转换为 Quartz Graph 格式
interface QuartzGraphData {
  nodes: Map<SimpleSlug, ContentDetails>
  links: SimpleLinkData[]
}

async function fetchGraphDataForQuartz(): Promise<QuartzGraphData> {
  // 从数据库获取文章和链接
  const articles = await db.select().from(articles)
  const links = await db.select().from(article_links)
  
  // 转换为 Quartz 格式
  return convertToQuartzFormat(articles, links)
}
```

---

### 🟢 阶段 8：高级交互（第 16-18 天）

#### 8.1 迁移 Popover 预览

**文件**: `src/components/quartz/Popover.tsx`

**源文件**: `quartz-4/quartz/components/scripts/popover.inline.ts`

**功能**:
- 悬浮预览卡片
- 链接内容预览
- 延迟加载
- 定位计算

#### 8.2 SPA 导航

**文件**: `src/scripts/quartz/spa.ts`

**源文件**: `quartz-4/quartz/components/scripts/spa.inline.ts`

**功能**:
- 无刷新页面跳转
- 历史记录管理
- 滚动位置恢复
- 页面转场动画

#### 8.3 代码复制按钮

**文件**: `src/scripts/quartz/clipboard.ts`

**源文件**: `quartz-4/quartz/components/scripts/clipboard.inline.ts`

**功能**:
- 代码块复制按钮
- 复制成功提示
- 多语言支持

---

### 🟢 阶段 9：样式完善（第 19-20 天）

#### 9.1 迁移所有样式文件

```
quartz/styles/             → src/styles/quartz/
├── base.scss             → base.css
├── layout.scss           → layout.css (新建)
├── explorer.scss         → explorer.css
├── search.scss           → search.css
├── toc.scss              → toc.css
├── darkmode.scss         → darkmode.css
├── breadcrumbs.scss      → breadcrumbs.css
├── contentMeta.scss      → contentMeta.css
├── footer.scss           → footer.css
├── popover.scss          → popover.css
├── readermode.scss       → readermode.css
├── listPage.scss         → listPage.css
└── clipboard.scss        → clipboard.css
```

#### 9.2 响应式优化

**断点**:
```css
/* Quartz 断点 */
$mobile: 600px
$tablet: 1000px
$desktop: 1400px

/* 适配 Tailwind */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

### 🟢 阶段 10：集成和测试（第 21-22 天）

#### 10.1 页面集成

**首页** (`src/pages/index.astro`):
```astro
---
import QuartzLayout from '../layouts/QuartzLayout.astro'
import { getRecentArticles } from '../lib/articles'

const recentArticles = await getRecentArticles(10)
---

<QuartzLayout title="首页">
  <!-- 使用 Quartz PageList 组件显示最近文章 -->
</QuartzLayout>
```

**文章页** (`src/pages/articles/[slug].astro`):
```astro
---
import QuartzLayout from '../../layouts/QuartzLayout.astro'
import { getArticleBySlug } from '../../lib/articles'
import { processMarkdown } from '../../lib/markdown-processor'

const { slug } = Astro.params
const article = await getArticleBySlug(slug)
const processed = await processMarkdown(article.content, {
  allSlugs: await getAllSlugs(),
  currentSlug: article.slug,
})
---

<QuartzLayout title={article.title} currentSlug={article.slug}>
  <!-- 文章内容 + 所有 Quartz 组件 -->
</QuartzLayout>
```

#### 10.2 后台管理保留

**Dashboard 页面** (`src/pages/dashboard/**`):
```astro
---
import DashboardLayout from '../../layouts/DashboardLayout.astro'
// 保持原有实现
---

<DashboardLayout>
  <!-- 原有的后台管理组件 -->
</DashboardLayout>
```

#### 10.3 测试清单

- [ ] 三栏布局在各设备上正常显示
- [ ] Explorer 文件树展开/折叠
- [ ] Search 搜索功能正常
- [ ] TOC 滚动同步高亮
- [ ] Darkmode 主题切换
- [ ] Graph 图谱交互
- [ ] Backlinks 反向链接显示
- [ ] Popover 悬浮预览
- [ ] SPA 导航无刷新跳转
- [ ] 响应式设计适配
- [ ] 后台管理功能不受影响
- [ ] Supabase 认证正常工作

---

## 📦 依赖更新

```json
{
  "dependencies": {
    // 现有依赖...
    
    // 新增 Quartz 完整依赖
    "pixi.js": "^8.14.0",
    "@tweenjs/tween.js": "^25.0.0",
    "flexsearch": "^0.8.205",
    "@floating-ui/dom": "^1.7.4",
    "micromorph": "^0.4.5"
  }
}
```

---

## 🔧 配置文件

### Quartz 配置

**文件**: `src/config/quartz.config.ts`

```typescript
export const quartzConfig = {
  pageTitle: "IOTO Digital Garden",
  enableSPA: true,
  enablePopovers: true,
  enableSearch: true,
  theme: {
    typography: {
      header: "Schibsted Grotesk",
      body: "Source Sans Pro",
      code: "IBM Plex Mono",
    },
    colors: {
      // 使用 Quartz 配色方案
    },
  },
  components: {
    explorer: {
      folderClickBehavior: "collapse",
      folderDefaultState: "collapsed",
    },
    search: {
      enablePreview: true,
      maxResults: 10,
    },
    graph: {
      localGraph: {
        depth: 1,
        scale: 1.1,
      },
      globalGraph: {
        depth: -1,
        scale: 0.9,
      },
    },
  },
}
```

---

## 🎯 成功标准

### 前台展示（Quartz）

- ✅ 完全复刻 [Quartz 官网](https://quartz.jzhao.xyz/) 的布局和功能
- ✅ 三栏响应式布局
- ✅ 所有 Quartz 组件正常工作
- ✅ 性能与原 Quartz 相当或更好

### 后台管理（保留）

- ✅ Dashboard 功能完全保留
- ✅ 文章管理正常
- ✅ Supabase 集成无影响
- ✅ 认证流程正常

### 数据集成

- ✅ 文章数据从 Supabase 读取
- ✅ 链接关系存储在数据库
- ✅ 搜索索引实时更新
- ✅ 图谱数据动态生成

---

## 📊 时间估算

| 阶段 | 任务 | 天数 |
|------|------|------|
| 1 | 核心布局系统 | 2 天 |
| 2 | 文件浏览器 | 2 天 |
| 3 | 全文搜索 | 2 天 |
| 4 | 目录和导航 | 2 天 |
| 5 | 主题和阅读模式 | 2 天 |
| 6 | 内容元数据 | 2 天 |
| 7 | 完整图谱实现 | 3 天 |
| 8 | 高级交互 | 3 天 |
| 9 | 样式完善 | 2 天 |
| 10 | 集成和测试 | 2 天 |
| **总计** | | **22 天** |

---

## 🚀 开始执行

准备就绪！我现在将开始执行：

### 立即开始
1. ✅ 创建 QuartzLayout.astro（三栏布局）
2. ✅ 迁移 PageTitle 组件
3. ✅ 迁移基础样式
4. ✅ 创建示例页面

**请确认开始执行！** 🎯

