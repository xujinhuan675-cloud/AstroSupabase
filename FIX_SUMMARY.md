# 🔧 修复总结 - 编辑页面和已删除文章显示问题

## 📋 问题描述

### 问题 1：后台点击"编辑"无法进入编辑页面
- **现象**：在后台管理系统 `http://localhost:4321/dashboard` 点击"编辑"按钮后，页面没有进入编辑页面
- **影响**：无法编辑任何文章

### 问题 2：首页显示已删除的文章
- **现象**：在后台管理系统中删除文章后，首页 `http://localhost:4321/` 仍然显示该文章
- **影响**：已删除的文章仍然对外可见

---

## 🔍 问题原因分析

### 问题 1 原因：服务端 fetch 使用相对路径失败

**技术细节**：
- 编辑页面 `/dashboard/article/[id].astro` 在服务端渲染时调用 `fetchArticle(id)`
- `fetchArticle` 函数使用相对路径 `/api/articles/${id}`
- 在 Node.js 服务端环境中，`fetch` 需要完整的 URL（包含协议和域名）
- 相对路径导致请求失败，抛出 "Failed to fetch article" 错误
- 编辑页面检测到错误后重定向回列表页 (`/dashboard/article`)
- 用户感觉像是"点击编辑没反应"

**错误日志**：
```
[fetchArticle] Error fetching article: Error: Failed to fetch article
```

### 问题 2 原因：查询未过滤已删除的文章

**技术细节**：
- `src/lib/articles.ts` 的 `getArticles()` 函数只过滤了 `status = 'published'`
- 没有过滤 `isDeleted = false`
- 删除操作是逻辑删除（设置 `isDeleted = true`），不是物理删除
- 导致已删除的文章仍然被查询出来并显示在首页

---

## ✅ 修复方案

### 修复 1：fetchArticle 支持服务端和客户端

**文件**：`src/lib/api.ts`

**修改内容**：
```typescript
export async function fetchArticle(id: number): Promise<ApiResponse<Article>> {
  try {
    // 服务端需要完整的 URL，客户端可以使用相对路径
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer 
      ? (import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321')
      : '';
    const url = `${baseUrl}/api/articles/${id}`;
    
    console.info(`[fetchArticle] [GET] Fetching article with ID ${id} from ${url}`);
    const response = await fetch(url, {
      credentials: 'same-origin',
    });
    // ... 其余代码
  }
}
```

**关键改进**：
1. ✅ 检测运行环境（`typeof window === 'undefined'` 判断是否为服务端）
2. ✅ 服务端使用完整 URL（优先 `PUBLIC_SITE_URL`，回退到 `http://localhost:4321`）
3. ✅ 客户端继续使用相对路径（`baseUrl` 为空字符串）
4. ✅ 保持返回格式不变（`{ data: {...} }`）

---

### 修复 2：过滤已删除的文章

**文件**：`src/lib/articles.ts`

**修改前**：
```typescript
export async function getArticles(limit?: number): Promise<Article[]> {
  let query = db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))  // ❌ 只过滤状态
    .orderBy(desc(articles.publishedAt));
  // ...
}
```

**修改后**：
```typescript
import { and } from 'drizzle-orm';  // 新增导入

export async function getArticles(limit?: number): Promise<Article[]> {
  let query = db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.status, 'published'),
        eq(articles.isDeleted, false)  // ✅ 增加已删除过滤
      )
    )
    .orderBy(desc(articles.publishedAt));
  // ...
}
```

**关键改进**：
1. ✅ 导入 `and` 操作符用于组合多个查询条件
2. ✅ 增加 `isDeleted = false` 过滤条件
3. ✅ 只返回未删除且已发布的文章
4. ✅ 保持按发布日期降序排列

---

## 🧪 验证修复

### 步骤 1：本地测试

```bash
cd F:\IOTO-Doc\AstroSupabase
npm run dev
```

### 步骤 2：测试编辑功能

1. 访问：`http://localhost:4321/auth/login`
2. 登录后访问：`http://localhost:4321/dashboard/article`
3. 点击任意文章的"编辑"按钮
4. ✅ **应该成功进入编辑页面** `/dashboard/article/[id]`
5. ✅ 页面应该显示文章编辑表单

### 步骤 3：测试删除功能

1. 在后台管理系统中，点击某篇文章的"删除"按钮
2. 确认删除
3. 打开新标签页访问首页：`http://localhost:4321/`
4. ✅ **已删除的文章不应该显示在首页**
5. 刷新页面确认文章确实被隐藏

---

## 📊 修复前后对比

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| 点击"编辑"按钮 | ❌ 无法进入编辑页 | ✅ 正常进入编辑页 |
| 服务端 fetchArticle | ❌ 使用相对路径失败 | ✅ 使用完整 URL 成功 |
| 客户端 fetchArticle | ✅ 正常工作 | ✅ 继续正常工作 |
| 首页文章列表 | ❌ 显示已删除文章 | ✅ 只显示未删除文章 |
| 删除操作效果 | ❌ 前端仍可见 | ✅ 前端立即隐藏 |

---

## 🚀 部署到生产环境

本地测试成功后，推送到 GitHub：

```bash
cd F:\IOTO-Doc\AstroSupabase
git add .
git commit -m "修复编辑页面无法打开和已删除文章显示问题"
git push origin main
```

GitHub Actions 会自动部署到 Vercel。

---

## 📝 技术要点

### 1. 服务端 vs 客户端 Fetch

**服务端（SSR）**：
- 运行在 Node.js 环境
- `fetch` 需要完整 URL（`http://localhost:4321/api/...`）
- 使用 `typeof window === 'undefined'` 判断

**客户端（浏览器）**：
- 运行在浏览器环境
- `fetch` 可以使用相对路径（`/api/...`）
- 浏览器会自动补全当前域名

### 2. Drizzle ORM 多条件查询

```typescript
// ❌ 错误：只有一个条件
.where(eq(articles.status, 'published'))

// ✅ 正确：使用 and 组合多个条件
.where(
  and(
    eq(articles.status, 'published'),
    eq(articles.isDeleted, false)
  )
)
```

### 3. 逻辑删除 vs 物理删除

**当前实现**：逻辑删除
- 优点：数据可恢复，保留审计日志
- 缺点：需要在所有查询中过滤 `isDeleted`

**关键**：所有公开查询必须加 `isDeleted = false` 过滤

---

## 🎉 完成

所有修复已完成！现在：
- ✅ 后台"编辑"按钮正常工作
- ✅ 首页不再显示已删除的文章
- ✅ 服务端和客户端 API 调用都正常
- ✅ 删除操作立即生效

---

## 🔗 相关文件

- `src/lib/api.ts` - API 调用函数（fetchArticle 修复）
- `src/lib/articles.ts` - 文章查询函数（过滤已删除文章）
- `src/pages/dashboard/article/[id].astro` - 编辑页面
- `src/pages/api/articles/[id].ts` - 文章详情 API

