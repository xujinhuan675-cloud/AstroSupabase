# Quartz 图谱迁移快速开始指南

本文档提供将 Quartz 图谱集成到 AstroSupabase 的快速实施步骤。

## 🚀 快速开始（5 步）

### 步骤 1: 安装依赖

```bash
cd AstroSupabase
npm install pixi.js @tweenjs/tween.js
npm install -D @types/pixi.js
```

### 步骤 2: 验证数据适配器

数据适配器已创建在 `src/lib/graph-data-adapter.ts`。测试 API 端点：

```bash
npm run dev
# 访问 http://localhost:4321/api/content-index.json
```

应该看到类似以下格式的 JSON：

```json
{
  "article-slug": {
    "slug": "article-slug",
    "filePath": "articles/article-slug",
    "title": "Article Title",
    "links": ["other-article"],
    "tags": ["tag1"],
    "content": ""
  }
}
```

### 步骤 3: 复制 Quartz 组件文件

从 `quartz-4` 项目复制以下文件：

```bash
# 1. 复制主组件（需要适配）
cp ../quartz-4/quartz/components/Graph.tsx src/components/quartz/QuartzGraph.tsx

# 2. 复制脚本文件（需要适配）
cp ../quartz-4/quartz/components/scripts/graph.inline.ts src/components/quartz/scripts/graph.inline.ts

# 3. 复制样式文件（需要转换）
cp ../quartz-4/quartz/components/styles/graph.scss src/components/quartz/styles/graph.scss
```

### 步骤 4: 适配组件代码

#### 4.1 修改 Graph.tsx

主要修改点：

1. **导入路径**：
   ```typescript
   // 原: import script from "./scripts/graph.inline"
   // 改为: import { initGraph } from "./scripts/graph.inline"
   ```

2. **样式导入**：
   ```typescript
   // 原: import style from "./styles/graph.scss"
   // 改为: import "./styles/graph.css" // 需要先转换 SCSS 为 CSS
   ```

3. **React Hooks 集成**：
   ```typescript
   // 添加 useEffect 来初始化图谱
   useEffect(() => {
     if (typeof window !== 'undefined') {
       // 初始化图谱脚本
       initGraph(containerRef.current, currentSlug);
     }
   }, [currentSlug]);
   ```

#### 4.2 修改 graph.inline.ts

主要修改点：

1. **数据获取**：
   ```typescript
   // 原:
   const data: Map<SimpleSlug, ContentDetails> = new Map(
     Object.entries<ContentDetails>(await fetchData).map(...)
   );
   
   // 改为:
   const response = await fetch('/api/content-index.json');
   const contentIndex = await response.json();
   const data: Map<string, ContentDetails> = new Map(
     Object.entries<ContentDetails>(contentIndex).map(([k, v]) => [k, v])
   );
   ```

2. **路径处理**：
   ```typescript
   // 简化路径处理，直接使用 slug
   const simplifySlug = (slug: string) => slug;
   const getFullSlug = () => {
     const path = window.location.pathname;
     const match = path.match(/\/articles\/([^/]+)/);
     return match ? match[1] : '';
   };
   ```

3. **导航系统**：
   ```typescript
   // 原: window.spaNavigate(new URL(targ, window.location.toString()))
   // 改为: window.location.href = `/articles/${slug}`
   ```

4. **事件系统**：
   ```typescript
   // 原: document.addEventListener("nav", ...)
   // 改为: 在 React useEffect 中手动触发重新渲染
   ```

### 步骤 5: 转换样式文件

将 SCSS 转换为 CSS：

```bash
# 如果安装了 sass
npx sass src/components/quartz/styles/graph.scss src/styles/quartz/graph-quartz.css

# 或者手动转换（参考 QUARTZ_GRAPH_MIGRATION_PLAN.md）
```

主要转换点：

1. **SCSS 变量** → **CSS 变量**：
   ```scss
   // SCSS
   $lightgray: var(--lightgray);
   
   // CSS
   .graph {
     border-color: var(--lightgray);
   }
   ```

2. **嵌套语法** → **标准 CSS**：
   ```scss
   // SCSS
   .graph {
     & > h3 { ... }
   }
   
   // CSS
   .graph > h3 { ... }
   ```

## 📝 使用示例

### 在页面中使用

```astro
---
// src/pages/graph.astro
import Layout from '../layout/Layout.astro';
import QuartzGraph from '../components/quartz/QuartzGraph';
---

<Layout title="知识图谱">
  <QuartzGraph client:load />
</Layout>
```

### 在文章页中使用局部图谱

```astro
---
// src/pages/articles/[id].astro
import QuartzGraph from '../../components/quartz/QuartzGraph';
---

<Layout title={article.title}>
  <article>
    <!-- 文章内容 -->
  </article>
  
  <aside>
    <QuartzGraph 
      client:load
      localGraph={{ depth: 1 }}
      currentSlug={article.slug}
    />
  </aside>
</Layout>
```

## ⚠️ 常见问题

### Q1: PixiJS 初始化失败

**症状**: 控制台报错 "Application.init is not a function"

**解决**: 检查 PixiJS 版本，确保使用 v8+：
```bash
npm list pixi.js
# 应该是 ^8.14.0 或更高
```

### Q2: 图谱不显示

**检查清单**:
1. ✅ API 端点返回数据：`/api/content-index.json`
2. ✅ 浏览器控制台无错误
3. ✅ 容器元素有正确的尺寸（width > 0, height > 0）
4. ✅ CSS 样式已加载

### Q3: 节点点击不跳转

**解决**: 检查导航路径：
```typescript
// 确保路径格式正确
window.location.href = `/articles/${slug}`;
```

### Q4: 样式不生效

**解决**: 
1. 检查 CSS 文件是否导入
2. 检查 CSS 变量是否定义（来自 Quartz 主题）
3. 检查容器是否有正确的 class 名称

## 🔍 调试技巧

### 启用详细日志

在 `graph.inline.ts` 中添加：

```typescript
console.log('Graph data:', data);
console.log('Nodes:', nodes);
console.log('Links:', links);
```

### 检查 PixiJS 渲染

```typescript
console.log('PixiJS App:', app);
console.log('Stage:', app.stage);
console.log('Renderer:', app.renderer);
```

### 检查 D3 力导向

```typescript
simulation.on('tick', () => {
  console.log('Simulation tick', simulation.alpha());
});
```

## 📚 下一步

完成基础集成后，参考 `QUARTZ_GRAPH_MIGRATION_PLAN.md` 了解：

- 高级配置选项
- 性能优化
- 功能扩展
- 最佳实践

## 🆘 需要帮助？

1. 查看完整的迁移方案：`QUARTZ_GRAPH_MIGRATION_PLAN.md`
2. 参考 Quartz 源码：`../quartz-4/quartz/components/Graph.tsx`
3. 检查现有实现：`src/components/KnowledgeGraph.tsx`

---

**更新时间**: 2025-01-27
