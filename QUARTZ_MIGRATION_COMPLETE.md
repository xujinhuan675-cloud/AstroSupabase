# ✅ Quartz 代码迁移完成总结

## 🎉 迁移状态：**已完成**

本文档记录了从 Quartz-4 到 AstroSupabase 的代码迁移过程和结果。

---

## 📦 已迁移的核心模块

### 1. ✅ 工具函数（Utilities）

**位置**: `src/lib/quartz/util/`

| 文件 | 功能 | 来源 |
|------|------|------|
| `path.ts` | 路径处理、slug 转换、链接转换 | `quartz/util/path.ts` |
| `lang.ts` | 语言工具（capitalize, classNames） | `quartz/util/lang.ts` |
| `clone.ts` | 深度克隆工具 | `quartz/util/clone.ts` |

**核心功能**：
- ✅ `slugifyFilePath` - 文件路径转 slug
- ✅ `simplifySlug` - 简化 slug
- ✅ `transformLink` - 链接转换（支持 absolute、relative、shortest 策略）
- ✅ `splitAnchor` - 分离锚点
- ✅ `slugTag` - 标签 slug 化
- ✅ 完整的类型定义（FullSlug、SimpleSlug、RelativeURL、FilePath）

### 2. ✅ Markdown 转换器（Transformers）

**位置**: `src/lib/quartz/transformers/`

#### 2.1 ObsidianFlavoredMarkdown (OFM)
**文件**: `ofm.ts`
**功能**：
- ✅ Wiki 链接 `[[page]]` 和 `[[page|alias]]`
- ✅ 高亮语法 `==text==`
- ✅ 注释 `%% comment %%`
- ✅ Callouts 提示框 `[!note]`、`[!warning]` 等
- ✅ Mermaid 图表支持
- ✅ 标签解析 `#tag`（支持中文）
- ✅ 箭头符号 `->` `=>` `<-` `<=`
- ✅ YouTube 嵌入
- ✅ 视频/音频嵌入
- ✅ 图片嵌入（带尺寸）
- ✅ PDF 嵌入
- ✅ 块引用

**导出函数**：
```typescript
createOFMPlugins(options, allSlugs, baseSlug) // 创建插件
preprocessMarkdown(src, options) // 预处理
```

#### 2.2 Links 处理器
**文件**: `links.ts`
**功能**：
- ✅ 提取所有出站链接
- ✅ 区分内部/外部链接
- ✅ 添加外部链接图标
- ✅ 链接美化（prettyLinks）
- ✅ 懒加载资源
- ✅ 在新标签页打开外部链接

**导出函数**：
```typescript
createLinksPlugin(options, allSlugs, currentSlug)
extractLinks(content) // 从内容提取链接
```

### 3. ✅ 重写的 Markdown 处理器

**文件**: `src/lib/markdown-processor.ts`

**改进**：
- ✅ 使用 Quartz OFM 和 Links 转换器
- ✅ 支持完整的 Obsidian 语法
- ✅ 自动提取标签（frontmatter + #hashtag）
- ✅ 提取 Wiki 链接并验证存在性
- ✅ 生成摘要
- ✅ 计算阅读时间
- ✅ 返回出站链接列表

**新接口**：
```typescript
interface ProcessedContent {
  html: string
  frontmatter: Record<string, any>
  wikiLinks: WikiLink[]
  tags: string[]
  readingTime: string
  excerpt: string
  links: SimpleSlug[] // 新增：所有出站链接
}
```

### 4. ✅ 样式文件（Styles）

**位置**: `src/styles/quartz/`

| 文件 | 功能 | 来源 |
|------|------|------|
| `variables.css` | CSS 变量（颜色、主题） | `quartz/styles/variables.scss` |
| `backlinks.css` | 反向链接样式 | `quartz/components/styles/backlinks.scss` |
| `graph.css` | 知识图谱样式 | `quartz/components/styles/graph.scss` |
| `callouts.css` | Callout 提示框样式 | `quartz/styles/callouts.scss` |

**特性**：
- ✅ 支持亮/暗色模式
- ✅ 完整的 Callout 类型（note、warning、tip、success、danger 等）
- ✅ 可折叠 Callout 动画
- ✅ 内部/外部链接样式
- ✅ 高亮文本样式
- ✅ 标签链接样式

### 5. ✅ React 组件

#### 5.1 Backlinks 组件
**文件**: `src/components/Backlinks.tsx`

**改进**：
- ✅ 使用 Quartz 样式
- ✅ 支持 `hideWhenEmpty` 选项
- ✅ 简洁的 UI
- ✅ 显示文章摘要

**Props**:
```typescript
interface BacklinksProps {
  articleId: number
  hideWhenEmpty?: boolean
}
```

#### 5.2 KnowledgeGraph 组件
**文件**: `src/components/KnowledgeGraph.tsx`

**新增功能**：
- ✅ 使用 Quartz 辅助函数
- ✅ 访问历史跟踪（localStorage）
- ✅ 暗色模式支持
- ✅ 节点高亮和悬停效果
- ✅ 访问过/未访问节点区分
- ✅ 图例说明

**Props**:
```typescript
interface KnowledgeGraphProps {
  currentSlug?: string
  height?: number
  showLegend?: boolean
}
```

### 6. ✅ 客户端脚本

**位置**: `src/scripts/`

| 文件 | 功能 |
|------|------|
| `callout.ts` | Callout 折叠交互 |
| `graph-helpers.ts` | Graph 辅助函数 |

**graph-helpers.ts 导出**：
```typescript
fetchGraphData() // 获取图谱数据
filterGraphByDepth() // 按深度过滤
getNodeDegree() // 计算节点度数
getNodeColor() // 获取节点颜色
getLinkColor() // 获取链接颜色
saveVisitedNode() // 保存访问历史
getVisitedNodes() // 获取访问历史
isDarkMode() // 检测暗色模式
```

### 7. ✅ 依赖更新

**package.json 新增依赖**：
```json
{
  "d3": "^7.9.0",
  "github-slugger": "^2.0.0",
  "hast-util-to-html": "^9.0.5",
  "is-absolute-url": "^5.0.0",
  "mdast-util-find-and-replace": "^3.0.2",
  "mdast-util-to-hast": "^13.2.0",
  "rehype-raw": "^7.0.0",
  "rfdc": "^1.4.1",
  "unist-util-visit": "^5.0.0",
  "@types/hast": "^3.0.4",
  "@types/mdast": "^4.0.4"
}
```

---

## 🎯 核心功能对比

| 功能 | 迁移前 | 迁移后 |
|------|--------|--------|
| Wiki 链接解析 | ✅ 基础支持 | ✅✅ 完整 Obsidian 语法 |
| Callouts | ❌ | ✅ 12+ 类型，可折叠 |
| 高亮文本 | ❌ | ✅ `==text==` |
| Mermaid | ❌ | ✅ 代码块支持 |
| 标签提取 | ✅ 基础 | ✅ frontmatter + #hashtag |
| 链接类型识别 | ❌ | ✅ 内部/外部/断开 |
| 外部链接图标 | ❌ | ✅ |
| 箭头符号 | ❌ | ✅ -> => <- <= |
| YouTube 嵌入 | ❌ | ✅ 自动识别 |
| PDF 嵌入 | ❌ | ✅ |
| 块引用 | ❌ | ✅ ^block-id |
| 访问历史 | ❌ | ✅ Graph 节点追踪 |
| 暗色模式 | 部分 | ✅ 完整支持 |

---

## 📝 使用示例

### 1. 使用新的 Markdown 处理器

```typescript
import { processMarkdown } from './lib/markdown-processor'

const content = `
---
title: "我的笔记"
tags: [知识管理, Obsidian]
---

# 我的笔记

这是一个 ==高亮文本==。

链接到 [[另一篇文章]] 或 [[文章|别名]]。

> [!note] 这是一个提示
> 内容在这里

使用 #标签 组织内容。

\`\`\`mermaid
graph LR
A --> B
\`\`\`
`

const result = await processMarkdown(content, {
  ofm: {
    wikilinks: true,
    callouts: true,
    mermaid: true,
    parseTags: true,
  },
  allSlugs: ['another-article'], // 用于验证链接
})

console.log(result.html) // 渲染的 HTML
console.log(result.tags) // ['知识管理', 'Obsidian', '标签']
console.log(result.wikiLinks) // 提取的 wiki 链接
```

### 2. 使用 Backlinks 组件

```tsx
import Backlinks from './components/Backlinks'

<Backlinks 
  articleId={123} 
  hideWhenEmpty={false}
/>
```

### 3. 使用 KnowledgeGraph 组件

```tsx
import KnowledgeGraph from './components/KnowledgeGraph'

<KnowledgeGraph 
  currentSlug="current-article"
  height={600}
  showLegend={true}
/>
```

### 4. 使用样式

在你的 Astro/React 组件中导入：

```tsx
import '../styles/quartz/variables.css'
import '../styles/quartz/callouts.css'
import '../styles/quartz/backlinks.css'
import '../styles/quartz/graph.css'
```

或在全局样式中：

```css
@import './styles/quartz/variables.css';
@import './styles/quartz/callouts.css';
@import './styles/quartz/backlinks.css';
@import './styles/quartz/graph.css';
```

---

## 🚀 下一步操作

### 1. 安装依赖

```bash
cd F:/IOTO-Doc/AstroSupabase
npm install
```

### 2. 测试 Markdown 处理

创建测试文件测试新功能：

```markdown
---
title: "测试文章"
tags: [测试]
---

# 测试 Quartz 功能

## Wiki 链接
[[其他文章]] 和 [[文章|别名]]

## Callout
> [!warning] 警告
> 这是警告内容

## 高亮
这是 ==重要文本==

## 标签
使用 #测试标签

## Mermaid
\`\`\`mermaid
graph TD
A --> B
\`\`\`
```

### 3. 更新导入脚本

更新 `scripts/import-markdown.ts` 使用新的处理器：

```typescript
import { processMarkdown } from '../src/lib/markdown-processor'
import { db } from '../src/db/client'
import { articles } from '../src/db/schema'

// 获取所有现有文章的 slugs
const allArticles = await db.select().from(articles)
const allSlugs = allArticles.map(a => a.slug)

const result = await processMarkdown(fileContent, {
  allSlugs,
  currentSlug: articleSlug,
})

// 插入文章时保存链接关系
await updateArticleLinks(articleId, fileContent)
```

### 4. 更新文章详情页

在 `src/pages/articles/[id].astro` 中：

```astro
---
import { processMarkdown } from '../../lib/markdown-processor'
import Backlinks from '../../components/Backlinks'

const article = await getArticle(id)
const allSlugs = await getAllSlugs()

const processed = await processMarkdown(article.content, {
  allSlugs,
  currentSlug: article.slug,
})
---

<article>
  <div set:html={processed.html} />
  
  <!-- 反向链接 -->
  <Backlinks articleId={article.id} client:load />
</article>

<style>
  @import '../../styles/quartz/variables.css';
  @import '../../styles/quartz/callouts.css';
</style>

<script src="../../scripts/callout.ts"></script>
```

---

## ⚠️ 已知限制和注意事项

1. **Graph 实现**
   - 使用 `react-force-graph-2d` 而非 Quartz 的 PixiJS + D3 实现
   - 功能已覆盖核心需求，但渲染性能可能不如原版

2. **Callout 脚本**
   - 需要在包含 Callout 的页面加载 `callout.ts` 脚本
   - 或在全局加载以支持动态内容

3. **路径处理**
   - Quartz 的路径工具假设文件系统结构
   - 在数据库驱动的系统中，某些功能需要适配

4. **依赖版本**
   - 确保所有依赖版本兼容
   - 特别注意 `unified` 生态系统的版本

---

## 🔧 故障排除

### 问题：Wiki 链接没有解析

**原因**：未传递 `allSlugs` 参数

**解决**：
```typescript
const allSlugs = await db.select({ slug: articles.slug }).from(articles)
const processed = await processMarkdown(content, {
  allSlugs: allSlugs.map(a => a.slug),
})
```

### 问题：Callout 无法折叠

**原因**：未加载 `callout.ts` 脚本

**解决**：
```html
<script src="/src/scripts/callout.ts"></script>
```

或在 Astro 组件中：
```astro
<script>
  import { setupCallout } from '../../scripts/callout'
  setupCallout()
</script>
```

### 问题：样式未生效

**原因**：未导入 CSS 文件

**解决**：
```tsx
import '../styles/quartz/variables.css'
import '../styles/quartz/callouts.css'
```

### 问题：类型错误

**原因**：缺少类型定义

**解决**：
```bash
npm install --save-dev @types/hast @types/mdast
```

---

## 📚 参考资源

- [Quartz 官方文档](https://quartz.jzhao.xyz/)
- [Obsidian 帮助文档](https://help.obsidian.md/)
- [Unified 生态系统](https://unified.js.org/)
- [remark 插件](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [rehype 插件](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)

---

## ✅ 迁移检查清单

- [x] 核心工具函数迁移
- [x] ObsidianFlavoredMarkdown 转换器
- [x] Links 处理器
- [x] Markdown 处理器重写
- [x] 样式文件迁移
- [x] Backlinks 组件更新
- [x] KnowledgeGraph 组件更新
- [x] 客户端脚本创建
- [x] package.json 依赖更新
- [x] 文档编写

---

**🎉 迁移完成！现在你的 AstroSupabase 项目拥有了 Quartz 的强大 Markdown 处理能力！**

如有问题，请参考本文档的故障排除部分或查阅源代码注释。

