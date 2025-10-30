# 📦 Markdown 自动导入配置指南

## 🎯 功能说明

本项目支持从 `content/` 目录自动导入 Markdown 文件到 Supabase 数据库，并通过 GitHub Actions 实现自动化部署。

---

## 🚀 快速开始

### 1. 准备 Markdown 文件

在项目根目录创建 `content/` 目录，并添加您的 Markdown 文件：

```
AstroSupabase/
├── content/
│   ├── articles/
│   │   ├── javascript-basics.md
│   │   └── react-tutorial.md
│   └── notes/
│       └── study-notes.md
└── ...
```

### 2. Markdown 文件格式

每个文件应包含 frontmatter（YAML 元数据）：

```markdown
---
title: JavaScript 基础教程
tags: [JavaScript, 编程, 前端]
date: 2025-01-15
excerpt: 这是一篇关于 JavaScript 基础的教程
---

# JavaScript 基础教程

这篇文章介绍 JavaScript 的基本概念。

我们还会学习 [[React 教程]] 中的相关内容。

使用标签：#JavaScript #前端开发
```

**支持的 frontmatter 字段：**
- `title`: 文章标题（必填，如果没有会使用文件名）
- `tags`: 标签数组，如 `[技术, 编程]`
- `date`: 发布日期
- `excerpt`: 文章摘要
- `slug`: 自定义 URL（可选）

**支持的 Markdown 特性：**
- ✅ 双向链接：`[[文章名]]` 或 `[[文章名|显示文本]]`
- ✅ 标签：`#标签名`
- ✅ Callouts：`> [!note] 提示`
- ✅ Mermaid 图表
- ✅ 高亮：`==重点内容==`
- ✅ 所有标准 Markdown 语法

---

## ⚙️ 配置 GitHub Actions

### 1. 在 GitHub 仓库设置 Secrets

访问 `https://github.com/你的用户名/你的仓库/settings/secrets/actions`

添加以下 Secrets：

#### 必需的 Secrets：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `DATABASE_URL` | Supabase 数据库连接字符串 | Supabase Dashboard → Settings → Database → Connection string (Transaction pooling) |
| `VERCEL_TOKEN` | Vercel 部署 Token | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel 组织 ID | `vercel` 命令后从 `.vercel/project.json` 获取 |
| `VERCEL_PROJECT_ID` | Vercel 项目 ID | `vercel` 命令后从 `.vercel/project.json` 获取 |
| `DEFAULT_AUTHOR_ID` | 默认作者 ID | 您的 Supabase 用户 ID（登录后台查看） |

#### DATABASE_URL 格式示例：
```
postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:6543/postgres
```

### 2. 获取 Vercel 配置

在本地运行一次 Vercel 命令：

```bash
cd AstroSupabase
npx vercel

# 会生成 .vercel/project.json 文件
cat .vercel/project.json
```

复制其中的 `orgId` 和 `projectId` 到 GitHub Secrets。

---

## 🔄 使用方式

### 方式 A：自动部署（推荐）

1. 添加或修改 `content/` 目录中的 Markdown 文件
2. 提交到 Git：
   ```bash
   git add content/
   git commit -m "添加新文章"
   git push
   ```
3. GitHub Actions 自动触发：
   - ✅ 导入文章到 Supabase
   - ✅ 构建项目
   - ✅ 部署到 Vercel
4. 几分钟后，新文章自动上线！

### 方式 B：手动导入

如果只想导入文章，不部署：

```bash
npm run import:git
```

### 方式 C：一键导入 + 部署

```bash
npm run deploy
```

---

## 📊 导入规则

### 1. 重复文章处理

- **策略**：更新覆盖
- 如果数据库中已存在相同 slug 的文章，会更新内容
- 保留原文章 ID，所有链接关系不变

### 2. 标签处理

- 从 frontmatter 的 `tags` 字段提取
- 从正文中的 `#标签` 提取
- 自动去重
- 每次导入会删除旧标签，插入新标签

### 3. 链接关系处理

- 自动识别 `[[双向链接]]`
- 根据链接标题匹配数据库中的文章
- 如果链接目标不存在，会在日志中警告

### 4. 默认值

- **默认状态**：`published`（已发布）
- **默认作者**：环境变量 `DEFAULT_AUTHOR_ID`
- **发布日期**：frontmatter 的 `date` 或当前时间

---

## 🔍 查看导入结果

### 1. GitHub Actions 日志

访问 `https://github.com/你的用户名/你的仓库/actions`

点击最新的 workflow 运行，查看详细日志：
```
✅ 成功: 15 篇
❌ 失败: 0 篇
🔗 链接关系: 12 篇文章包含链接
```

### 2. 后台管理系统

访问 `/dashboard/article` 查看所有导入的文章：
- ✅ 可以编辑标题、内容、标签
- ✅ 可以查看链接关系
- ✅ 可以修改发布状态
- ✅ 所有修改立即生效

### 3. 前台网站

- 访问 `/articles/[slug]` 查看文章
- 双向链接可以点击跳转
- 标签可以点击查看相关文章
- Graph 图谱显示文章关系

---

## ❓ 常见问题

### Q1: 导入后能在后台修改吗？

**答：完全可以！**
- 导入的文章和后台创建的文章完全一样
- 可以在 `/dashboard/article/[id]` 编辑
- 修改后立即生效，不影响原始文件

### Q2: 本地文件和数据库如何同步？

**答：单向同步。**
- Git 中的 `content/` 是源
- 每次 push 会自动导入并覆盖数据库
- 如果在后台修改了文章，下次 push 会被覆盖
- 建议：选择一个作为主要编辑位置

### Q3: 可以部分导入吗？

**答：可以。**
- 只导入 `content/` 目录中的文件
- 可以通过子目录组织（都会被递归扫描）
- 不在 `content/` 目录中的文件不会被导入

### Q4: 链接目标不存在怎么办？

**答：会记录警告，但不影响导入。**
- 导入日志会显示：`⚠️ 链接目标不存在: 文章名`
- 该链接不会建立数据库关系
- 前台显示时链接仍然存在，只是点击后 404

### Q5: 如何回滚导入？

**答：在后台手动删除或编辑。**
- 访问 `/dashboard/article`
- 找到要删除的文章
- 点击删除（软删除，可恢复）

---

## 🔧 高级配置

### 自定义导入脚本

编辑 `scripts/import-from-git.ts`：

```typescript
const config: ImportConfig = {
  sourceDir: path.join(process.cwd(), 'content'),  // 修改源目录
  defaultAuthorId: process.env.DEFAULT_AUTHOR_ID || 'system',
  defaultStatus: 'published',  // 改为 'draft' 则导入为草稿
  duplicateStrategy: 'update',  // 改为 'skip' 则跳过重复
  importLinks: true,  // false 则不导入链接关系
  importTags: true,   // false 则不导入标签
};
```

### 手动触发 GitHub Actions

访问 `https://github.com/你的用户名/你的仓库/actions/workflows/deploy.yml`

点击 `Run workflow` 按钮手动触发。

---

## 📝 示例文件

参考 `content/articles/example.md` 查看完整示例。

---

## 🎉 完成

现在您可以：
1. 在 `content/` 目录添加 Markdown 文件
2. `git push` 提交
3. 等待自动部署完成
4. 在网站上查看新文章！

**享受自动化的乐趣吧！** 🚀

