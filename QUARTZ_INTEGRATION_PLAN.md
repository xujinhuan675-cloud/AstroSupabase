# Quartz 集成到 AstroSupabase 方案

## 📋 概述

本方案旨在将 Quartz 的数字花园（Digital Garden）特性集成到现有的 AstroSupabase 项目中，实现以下目标：

- ✅ 保留 AstroSupabase 的认证、数据库管理功能
- ✅ 添加 Quartz 风格的双向链接、反向链接
- ✅ 实现知识图谱可视化
- ✅ 增强 Markdown 处理能力（支持 Obsidian 语法）
- ✅ 保持现有的文章管理系统

## 🎯 集成策略

采用**渐进式集成**策略，分为三个阶段：

### 阶段一：基础功能集成 ⭐
- Markdown 增强处理（双向链接解析）
- 数据库扩展（支持链接关系）
- 基础 UI 组件（反向链接展示）

### 阶段二：高级功能 ⭐⭐
- 知识图谱可视化
- 标签系统增强
- 全文搜索

### 阶段三：完整数字花园 ⭐⭐⭐
- 图谱交互功能
- 实时编辑预览
- 导入/导出 Obsidian vault

---

## 🚀 阶段一：基础功能集成

### 1.1 安装依赖

```bash
npm install unified remark-parse remark-gfm remark-wiki-link remark-rehype rehype-stringify
npm install d3 d3-force-3d force-graph
npm install gray-matter reading-time
npm install @types/d3 --save-dev
```

### 1.2 数据库扩展

创建新的迁移文件来支持链接关系：

```sql
-- drizzle/migrations/XXXX_add_links_support.sql

-- 文章标签表
CREATE TABLE IF NOT EXISTS article_tags (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(article_id, tag)
);

-- 文章链接关系表（双向链接）
CREATE TABLE IF NOT EXISTS article_links (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'internal', -- internal, external, embed
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, target_id)
);

-- 创建索引提高查询性能
CREATE INDEX idx_article_tags_tag ON article_tags(tag);
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_links_source ON article_links(source_id);
CREATE INDEX idx_article_links_target ON article_links(target_id);
```

### 1.3 更新 Schema

```typescript
// src/db/schema.ts - 添加以下内容

export const articleTags = pgTable('article_tags', {
  id: serial('id').primaryKey(),
  articleId: serial('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articleLinks = pgTable('article_links', {
  id: serial('id').primaryKey(),
  sourceId: serial('source_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  targetId: serial('target_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  linkType: text('link_type', { enum: ['internal', 'external', 'embed'] }).default('internal'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ArticleTag = typeof articleTags.$inferSelect;
export type ArticleLink = typeof articleLinks.$inferSelect;
```

### 1.4 Markdown 处理器

创建新的 Markdown 处理工具：

```typescript
// src/lib/markdown-processor.ts

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkWikiLink from 'remark-wiki-link';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export interface WikiLink {
  value: string; // 链接文本 [[link]]
  data: {
    permalink: string; // 实际的 URL 或 slug
    exists: boolean; // 链接的文章是否存在
  };
}

export interface ProcessedContent {
  html: string;
  frontmatter: Record<string, any>;
  wikiLinks: WikiLink[];
  tags: string[];
  readingTime: string;
}

export async function processMarkdown(
  content: string,
  resolvePath: (permalink: string) => Promise<boolean> = async () => true
): Promise<ProcessedContent> {
  const { data: frontmatter, content: markdownContent } = matter(content);
  
  const wikiLinks: WikiLink[] = [];
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLink, {
      permalinks: [],
      pageResolver: (name: string) => {
        return [name.toLowerCase().replace(/\s+/g, '-')];
      },
      hrefTemplate: (permalink: string) => {
        return `/articles/${permalink}`;
      },
      aliasDivider: '|',
    })
    .use(() => (tree) => {
      // 提取所有 wikilinks
      const visit = (node: any) => {
        if (node.type === 'wikiLink') {
          wikiLinks.push({
            value: node.value,
            data: node.data,
          });
        }
        if (node.children) {
          node.children.forEach(visit);
        }
      };
      visit(tree);
    })
    .use(remarkRehype)
    .use(rehypeStringify);

  const result = await processor.process(markdownContent);
  const html = String(result);

  // 提取标签
  const tags: string[] = [];
  if (frontmatter.tags) {
    if (Array.isArray(frontmatter.tags)) {
      tags.push(...frontmatter.tags);
    } else if (typeof frontmatter.tags === 'string') {
      tags.push(...frontmatter.tags.split(',').map(t => t.trim()));
    }
  }

  // 从内容中提取 #标签
  const hashtagRegex = /#([^\s#]+)/g;
  let match;
  while ((match = hashtagRegex.exec(markdownContent)) !== null) {
    const tag = match[1];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // 检查链接是否存在
  for (const link of wikiLinks) {
    link.data.exists = await resolvePath(link.data.permalink);
  }

  const stats = readingTime(markdownContent);

  return {
    html,
    frontmatter,
    wikiLinks,
    tags,
    readingTime: stats.text,
  };
}
```

### 1.5 链接管理服务

```typescript
// src/lib/links-service.ts

import { db } from '../db/client';
import { articles, articleLinks, articleTags } from '../db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';
import { processMarkdown } from './markdown-processor';

export interface BacklinkInfo {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
}

/**
 * 更新文章的链接关系
 */
export async function updateArticleLinks(articleId: number, content: string) {
  // 获取文章的 slug 用于解析链接
  const article = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article.length) return;

  // 解析 Markdown 获取所有链接
  const processed = await processMarkdown(content, async (permalink) => {
    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, permalink))
      .limit(1);
    return result.length > 0;
  });

  // 删除旧的链接关系
  await db.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));

  // 创建新的链接关系
  for (const link of processed.wikiLinks) {
    if (link.data.exists) {
      const targetArticle = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, link.data.permalink))
        .limit(1);

      if (targetArticle.length > 0) {
        await db.insert(articleLinks).values({
          sourceId: articleId,
          targetId: targetArticle[0].id,
          linkType: 'internal',
        });
      }
    }
  }

  // 更新标签
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  
  for (const tag of processed.tags) {
    await db.insert(articleTags).values({
      articleId,
      tag,
    });
  }
}

/**
 * 获取文章的反向链接（哪些文章链接到当前文章）
 */
export async function getBacklinks(articleId: number): Promise<BacklinkInfo[]> {
  const links = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
    })
    .from(articleLinks)
    .innerJoin(articles, eq(articleLinks.sourceId, articles.id))
    .where(eq(articleLinks.targetId, articleId));

  return links;
}

/**
 * 获取文章的前向链接（当前文章链接到哪些文章）
 */
export async function getForwardLinks(articleId: number): Promise<BacklinkInfo[]> {
  const links = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
    })
    .from(articleLinks)
    .innerJoin(articles, eq(articleLinks.targetId, articles.id))
    .where(eq(articleLinks.sourceId, articleId));

  return links;
}

/**
 * 获取所有文章的链接关系（用于构建知识图谱）
 */
export async function getGraphData() {
  const allArticles = await db.select().from(articles);
  const allLinks = await db.select().from(articleLinks);

  return {
    nodes: allArticles.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
    })),
    links: allLinks.map(l => ({
      source: l.sourceId,
      target: l.targetId,
    })),
  };
}
```

### 1.6 反向链接组件

```tsx
// src/components/Backlinks.tsx

import React, { useEffect, useState } from 'react';

interface Backlink {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
}

interface BacklinksProps {
  articleId: number;
}

export default function Backlinks({ articleId }: BacklinksProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${articleId}/backlinks`)
      .then(res => res.json())
      .then(data => {
        setBacklinks(data.backlinks || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching backlinks:', err);
        setLoading(false);
      });
  }, [articleId]);

  if (loading) {
    return (
      <div className="mt-8 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">反向链接</h3>
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="mt-8 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">反向链接</h3>
        <p className="text-gray-500">暂无其他文章链接到此文章</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">
        反向链接 ({backlinks.length})
      </h3>
      <div className="space-y-3">
        {backlinks.map((backlink) => (
          <a
            key={backlink.id}
            href={`/articles/${backlink.slug}`}
            className="block p-3 bg-white rounded-md hover:bg-blue-50 transition-colors"
          >
            <h4 className="font-medium text-blue-600 hover:text-blue-800">
              {backlink.title}
            </h4>
            {backlink.excerpt && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {backlink.excerpt}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
```

### 1.7 API 端点

```typescript
// src/pages/api/articles/[id]/backlinks.ts

import type { APIRoute } from 'astro';
import { getBacklinks } from '../../../../lib/links-service';

export const GET: APIRoute = async ({ params }) => {
  const articleId = parseInt(params.id || '0');

  if (!articleId) {
    return new Response(JSON.stringify({ error: 'Invalid article ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const backlinks = await getBacklinks(articleId);
    
    return new Response(JSON.stringify({ backlinks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching backlinks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

```typescript
// src/pages/api/graph-data.ts

import type { APIRoute } from 'astro';
import { getGraphData } from '../../lib/links-service';

export const GET: APIRoute = async () => {
  try {
    const graphData = await getGraphData();
    
    return new Response(JSON.stringify(graphData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

### 1.8 更新文章页面

```astro
---
// src/pages/articles/[id].astro - 修改以支持新功能

import Layout from '../../layout/Layout.astro';
import { getArticleById } from '../../lib/articles';
import { processMarkdown } from '../../lib/markdown-processor';
import Backlinks from '../../components/Backlinks';

const { id } = Astro.params;
const articleId = parseInt(id || '0');

const article = await getArticleById(articleId);

if (!article) {
  return Astro.redirect('/404');
}

// 处理 Markdown 内容
const processed = await processMarkdown(article.content);
---

<Layout title={article.title}>
  <article class="max-w-4xl mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-4">{article.title}</h1>
      {article.excerpt && (
        <p class="text-xl text-gray-600 mb-4">{article.excerpt}</p>
      )}
      <div class="flex items-center gap-4 text-sm text-gray-500">
        <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('zh-CN')}</span>
        <span>·</span>
        <span>{processed.readingTime}</span>
      </div>
      {processed.tags.length > 0 && (
        <div class="flex gap-2 mt-4">
          {processed.tags.map(tag => (
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </header>

    <div 
      class="prose prose-lg max-w-none mb-8"
      set:html={processed.html}
    />

    <!-- 反向链接组件 -->
    <Backlinks articleId={articleId} client:load />
  </article>
</Layout>
```

---

## 🎨 阶段二：知识图谱可视化

### 2.1 安装图谱依赖

```bash
npm install react-force-graph-2d
npm install @types/d3 --save-dev
```

### 2.2 创建知识图谱组件

```tsx
// src/components/KnowledgeGraph.tsx

import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface GraphNode {
  id: number;
  title: string;
  slug: string;
}

interface GraphLink {
  source: number;
  target: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function KnowledgeGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const graphRef = useRef<any>();

  useEffect(() => {
    fetch('/api/graph-data')
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching graph data:', err);
        setLoading(false);
      });
  }, []);

  const handleNodeClick = (node: any) => {
    window.location.href = `/articles/${node.slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">加载知识图谱中...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="title"
        nodeColor={() => '#3b82f6'}
        linkColor={() => '#cbd5e1'}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.title;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

          // 绘制背景
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          // 绘制文本
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, node.x, node.y);
        }}
        cooldownTicks={100}
        onEngineStop={() => graphRef.current?.zoomToFit(400)}
      />
    </div>
  );
}
```

### 2.3 创建图谱页面

```astro
---
// src/pages/graph.astro

import Layout from '../layout/Layout.astro';
import KnowledgeGraph from '../components/KnowledgeGraph';
---

<Layout title="知识图谱">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">知识图谱</h1>
    <p class="text-gray-600 mb-8">
      可视化展示文章之间的链接关系，点击节点可跳转到对应文章。
    </p>
    <KnowledgeGraph client:load />
  </div>
</Layout>
```

---

## 🔧 阶段三：完整数字花园功能

### 3.1 全文搜索（使用 PostgreSQL 全文搜索）

```sql
-- 添加全文搜索支持
ALTER TABLE articles ADD COLUMN search_vector tsvector;

CREATE INDEX articles_search_idx ON articles USING gin(search_vector);

-- 创建触发器自动更新搜索向量
CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.content,'')), 'B');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update BEFORE INSERT OR UPDATE
  ON articles FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

### 3.2 实时预览编辑器

使用现有的 React 生态系统，集成 MDX 编辑器：

```bash
npm install @uiw/react-md-editor
```

```tsx
// src/components/dashboard/MarkdownEditor.tsx

import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ initialValue, onChange }: MarkdownEditorProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (val?: string) => {
    const newValue = val || '';
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={handleChange}
        height={600}
        preview="live"
        commands={[
          // 自定义命令支持 [[wikilink]]
        ]}
      />
    </div>
  );
}
```

---

## 📝 实施步骤

### Step 1: 准备工作
```bash
cd F:/IOTO-Doc/AstroSupabase
npm install unified remark-parse remark-gfm remark-wiki-link remark-rehype rehype-stringify
npm install gray-matter reading-time
npm install react-force-graph-2d
```

### Step 2: 数据库迁移
```bash
# 创建新的迁移文件
npx drizzle-kit generate

# 应用迁移
npx drizzle-kit push
```

### Step 3: 创建新文件
按照上面的代码示例创建以下文件：
- `src/lib/markdown-processor.ts`
- `src/lib/links-service.ts`
- `src/components/Backlinks.tsx`
- `src/components/KnowledgeGraph.tsx`
- `src/pages/api/articles/[id]/backlinks.ts`
- `src/pages/api/graph-data.ts`
- `src/pages/graph.astro`

### Step 4: 更新现有文件
- 更新 `src/db/schema.ts` 添加新表
- 更新 `src/pages/articles/[id].astro` 集成反向链接

### Step 5: 测试
1. 创建几篇包含 `[[wiki-link]]` 的测试文章
2. 检查链接解析是否正确
3. 验证反向链接显示
4. 测试知识图谱页面

---

## 🎯 使用示例

### 创建带双向链接的文章

```markdown
---
title: "我的第一篇数字花园笔记"
tags: [数字花园, Quartz, Astro]
---

# 我的第一篇数字花园笔记

这是一个测试笔记，我想要链接到 [[Astro 框架介绍]]。

在 Obsidian 中，我们可以使用 #标签 来组织内容。

还可以链接到其他笔记：[[React 组件设计模式]]。

这些链接会自动被解析，并在数据库中建立关系。
```

### 查看反向链接

访问任何文章页面，滚动到底部即可看到"反向链接"部分，显示所有链接到当前文章的其他文章。

### 浏览知识图谱

访问 `/graph` 页面，可以看到所有文章的关系网络图。点击任意节点可跳转到对应文章。

---

## 🔄 与 Obsidian 集成

如果你使用 Obsidian 管理笔记，可以：

1. 将 Obsidian vault 路径设置为 `F:/IOTO-Doc/1-Input/` 或其他目录
2. 创建同步脚本，定期将 Obsidian 笔记同步到数据库
3. 使用 Obsidian 的 Dataview 插件配合 IOTO 框架

---

## 📚 参考资源

- [Quartz 官方文档](https://quartz.jzhao.xyz/)
- [remark-wiki-link](https://github.com/landakram/remark-wiki-link)
- [Obsidian 官方文档](https://help.obsidian.md/)
- [Astro 内容集合](https://docs.astro.build/en/guides/content-collections/)

---

## 🐛 常见问题

### Q: 链接无法解析怎么办？
A: 确保文章的 `slug` 字段与链接名称匹配。例如 `[[hello-world]]` 需要有一篇 slug 为 `hello-world` 的文章。

### Q: 知识图谱显示空白？
A: 检查是否有足够的文章和链接关系。至少需要 2 篇文章互相链接才能看到效果。

### Q: 如何批量导入 Obsidian 笔记？
A: 可以创建一个迁移脚本，读取 Markdown 文件并通过 API 创建文章。

---

## ✅ 下一步

1. ⬜ 实现阶段一的基础功能
2. ⬜ 测试双向链接和反向链接
3. ⬜ 添加知识图谱可视化
4. ⬜ 集成全文搜索
5. ⬜ 创建 Obsidian 同步脚本

---

**祝你集成顺利！如有问题，欢迎随时提问。**

