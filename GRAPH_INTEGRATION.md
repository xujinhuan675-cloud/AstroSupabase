# 知识图谱功能集成文档

## 概述

本项目已完整集成 Quartz 风格的知识图谱（Knowledge Graph）功能，支持可视化展示文章之间的双向链接关系。

## 技术栈

- **前端框架**: Astro + React (Island Architecture)
- **可视化库**: `react-force-graph-2d` (基于 D3.js 的力导向图)
- **数据源**: Supabase PostgreSQL
- **ORM**: Drizzle ORM
- **样式**: Quartz CSS Variables + Tailwind CSS

## 核心组件

### 1. 后端 API

**文件**: `src/pages/api/graph-data.ts`

提供完整的图谱数据 API，返回所有已发布文章的节点和链接关系。

```typescript
GET /api/graph-data

Response: {
  nodes: Array<{ id: number, title: string, slug: string }>,
  links: Array<{ source: number, target: number }>
}
```

**数据服务**: `src/lib/links-service.ts`

核心函数：
- `getGraphData()`: 获取完整图谱数据
- `updateArticleLinks(articleId, content)`: 更新文章链接关系
- `getBacklinks(articleId)`: 获取反向链接
- `getForwardLinks(articleId)`: 获取前向链接

### 2. 前端组件

#### 全局知识图谱 (`KnowledgeGraph.tsx`)

**位置**: `src/components/KnowledgeGraph.tsx`

**功能**:
- 显示所有文章的完整关系网络
- 节点点击跳转到对应文章
- 悬停高亮相关节点和链接
- 支持拖拽、缩放、平移
- 访问历史记录（localStorage）
- 深色/浅色主题自适应

**使用**:
```astro
<KnowledgeGraph client:load height={600} showLegend={true} />
```

#### 局部知识图谱 (`LocalGraph.tsx`)

**位置**: `src/components/LocalGraph.tsx`

**功能**:
- 显示当前文章及其直接相关的文章（可配置深度）
- 高亮当前文章节点
- 快速导航到相关文章
- 显示"完整图谱"链接
- 适合在文章详情页右侧栏使用

**使用**:
```astro
<LocalGraph articleId={articleId} client:load depth={1} height={250} />
```

### 3. 辅助函数

**文件**: `src/scripts/graph-helpers.ts`

核心函数：
- `fetchGraphData()`: 从 API 获取图谱数据
- `filterGraphByDepth(data, centerNodeId, depth)`: 按深度过滤图谱
- `getNodeColor()`: 获取节点颜色（基于访问状态）
- `saveVisitedNode()`: 保存访问记录
- `isDarkMode()`: 检测主题模式

### 4. 样式

**文件**: `src/styles/quartz/graph.css`

提供 Quartz 风格的图谱容器样式，支持：
- 响应式布局
- 深色/浅色主题
- 全屏模式（可扩展）
- 移动端优化

## 页面集成

### 完整图谱页面

**文件**: `src/pages/graph.astro`

**路径**: `/graph`

展示完整的知识网络，包括：
- 使用说明
- 完整图谱可视化
- 快速操作链接（创建文章、管理文章等）

### 文章详情页

**文件**: `src/pages/articles/[id].astro`

**集成位置**:
- **右侧栏**: 局部知识图谱（显示相关文章）
- **文章底部**: 前向链接和反向链接列表

## 双向链接语法

在 Markdown 文章中使用 `[[文章slug]]` 或 `[[文章slug|显示文本]]` 语法创建双向链接：

```markdown
这是一个指向 [[other-article]] 的链接。

也可以自定义显示文本：[[other-article|其他文章]]。
```

链接会自动：
1. 在渲染时转换为 HTML 链接
2. 存储到 `article_links` 表
3. 在图谱中可视化

## 数据流

```
Markdown 文件
    ↓
GitHub Actions (import-markdown workflow)
    ↓
Supabase (articles 表)
    ↓
processMarkdown() 解析 [[链接]]
    ↓
updateArticleLinks() 更新 article_links 表
    ↓
getGraphData() 查询数据
    ↓
/api/graph-data 返回 JSON
    ↓
KnowledgeGraph/LocalGraph 组件渲染
```

## 交互功能

### 节点交互
- **点击**: 跳转到对应文章
- **悬停**: 高亮节点及其相关节点
- **拖拽**: 调整节点位置

### 图谱控制
- **滚轮**: 缩放
- **拖拽背景**: 平移
- **自动布局**: 力导向算法自动排列

### 主题支持
- 自动检测系统主题（深色/浅色）
- 实时响应主题切换
- 颜色变量基于 Quartz CSS Variables

## 性能优化

1. **客户端渲染**: 使用 `client:load` 仅在客户端渲染图谱组件
2. **按需加载**: 动态导入 `react-force-graph-2d` 避免 SSR 错误
3. **数据缓存**: API 响应缓存 5 分钟
4. **局部图谱**: 按深度过滤减少节点数量
5. **Canvas 渲染**: 使用 Canvas 而非 SVG，支持大规模节点

## 配置选项

### KnowledgeGraph 组件

```typescript
interface KnowledgeGraphProps {
  currentSlug?: string;      // 当前文章 slug（可选）
  height?: number;           // 高度，默认 600px
  showLegend?: boolean;      // 是否显示图例，默认 true
}
```

### LocalGraph 组件

```typescript
interface LocalGraphProps {
  articleId: number;         // 当前文章 ID（必需）
  height?: number;           // 高度，默认 250px
  depth?: number;            // 关系深度，默认 1（1=直接相关，2=二度相关）
}
```

## 扩展建议

### 1. 标签颜色分组
可以根据文章标签为节点添加不同颜色：

```typescript
// 在 nodeCanvasObject 中
const tags = node.tags || [];
if (tags.includes('tutorial')) {
  ctx.fillStyle = '#4CAF50';
} else if (tags.includes('concept')) {
  ctx.fillStyle = '#2196F3';
}
```

### 2. 节点大小基于度数
根据链接数量调整节点大小：

```typescript
import { getNodeDegree } from '../scripts/graph-helpers';

const degree = getNodeDegree(node.id, graphData.links);
const nodeSize = 3 + Math.sqrt(degree) * 2;
```

### 3. 全屏模式
添加全屏按钮，展开图谱到全屏：

```typescript
const toggleFullscreen = () => {
  document.querySelector('.graph-outer')?.requestFullscreen();
};
```

### 4. 搜索和过滤
添加搜索框，高亮匹配的节点：

```typescript
const [searchTerm, setSearchTerm] = useState('');
const filteredNodes = graphData.nodes.filter(node => 
  node.title.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## 故障排除

### 图谱不显示

1. 检查是否有文章数据：访问 `/api/graph-data` 查看返回
2. 检查浏览器控制台是否有错误
3. 确认 `react-force-graph-2d` 已安装：`npm list react-force-graph-2d`

### 链接未自动创建

1. 确认使用了正确的双向链接语法：`[[slug]]`
2. 检查目标文章是否存在且已发布
3. 查看 `article_links` 表是否有记录

### 主题颜色不正确

1. 确认 `src/styles/quartz/variables.css` 已正确加载
2. 检查 `darkmode.css` 是否生效
3. 测试 `window.matchMedia('(prefers-color-scheme: dark)')` 返回值

## 相关文件清单

```
src/
├── components/
│   ├── KnowledgeGraph.tsx         # 全局图谱组件
│   ├── LocalGraph.tsx             # 局部图谱组件
│   └── Backlinks.tsx              # 反向链接组件
├── pages/
│   ├── graph.astro                # 图谱页面
│   ├── articles/[id].astro        # 文章详情页（集成局部图谱）
│   └── api/
│       └── graph-data.ts          # 图谱数据 API
├── lib/
│   ├── links-service.ts           # 链接服务（数据库操作）
│   └── markdown-processor.ts     # Markdown 处理（解析双向链接）
├── scripts/
│   └── graph-helpers.ts           # 图谱辅助函数
├── styles/quartz/
│   ├── graph.css                  # 图谱样式
│   ├── variables.css              # CSS 变量
│   └── darkmode.css               # 深色模式
└── db/
    └── schema.ts                  # 数据库 schema（包含 article_links）
```

## 总结

知识图谱功能已完全集成到 AstroSupabase 项目中，采用了 Astro 的 Island Architecture 模式，既保持了静态页面的性能优势，又提供了丰富的交互体验。系统支持：

✅ 完整图谱和局部图谱两种视图
✅ 双向链接自动解析和存储
✅ 深色/浅色主题自适应
✅ 丰富的交互功能（点击、悬停、缩放、拖拽）
✅ 性能优化（客户端渲染、数据缓存、Canvas 渲染）
✅ 响应式设计，支持移动端

该实现完全基于现代 Web 技术栈，易于维护和扩展。

