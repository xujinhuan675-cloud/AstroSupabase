# Quartz 集成使用指南

## 📁 文章目录结构

### 数据库存储（当前方式）
目前 AstroSupabase 项目使用 **PostgreSQL 数据库** 存储文章，通过 Web 界面管理。

### 本地 Markdown 文件存储（推荐位置）

如果你想从本地 Markdown 文件导入文章，建议使用以下目录结构：

```
F:/IOTO-Doc/
├── 1-Input/                    # 输入笔记目录
│   ├── 1-原始资料/             # 未加工的原始资料
│   ├── 2-碎片笔记/             # 日常碎片笔记
│   ├── 3-专题笔记/             # 按主题整理的笔记
│   └── 4-系统笔记/             # 系统化的知识笔记
├── 2-Output/                   # 输出内容目录
│   ├── 2-卡片笔记/             # 可发布的卡片笔记
│   └── ...
└── AstroSupabase/              # 本项目
    └── content/                # 待同步的 Markdown 文件（新增）
        ├── articles/           # 文章目录
        └── drafts/             # 草稿目录
```

## 🚀 快速开始

### 1. 数据库初始化

首先需要应用数据库迁移：

```bash
cd F:\IOTO-Doc\AstroSupabase

# 如果使用 Supabase，需要先连接到数据库
# 手动执行迁移 SQL
```

**手动执行迁移**：
1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 执行 `drizzle/0003_add_links_support.sql` 文件中的内容

### 2. 启动开发服务器

```bash
npm run dev
```

访问：
- 首页：http://localhost:4321
- 知识图谱：http://localhost:4321/graph
- 文章管理：http://localhost:4321/dashboard/article

## ✍️ 创建文章

### 方式一：Web 界面创建（推荐）

1. 访问 http://localhost:4321/dashboard/article/new
2. 填写文章信息
3. 在内容中使用双向链接语法

### 方式二：从本地 Markdown 导入

#### 创建内容目录

```bash
mkdir -p F:\IOTO-Doc\AstroSupabase\content\articles
```

#### Markdown 文件格式

在 `content/articles/` 目录下创建 `.md` 文件：

```markdown
---
title: "我的第一篇数字花园笔记"
slug: "my-first-digital-garden-note"
excerpt: "这是一篇关于数字花园的介绍"
tags: [数字花园, Quartz, Astro]
status: published
---

# 我的第一篇数字花园笔记

这是正文内容。

## 使用双向链接

你可以链接到其他笔记：[[Astro 框架介绍]]

也可以使用别名：[[Astro 框架介绍|Astro 简介]]

## 使用标签

内容中也可以使用 #数字花园 #笔记管理 标签。

## 链接到其他文章

- [[React 组件设计]]
- [[TypeScript 最佳实践]]
```

#### 创建导入脚本

创建 `scripts/import-markdown.ts`：

```typescript
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { db } from '../src/db/client';
import { articles } from '../src/db/schema';
import { updateArticleLinks } from '../src/lib/links-service';
import { generateSlug } from '../src/lib/markdown-processor';

async function importMarkdownFiles() {
  const contentDir = join(process.cwd(), 'content', 'articles');
  
  try {
    const files = await readdir(contentDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`找到 ${mdFiles.length} 个 Markdown 文件`);
    
    for (const file of mdFiles) {
      const filePath = join(contentDir, file);
      const content = await readFile(filePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);
      
      // 生成 slug
      const slug = data.slug || generateSlug(data.title || file.replace('.md', ''));
      
      // 检查文章是否已存在
      const existing = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, slug))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`跳过已存在的文章: ${data.title}`);
        continue;
      }
      
      // 插入文章
      const [inserted] = await db
        .insert(articles)
        .values({
          title: data.title,
          slug,
          excerpt: data.excerpt,
          content: markdownContent,
          authorId: 'system',
          status: data.status || 'draft',
          publishedAt: data.status === 'published' ? new Date() : null,
        })
        .returning();
      
      console.log(`导入文章: ${data.title} (ID: ${inserted.id})`);
      
      // 更新链接关系
      await updateArticleLinks(inserted.id, markdownContent);
    }
    
    console.log('导入完成！');
  } catch (error) {
    console.error('导入失败:', error);
  }
}

importMarkdownFiles();
```

#### 配置 package.json

在 `package.json` 中添加导入命令：

```json
{
  "scripts": {
    "import": "tsx scripts/import-markdown.ts"
  }
}
```

安装依赖：

```bash
npm install -D tsx
```

#### 执行导入

```bash
npm run import
```

## 🔗 双向链接语法

### 基础语法

```markdown
[[文章标题]]              # 基础链接
[[文章-slug]]             # 使用 slug 链接
[[文章标题|显示文本]]      # 带别名的链接
```

### 示例

```markdown
# 我的笔记

在学习 [[TypeScript]] 的时候，我发现 [[React|React 框架]] 很有用。

还可以参考 [[JavaScript 基础知识]] 来巩固基础。
```

### 链接解析规则

1. 系统会将 `[[文章标题]]` 自动转换为 `[[文章-slug]]`
2. 支持中文标题，会自动转换为拼音或保持原样
3. 链接的文章必须在数据库中存在才会生效

## 🏷️ 标签系统

### 两种标签方式

#### 1. Frontmatter 标签

```markdown
---
title: "文章标题"
tags: [标签1, 标签2, 标签3]
---
```

#### 2. 内容标签

```markdown
这是一篇关于 #数字花园 和 #知识管理 的文章。

我们讨论了 #Obsidian #Quartz #Astro 等工具。
```

### 查看标签

- API: http://localhost:4321/api/tags
- 按标签查看文章: http://localhost:4321/api/tags/{标签名}

## 📊 知识图谱

### 访问图谱

访问 http://localhost:4321/graph 查看知识图谱。

### 图谱功能

- ✅ 可视化文章关系网络
- ✅ 点击节点跳转到文章
- ✅ 拖拽节点调整位置
- ✅ 滚轮缩放查看
- ✅ 鼠标悬停高亮关联节点

### 图谱数据

知识图谱基于以下数据构建：
- **节点**：所有已发布的文章
- **边**：文章之间的双向链接关系

## 🔄 与 Obsidian 集成

### 配置 Obsidian Vault

1. 在 Obsidian 中打开 `F:/IOTO-Doc` 作为 Vault
2. 或创建新的 Vault 指向 `F:/IOTO-Doc/AstroSupabase/content`

### 推荐插件

- **Dataview**: 查询和展示笔记数据
- **Templater**: 使用模板创建笔记
- **Excalidraw**: 绘制图表
- **Calendar**: 日历视图

### 同步工作流

```
Obsidian (本地编辑)
    ↓
content/articles/ (Markdown 文件)
    ↓
npm run import (导入脚本)
    ↓
PostgreSQL 数据库
    ↓
AstroSupabase (Web 展示)
```

## 📝 文章管理 API

### 获取文章列表

```bash
curl http://localhost:4321/api/articles
```

### 获取单篇文章

```bash
curl http://localhost:4321/api/articles/1
```

### 获取反向链接

```bash
curl http://localhost:4321/api/articles/1/backlinks
```

### 获取前向链接

```bash
curl http://localhost:4321/api/articles/1/forward-links
```

### 获取图谱数据

```bash
curl http://localhost:4321/api/graph-data
```

### 获取所有标签

```bash
curl http://localhost:4321/api/tags
```

### 按标签查询文章

```bash
curl http://localhost:4321/api/tags/数字花园
```

## 🛠️ 开发工作流

### 编辑文章后更新链接

当你在 Web 界面或数据库中编辑文章后，链接关系会自动更新。

如果需要手动触发更新：

```typescript
import { updateArticleLinks } from './src/lib/links-service';

// 更新某篇文章的链接
await updateArticleLinks(articleId, articleContent);
```

### 监控数据库

```sql
-- 查看所有链接关系
SELECT 
  a1.title as source,
  a2.title as target
FROM article_links al
JOIN articles a1 ON al.source_id = a1.id
JOIN articles a2 ON al.target_id = a2.id;

-- 查看标签统计
SELECT tag, COUNT(*) as count
FROM article_tags
GROUP BY tag
ORDER BY count DESC;
```

## 🎨 自定义样式

### 修改文章样式

编辑 `src/pages/articles/[id].astro` 中的 `<style>` 部分：

```css
.prose a {
  @apply text-purple-600 hover:text-purple-800; /* 修改链接颜色 */
}
```

### 修改图谱样式

编辑 `src/components/KnowledgeGraph.tsx` 中的节点颜色：

```typescript
ctx.fillStyle = isHover ? '#your-color' : '#default-color';
```

## 🐛 常见问题

### Q1: 链接无法解析？

**A:** 确保：
1. 目标文章的 `slug` 与链接中的名称匹配
2. 目标文章状态为 `published`
3. 目标文章未被删除（`isDeleted = false`）

### Q2: 图谱显示空白？

**A:** 检查：
1. 是否有已发布的文章
2. 文章之间是否有链接关系
3. 浏览器控制台是否有错误

### Q3: 如何批量导入 Obsidian 笔记？

**A:** 使用上面提供的导入脚本，将 Obsidian vault 中的文件复制到 `content/articles/` 目录后执行 `npm run import`。

### Q4: 反向链接不显示？

**A:** 确认：
1. 已调用 `updateArticleLinks()` 更新链接关系
2. API 端点正常工作
3. React 组件正确加载（`client:load`）

## 📚 推荐阅读

- [Quartz 官方文档](https://quartz.jzhao.xyz/)
- [Astro 文档](https://docs.astro.build/)
- [Obsidian 官方文档](https://help.obsidian.md/)
- [数字花园概念介绍](https://maggieappleton.com/garden-history)

## 🔮 未来功能

计划中的功能：
- [ ] 自动监听文件变化并同步
- [ ] 支持图片和附件上传
- [ ] 全文搜索功能
- [ ] 文章版本历史
- [ ] 协作编辑
- [ ] RSS 订阅

---

**需要帮助？** 查看 [QUARTZ_INTEGRATION_PLAN.md](./QUARTZ_INTEGRATION_PLAN.md) 了解技术细节。

