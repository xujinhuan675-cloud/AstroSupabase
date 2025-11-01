# Quartz 知识图谱迁移方案

## 📋 概述

本文档详细说明如何将 Quartz-4 的知识图谱实现迁移到 AstroSupabase 项目。Quartz 使用 **PixiJS + D3.js** 来实现高性能的图谱可视化，相比当前的 `react-force-graph-2d` 方案，在性能和视觉体验上有显著提升。

---

## 🎯 技术栈对比

### 当前实现 (AstroSupabase)
- **渲染引擎**: react-force-graph-2d (基于 D3.js Force Simulation)
- **数据源**: Supabase API (`/api/graph-data`)
- **组件**: React 组件
- **优点**: 简单易用，API 友好
- **缺点**: 性能有限，视觉效果较基础

### 目标实现 (Quartz)
- **渲染引擎**: PixiJS + D3.js Force Simulation
- **数据源**: 静态 JSON 或 API 数据
- **组件**: 原生 TypeScript + HTML/CSS
- **优点**: 
  - 🚀 **高性能**: PixiJS 使用 WebGL，支持数千节点流畅渲染
  - 🎨 **精美视觉效果**: 平滑动画、标签渐变、径向布局
  - 📦 **轻量**: 不需要 React 运行时
  - ✨ **丰富交互**: 拖拽、缩放、悬停高亮、全局图谱弹窗

---

## 📦 依赖安装

### 新增依赖

```bash
npm install pixi.js @tweenjs/tween.js
npm install -D @types/pixi.js
```

### 已有依赖（检查版本）

- `d3`: ^7.9.0 ✅ (已安装)
- `@types/d3`: ^7.4.3 ✅ (已安装)

---

## 🔄 数据格式适配

### Quartz 数据格式 (`ContentDetails`)

```typescript
type ContentDetails = {
  slug: FullSlug          // 例如: "articles/my-article"
  filePath: FilePath     // 文件路径
  title: string          // 文章标题
  links: SimpleSlug[]    // 链接到的文章 slug 数组
  tags: string[]         // 标签数组
  content: string        // 文章内容（可选）
}
```

### AstroSupabase 数据格式（当前）

```typescript
type GraphNode = {
  id: number             // 数字 ID
  title: string
  slug: string
}

type GraphLink = {
  source: number         // 源节点 ID
  target: number         // 目标节点 ID
}
```

### 数据适配方案

需要创建一个数据适配器，将 Supabase 数据转换为 Quartz 格式：

```typescript
// src/lib/graph-data-adapter.ts
import { getGraphData } from './links-service';
import { getArticleTags } from './links-service';

export type QuartzContentDetails = {
  slug: string;
  filePath: string;
  title: string;
  links: string[];
  tags: string[];
  content: string;
};

export async function convertToQuartzFormat(): Promise<Record<string, QuartzContentDetails>> {
  const graphData = await getGraphData();
  const contentIndex: Record<string, QuartzContentDetails> = {};
  
  // 为每个节点创建映射
  const slugToId = new Map<string, number>();
  const idToSlug = new Map<number, string>();
  
  for (const node of graphData.nodes) {
    slugToId.set(node.slug, node.id);
    idToSlug.set(node.id, node.slug);
    
    // 获取标签
    const tags = await getArticleTags(node.id);
    
    // 获取出链（links）
    const outLinks = graphData.links
      .filter(link => link.source === node.id)
      .map(link => idToSlug.get(link.target)!)
      .filter(Boolean);
    
    contentIndex[node.slug] = {
      slug: node.slug,
      filePath: `articles/${node.slug}`,
      title: node.title,
      links: outLinks,
      tags: tags,
      content: '', // 可选：如果需要全文搜索
    };
  }
  
  return contentIndex;
}
```

---

## 🏗️ 组件迁移步骤

### 步骤 1: 创建 API 端点提供 Quartz 格式数据

**文件**: `src/pages/api/content-index.json.ts`

```typescript
import type { APIRoute } from 'astro';
import { convertToQuartzFormat } from '../../lib/graph-data-adapter';

export const GET: APIRoute = async () => {
  try {
    const contentIndex = await convertToQuartzFormat();
    
    return new Response(JSON.stringify(contentIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error fetching content index:', error);
    return new Response(JSON.stringify({}), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### 步骤 2: 适配 Graph 组件

**文件**: `src/components/quartz/Graph.tsx`

需要将 Quartz 的 Preact 组件转换为 React 组件，并适配 Astro 环境：

1. **替换 Preact 语法**: `class` → `className`
2. **处理样式**: 将 SCSS 导入改为 CSS 导入
3. **处理脚本**: 将 `Graph.afterDOMLoaded` 改为 React `useEffect`

### 步骤 3: 适配 Graph 脚本

**文件**: `src/components/quartz/scripts/graph.inline.ts`

主要修改点：

1. **数据获取**: 
   ```typescript
   // 原 Quartz: 使用全局 fetchData
   const data: Map<SimpleSlug, ContentDetails> = new Map(
     Object.entries<ContentDetails>(await fetchData).map(...)
   );
   
   // 改为: 从 API 获取
   const response = await fetch('/api/content-index.json');
   const contentIndex = await response.json();
   const data: Map<string, ContentDetails> = new Map(
     Object.entries<ContentDetails>(contentIndex).map(...)
   );
   ```

2. **路径处理**: 
   - Quartz 使用 `FullSlug` 和 `SimpleSlug` 类型
   - AstroSupabase 使用简单的 `string` slug
   - 需要简化路径处理逻辑

3. **导航系统**:
   ```typescript
   // Quartz 使用 SPA 导航
   window.spaNavigate(new URL(targ, window.location.toString()))
   
   // AstroSupabase 使用标准导航
   window.location.href = `/articles/${slug}`
   ```

4. **事件系统**:
   ```typescript
   // Quartz 使用自定义事件
   document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {...})
   
   // AstroSupabase 需要在页面变化时重新渲染
   // 可以通过监听路由变化或使用 React Router 事件
   ```

### 步骤 4: 样式迁移

**文件**: `src/components/quartz/styles/graph.scss` → `src/styles/quartz/graph-quartz.css`

需要：
1. 将 SCSS 变量转换为 CSS 变量
2. 确保与现有的 Quartz 样式系统兼容

### 步骤 5: 类型定义

**文件**: `src/types/graph-quartz.d.ts`

```typescript
export type SimpleSlug = string;
export type FullSlug = string;

export type ContentDetails = {
  slug: FullSlug;
  filePath: string;
  title: string;
  links: SimpleSlug[];
  tags: string[];
  content: string;
};

export interface D3Config {
  drag: boolean;
  zoom: boolean;
  depth: number;
  scale: number;
  repelForce: number;
  centerForce: number;
  linkDistance: number;
  fontSize: number;
  opacityScale: number;
  removeTags: string[];
  showTags: boolean;
  focusOnHover?: boolean;
  enableRadial?: boolean;
}
```

---

## 🔧 关键技术点

### 1. PixiJS 初始化

```typescript
import { Application, Graphics, Text, Container, Circle } from "pixi.js";

const app = new Application();
await app.init({
  width,
  height,
  antialias: true,
  autoStart: false,
  autoDensity: true,
  backgroundAlpha: 0,
  preference: "webgpu", // 优先使用 WebGPU
  resolution: window.devicePixelRatio,
  eventMode: "static",
});
```

### 2. D3 力导向布局

```typescript
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
} from "d3";

const simulation = forceSimulation<NodeData>(nodes)
  .force("charge", forceManyBody().strength(-100 * repelForce))
  .force("center", forceCenter().strength(centerForce))
  .force("link", forceLink(links).distance(linkDistance))
  .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3));

if (enableRadial) {
  simulation.force("radial", forceRadial(radius).strength(0.2));
}
```

### 3. 动画系统 (@tweenjs/tween.js)

```typescript
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js";

const tweenGroup = new TweenGroup();
tweenGroup.add(
  new Tweened<NodeRenderData>(nodeRenderData)
    .to({ alpha: 1 }, 200)
);
tweenGroup.getAll().forEach((tw) => tw.start());
```

### 4. 主题适配

```typescript
const cssVars = [
  "--secondary",
  "--tertiary",
  "--gray",
  "--light",
  "--lightgray",
  "--dark",
  "--darkgray",
  "--bodyFont",
] as const;

const computedStyleMap = cssVars.reduce(
  (acc, key) => {
    acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key);
    return acc;
  },
  {} as Record<typeof cssVars[number], string>,
);
```

---

## 📁 文件结构

```
AstroSupabase/
├── src/
│   ├── components/
│   │   └── quartz/
│   │       ├── Graph.tsx              # 主组件（适配后）
│   │       └── scripts/
│   │           └── graph.inline.ts    # 图谱渲染逻辑（适配后）
│   ├── lib/
│   │   └── graph-data-adapter.ts      # 数据格式转换器（新建）
│   ├── pages/
│   │   └── api/
│   │       └── content-index.json.ts # Quartz 格式数据 API（新建）
│   ├── styles/
│   │   └── quartz/
│   │       └── graph-quartz.css       # 图谱样式（从 SCSS 转换）
│   └── types/
│       └── graph-quartz.d.ts          # 类型定义（新建）
```

---

## 🚀 迁移实施步骤

### 阶段 1: 准备阶段（1-2 小时）

1. ✅ 安装依赖
2. ✅ 创建类型定义文件
3. ✅ 创建数据适配器
4. ✅ 创建 API 端点

### 阶段 2: 组件适配（3-4 小时）

1. ✅ 复制并适配 Graph.tsx
2. ✅ 复制并适配 graph.inline.ts
3. ✅ 处理路径和导航差异
4. ✅ 处理事件系统差异

### 阶段 3: 样式迁移（1-2 小时）

1. ✅ 转换 SCSS 为 CSS
2. ✅ 适配 CSS 变量
3. ✅ 测试主题切换

### 阶段 4: 集成测试（2-3 小时）

1. ✅ 替换现有 KnowledgeGraph 组件
2. ✅ 测试所有交互功能
3. ✅ 性能测试（大量节点）
4. ✅ 跨浏览器测试

### 阶段 5: 优化和清理（1-2 小时）

1. ✅ 代码清理
2. ✅ 文档更新
3. ✅ 移除旧依赖（react-force-graph-2d）

---

## ⚠️ 注意事项

### 1. 性能考虑

- **WebGPU 回退**: PixiJS 会尝试使用 WebGPU，如果不支持会回退到 WebGL
- **节点数量**: 建议测试 100+ 节点的性能
- **动画性能**: 使用 `requestAnimationFrame` 优化动画循环

### 2. 浏览器兼容性

- **WebGPU**: Chrome 113+, Edge 113+（可选，会回退到 WebGL）
- **WebGL**: 几乎所有现代浏览器
- **Canvas API**: 需要 ES6+ 支持

### 3. 数据同步

- **实时更新**: Quartz 图谱数据来自静态 JSON，AstroSupabase 来自数据库
- **缓存策略**: API 响应缓存 5 分钟，平衡性能和实时性
- **增量更新**: 考虑实现 WebSocket 实时更新（可选）

### 4. 路由集成

- **SPA vs MPA**: Quartz 使用 SPA 导航，AstroSupabase 使用标准路由
- **解决方案**: 
  - 选项 1: 使用 Astro View Transitions API
  - 选项 2: 使用标准页面跳转（会重新加载页面）

---

## 📊 功能对比表

| 功能 | Quartz 原生 | 当前实现 | 迁移后 |
|------|------------|---------|--------|
| **渲染引擎** | PixiJS (WebGL) | react-force-graph-2d | PixiJS (WebGL) ✅ |
| **性能** | 支持 1000+ 节点 | 支持 ~100 节点 | 支持 1000+ 节点 ✅ |
| **局部图谱** | ✅ | ✅ | ✅ |
| **全局图谱** | ✅ (弹窗) | ✅ (独立页面) | ✅ (弹窗) |
| **标签节点** | ✅ | ❌ | ✅ |
| **径向布局** | ✅ | ❌ | ✅ |
| **平滑动画** | ✅ (@tweenjs) | ❌ | ✅ |
| **标签淡入淡出** | ✅ | ❌ | ✅ |
| **访问历史** | ✅ (localStorage) | ✅ (localStorage) | ✅ |
| **主题适配** | ✅ | ✅ | ✅ |
| **键盘快捷键** | ✅ (Ctrl+G) | ❌ | ✅ |

---

## 🎯 预期收益

### 性能提升
- **渲染性能**: 提升 5-10 倍（PixiJS WebGL vs Canvas 2D）
- **交互响应**: 60fps 流畅动画
- **扩展性**: 支持 1000+ 节点而不卡顿

### 用户体验提升
- **视觉效果**: 平滑动画、标签渐变
- **交互体验**: 更精确的拖拽、缩放控制
- **功能丰富**: 径向布局、标签节点、全局图谱弹窗

### 技术债务减少
- **依赖简化**: 移除 react-force-graph-2d
- **代码质量**: 使用更成熟、维护更活跃的库
- **可扩展性**: PixiJS 生态系统更丰富

---

## 🔍 测试清单

### 功能测试
- [ ] 局部图谱正确显示当前文章相关节点
- [ ] 全局图谱正确显示所有文章
- [ ] 节点点击跳转到正确文章
- [ ] 节点拖拽功能正常
- [ ] 滚轮缩放功能正常
- [ ] 悬停高亮功能正常
- [ ] 标签节点显示正确
- [ ] 访问历史记录正常

### 性能测试
- [ ] 100 个节点流畅运行
- [ ] 500 个节点流畅运行
- [ ] 1000 个节点可以运行（可能稍慢）
- [ ] 动画 60fps

### 兼容性测试
- [ ] Chrome/Edge (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)
- [ ] 移动端浏览器

### 主题测试
- [ ] 浅色主题显示正确
- [ ] 深色主题显示正确
- [ ] 主题切换后图谱更新

---

## 📚 参考资料

- [Quartz Graph Component](https://github.com/jackyzha0/quartz/blob/v4/quartz/components/Graph.tsx)
- [PixiJS Documentation](https://pixijs.com/)
- [D3.js Force Simulation](https://github.com/d3/d3-force)
- [@tweenjs/tween.js](https://github.com/tweenjs/tween.js/)

---

## 📝 后续优化建议

1. **静态生成**: 考虑在构建时生成 content-index.json，避免运行时查询
2. **增量更新**: 实现 WebSocket 或 Server-Sent Events 实时更新图谱
3. **搜索功能**: 添加搜索框，高亮匹配的节点
4. **节点分组**: 根据标签或分类自动分组节点
5. **导出功能**: 支持导出图谱为图片或 SVG

---

**创建时间**: 2025-01-27
**预计完成时间**: 8-13 小时
**优先级**: 高
