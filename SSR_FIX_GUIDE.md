# 🔧 SSR 问题修复指南

## ✅ 已修复的问题

### 1. `undefined` 错误
**问题**：`Cannot read properties of undefined (reading 'endsWith')`

**原因**：某些路径工具函数在接收到 `undefined` 时没有正确处理

**修复**：在所有关键函数中添加了 `null/undefined` 检查：
- `simplifySlug()`
- `endsWith()`
- `trimSuffix()`
- `stripSlashes()`
- `slugifyFilePath()`

### 2. `window is not defined` 错误
**问题**：`ReferenceError: window is not defined`

**原因**：`react-force-graph-2d` 在 SSR 时尝试访问 `window` 对象

**修复**：使用动态导入，确保组件只在客户端加载

---

## 📝 正确使用 React 组件的方法

### ✅ Backlinks 组件（支持 SSR）

```astro
---
// pages/articles/[id].astro
import Backlinks from '../../components/Backlinks'
---

<article>
  <!-- 文章内容 -->
</article>

<!-- Backlinks 支持 SSR，可以用 client:load -->
<Backlinks articleId={article.id} client:load />
```

**或者延迟加载**：
```astro
<Backlinks articleId={article.id} client:visible />
```

### ⚠️ KnowledgeGraph 组件（仅客户端）

**必须使用 `client:only` 指令**：

```astro
---
// pages/graph.astro 或任何需要显示图谱的页面
import KnowledgeGraph from '../components/KnowledgeGraph'
---

<Layout>
  <h1>知识图谱</h1>
  
  <!-- 必须使用 client:only="react" -->
  <KnowledgeGraph 
    client:only="react"
    height={600}
    showLegend={true}
  />
</Layout>
```

**为什么必须用 `client:only`？**
- `client:load` - 仍然会在服务端预渲染（导致错误）
- `client:visible` - 仍然会在服务端预渲染（导致错误）
- **`client:only="react"`** - ✅ 完全跳过 SSR，只在客户端渲染

---

## 📋 Astro 客户端指令对比

| 指令 | SSR | 何时加载 | 适用场景 |
|------|-----|---------|---------|
| `client:load` | ✅ | 页面加载后立即 | 重要交互组件 |
| `client:idle` | ✅ | 浏览器空闲时 | 次要交互组件 |
| `client:visible` | ✅ | 进入视口时 | 下方的组件 |
| **`client:only="react"`** | ❌ | 仅客户端渲染 | 依赖浏览器 API 的组件 |

---

## 🎯 完整示例

### 文章详情页 (带反向链接)

```astro
---
// src/pages/articles/[id].astro
import Layout from '../../layout/Layout.astro'
import Backlinks from '../../components/Backlinks'
import { getArticle } from '../../lib/articles'
import { processMarkdown } from '../../lib/markdown-processor'

const { id } = Astro.params
const article = await getArticle(parseInt(id))

if (!article) {
  return Astro.redirect('/404')
}

// 处理 Markdown
const processed = await processMarkdown(article.content, {
  allSlugs: [], // 传入所有文章的 slugs
  currentSlug: article.slug,
})
---

<Layout title={article.title}>
  <!-- 导入 Quartz 样式 -->
  <style is:global>
    @import '../../styles/quartz/variables.css';
    @import '../../styles/quartz/callouts.css';
    @import '../../styles/quartz/backlinks.css';
  </style>

  <article class="max-w-4xl mx-auto px-4 py-8">
    <header>
      <h1>{article.title}</h1>
      {processed.tags.length > 0 && (
        <div class="flex gap-2 mt-4">
          {processed.tags.map(tag => (
            <a href={`/tags/${tag}`} class="tag-link">
              {tag}
            </a>
          ))}
        </div>
      )}
    </header>

    <div 
      class="prose prose-lg max-w-none"
      set:html={processed.html}
    />

    <!-- 反向链接 - 使用 client:load -->
    <Backlinks 
      articleId={article.id} 
      client:load 
    />
  </article>

  <!-- Callout 脚本 -->
  <script>
    import { setupCallout } from '../../scripts/callout'
    setupCallout()
  </script>
</Layout>
```

### 知识图谱页面

```astro
---
// src/pages/graph.astro
import Layout from '../layout/Layout.astro'
import KnowledgeGraph from '../components/KnowledgeGraph'
---

<Layout title="知识图谱">
  <!-- 导入样式 -->
  <style is:global>
    @import '../styles/quartz/variables.css';
    @import '../styles/quartz/graph.css';
  </style>

  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">知识图谱</h1>
    <p class="text-gray-600 mb-8">
      可视化展示文章之间的链接关系
    </p>

    <!-- 必须使用 client:only="react" -->
    <KnowledgeGraph 
      client:only="react"
      height={700}
      showLegend={true}
    />
  </div>
</Layout>
```

---

## 🚀 部署检查清单

在部署到 Vercel 前，确保：

- [ ] ✅ `KnowledgeGraph` 使用 `client:only="react"`
- [ ] ✅ `Backlinks` 使用 `client:load` 或 `client:visible`
- [ ] ✅ 所有页面导入了必要的 CSS
- [ ] ✅ Callout 页面加载了 `callout.ts` 脚本
- [ ] ✅ 本地构建成功：`npm run build`
- [ ] ✅ 本地预览正常：`npm run preview`

---

## 🔍 故障排除

### 问题：Graph 页面仍然报 `window is not defined`

**检查**：
```astro
<!-- ❌ 错误 -->
<KnowledgeGraph client:load />

<!-- ✅ 正确 -->
<KnowledgeGraph client:only="react" />
```

### 问题：Graph 组件显示空白

**原因**：动态导入还未完成

**解决**：组件内部已经处理，会显示"初始化图谱组件..."，等待几秒即可

### 问题：某些路径仍然报 undefined

**检查**：确保在调用 `processMarkdown` 时传入了正确的参数：

```typescript
const processed = await processMarkdown(article.content, {
  allSlugs: allArticleSlugs, // 不要传空数组
  currentSlug: article.slug, // 不要传 undefined
})
```

---

## 📚 相关文档

- [Astro 客户端指令](https://docs.astro.build/en/reference/directives-reference/#client-directives)
- [React 与 Astro](https://docs.astro.build/en/guides/integrations-guide/react/)
- [SSR 适配器](https://docs.astro.build/en/guides/server-side-rendering/)

---

## ✅ 总结

1. **Backlinks 组件**：可以用任何 `client:*` 指令
2. **KnowledgeGraph 组件**：**必须**用 `client:only="react"`
3. 部署前本地测试：`npm run build && npm run preview`
4. 确保所有样式文件已导入

**现在你可以安全地部署到 Vercel 了！** 🚀

