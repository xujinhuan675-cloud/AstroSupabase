# 🚀 Quartz 集成快速开始

## 📋 目录结构

```
F:/IOTO-Doc/
├── 1-Input/                         # IOTO 输入目录
│   ├── 2-碎片笔记/                  # 可作为文章来源
│   └── 4-系统笔记/                  # 可作为文章来源
├── 2-Output/                        # IOTO 输出目录
└── AstroSupabase/                   # 本项目 ⭐
    ├── content/                     # 本地 Markdown 文件 🆕
    │   └── articles/                # 文章存放目录 ⭐⭐⭐
    │       ├── example.md           # 示例文章
    │       └── your-article.md      # 你的文章放这里
    ├── scripts/
    │   └── import-markdown.ts       # 导入脚本
    └── src/
        ├── components/
        │   ├── Backlinks.tsx        # 反向链接组件
        │   └── KnowledgeGraph.tsx   # 知识图谱组件
        ├── lib/
        │   ├── markdown-processor.ts # Markdown 处理器
        │   └── links-service.ts     # 链接管理服务
        └── pages/
            ├── graph.astro          # 知识图谱页面
            └── articles/[id].astro  # 文章详情页面
```

## 📍 文章存放位置

### 方式一：本地 Markdown 文件（推荐用于批量导入）

**位置**：`F:\IOTO-Doc\AstroSupabase\content\articles\`

这是专门为本地 Markdown 文件准备的目录，适合：
- 从 Obsidian 导出的笔记
- 从 IOTO 框架中整理的内容
- 批量导入历史文章

### 方式二：IOTO 框架目录（用于同步工作流）

你也可以直接从 IOTO 框架的目录导入：
- `F:\IOTO-Doc\1-Input\2-碎片笔记\` - 日常笔记
- `F:\IOTO-Doc\1-Input\4-系统笔记\` - 系统化笔记
- `F:\IOTO-Doc\2-Output\2-卡片笔记\` - 已整理的卡片

### 方式三：Web 界面（推荐用于日常创建）

访问 http://localhost:4321/dashboard/article/new 直接在线创建。

## ⚡ 3 步开始使用

### Step 1: 安装依赖

```bash
cd F:\IOTO-Doc\AstroSupabase
npm install tsx
```

### Step 2: 准备文章

**选项 A - 使用示例文章**
```bash
# 示例文章已经存在于 content/articles/example.md
# 可以直接导入测试
```

**选项 B - 创建自己的文章**
```bash
# 在 content/articles/ 目录创建 my-first-note.md
```

```markdown
---
title: "我的第一篇笔记"
slug: "my-first-note"
excerpt: "这是我的第一篇数字花园笔记"
tags: [测试, 笔记]
status: published
---

# 我的第一篇笔记

这是正文内容。

可以使用 [[双向链接]] 语法。

也可以使用 #标签 标记内容。
```

**选项 C - 从 IOTO 目录复制**
```bash
# 将 IOTO 框架中的笔记复制到 content/articles/
copy "F:\IOTO-Doc\1-Input\4-系统笔记\*.md" "F:\IOTO-Doc\AstroSupabase\content\articles\"
```

### Step 3: 导入到数据库

```bash
npm run import
```

导入成功后会显示：
```
✅ 成功: 1 篇
⏭️  跳过: 0 篇
❌ 失败: 0 篇
🎉 导入完成！访问 http://localhost:4321 查看文章
```

## 🎯 使用双向链接

### 基础语法

在任何文章中使用：

```markdown
[[文章标题]]              # 链接到其他文章
[[文章标题|显示文本]]      # 带别名的链接
```

### 完整示例

创建三篇相互关联的文章：

**文章 1: react-basics.md**
```markdown
---
title: "React 基础"
slug: "react-basics"
status: published
---

# React 基础

React 是一个 [[JavaScript]] 库。

相关主题：
- [[React Hooks]]
- [[组件设计模式]]
```

**文章 2: javascript.md**
```markdown
---
title: "JavaScript"
slug: "javascript"
status: published
---

# JavaScript

JavaScript 是 Web 开发的核心。

框架：
- [[React 基础|React]]
- [[Vue 入门]]
```

**文章 3: react-hooks.md**
```markdown
---
title: "React Hooks"
slug: "react-hooks"
status: published
---

# React Hooks

Hooks 是 [[React 基础|React]] 的重要特性。

使用 #React #Hooks 标签。
```

导入这些文章后，它们会自动建立关联！

## 🌐 查看知识图谱

启动开发服务器：

```bash
npm run dev
```

访问：
- 📝 文章列表：http://localhost:4321
- 🌐 知识图谱：http://localhost:4321/graph
- ✍️ 创建文章：http://localhost:4321/dashboard/article/new

## 🔄 与 Obsidian 集成工作流

### 方案 A：导出后导入

```bash
# 1. 在 Obsidian 中编辑笔记
# 2. 将需要发布的笔记复制到 content/articles/
# 3. 运行导入命令
npm run import
```

### 方案 B：直接使用 Obsidian Vault

将 Obsidian Vault 设置为 `F:\IOTO-Doc\AstroSupabase\content`：

1. 打开 Obsidian
2. "打开其他仓库" → "打开文件夹作为仓库"
3. 选择 `F:\IOTO-Doc\AstroSupabase\content`
4. 在 `articles/` 子文件夹中创建笔记
5. 运行 `npm run import` 同步到数据库

### 方案 C：创建软链接（高级）

```powershell
# 将 IOTO 目录链接到 content/articles
# （需要管理员权限）
New-Item -ItemType SymbolicLink -Path "F:\IOTO-Doc\AstroSupabase\content\ioto-notes" -Target "F:\IOTO-Doc\1-Input\4-系统笔记"
```

## 📊 数据库迁移

如果是首次使用，需要先应用数据库迁移：

### 使用 Supabase

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 打开 `drizzle/0003_add_links_support.sql`
4. 复制内容并执行

或者使用命令行（需要配置 DATABASE_URL）：

```bash
npm run db:push
```

## 🎨 自定义配置

### 修改导入路径

编辑 `scripts/import-markdown.ts`：

```typescript
// 将这行
const contentDir = join(process.cwd(), 'content', 'articles');

// 改为你的路径
const contentDir = 'F:/IOTO-Doc/1-Input/4-系统笔记';
```

### 批量更新链接

如果手动修改了数据库中的文章，运行此命令更新所有链接：

```typescript
// 创建 scripts/update-all-links.ts
import { db } from '../src/db/client';
import { articles } from '../src/db/schema';
import { updateArticleLinks } from '../src/lib/links-service';

const allArticles = await db.select().from(articles);

for (const article of allArticles) {
  await updateArticleLinks(article.id, article.content);
  console.log(`Updated: ${article.title}`);
}
```

## 🐛 故障排除

### 导入失败

```bash
# 检查文件格式
# 确保有 title 字段
# 确保文件编码为 UTF-8
```

### 链接不生效

```bash
# 1. 确保目标文章已存在
# 2. 检查 slug 是否匹配
# 3. 确保文章状态为 published
```

### 图谱不显示

```bash
# 1. 至少需要 2 篇文章
# 2. 文章之间需要有链接
# 3. 检查浏览器控制台错误
```

## 📚 下一步

- ✅ 阅读 [QUARTZ_INTEGRATION_PLAN.md](./QUARTZ_INTEGRATION_PLAN.md) 了解技术细节
- ✅ 阅读 [QUARTZ_USAGE_GUIDE.md](./QUARTZ_USAGE_GUIDE.md) 了解完整功能
- ✅ 访问 http://localhost:4321/graph 查看知识图谱
- ✅ 开始创建你的数字花园！

---

💡 **快速测试**：
```bash
npm run dev
# 访问 http://localhost:4321/graph
# 应该能看到示例文章的图谱节点
```

