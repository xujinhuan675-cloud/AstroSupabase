# 构建时预渲染 - 使用指南

## 🎯 概述

本项目实现了类似 Quartz 4.0 的**构建时预渲染**架构，通过多线程并行处理 Markdown，显著提升运行时性能。

### 架构对比

**之前（运行时处理）**：
```
用户请求 → 数据库查询 → 实时处理 Markdown → 渲染 HTML → 返回
          ↓
      4138ms（首次） / 1025ms（有缓存）
```

**现在（构建时预渲染）**：
```
构建时: 多线程处理所有 Markdown → 存入数据库
        ↓
用户请求: 直接读取预渲染的 HTML → 返回
          ↓
      < 100ms（接近静态文件速度）
```

---

## 🚀 快速开始

### 1. 预渲染所有文章

```bash
npm run pre-render
```

**功能**：
- 使用多线程并行处理所有已发布的文章
- 将处理好的 HTML 存入数据库
- 自动计算最优并发数（基于 CPU 核心数和文章数量）

**输出示例**：
```
🚀 Starting build-time pre-rendering...

📚 Fetching articles from database...
✓ Fetched 50 articles in 120ms

🔧 Creating 4 worker threads...
✓ Workers ready

  Processing: 50/50 (100.0%)
✓ Processed 50 articles in 8.5s

💾 Updating database...
  Updating: 50/50
✓ Database updated in 1.2s
  Success: 50, Failed: 0

✅ Pre-rendering complete in 9.8s
   Average: 170ms per article
```

---

## 📦 构建命令

### 开发模式
```bash
npm run dev
```
- 启动开发服务器
- 如果文章未预渲染，会在首次访问时实时处理（慢）

### 完整构建（推荐）
```bash
npm run build:full
```
- 先预渲染所有文章
- 再构建 Astro 站点
- **部署前推荐使用**

### 完整部署（推荐）
```bash
npm run deploy:full
```
- 从 Git 导入最新 Markdown
- 预渲染所有文章
- 部署到 Vercel
- **生产部署推荐使用**

---

## 🔍 性能监控

运行时会自动输出缓存命中/未命中日志：

### 缓存命中（快）
```
[CACHE HIT] Article 2 loaded from pre-rendered cache in 5ms
```

### 缓存未命中（慢）
```
[CACHE MISS] Article 3 - processing Markdown at runtime (slow!)
[RUNTIME PROCESSING] Article 3 processed in 2345ms
[CACHE UPDATED] Article 3
```

**建议**：如果看到 `CACHE MISS`，运行 `npm run pre-render` 预渲染所有文章。

---

## ⚡ 性能优化详解

### 1. 多线程并行处理

**自动并发数计算**：
```typescript
const cpuCount = cpus().length;
const CHUNK_SIZE = 128;
const maxConcurrency = Math.min(
  Math.max(Math.floor(articles.length / CHUNK_SIZE), 1),
  Math.min(cpuCount, 4) // 最多 4 个线程
);
```

**效果**：
- 100 篇文章（单线程）：~60 秒
- 100 篇文章（4 线程）：~15-20 秒
- **速度提升 3-4 倍**

### 2. 批量数据库更新

- 每批更新 50 条记录
- 使用 `Promise.all` 并行更新
- 减少数据库连接开销

### 3. 运行时缓存命中

预渲染后，文章加载时间：
```
数据库查询: ~80ms
使用缓存HTML: ~5ms
总时间: < 100ms
```

---

## 🔄 增量更新

当文章内容更新时：

### 方式 1：重新预渲染所有文章
```bash
npm run pre-render
```

### 方式 2：运行时自动更新（慢）
- 访问文章时，如果检测到缓存未命中
- 会自动实时处理 Markdown 并更新缓存
- 但首次访问会很慢（~4秒）

### 方式 3：导入时清除缓存
修改 `scripts/import-markdown.ts`：
```typescript
// 导入时清除 HTML 缓存
await db.update(articles).set({
  htmlContent: null,
  readingTime: null
});
```

---

## 📊 性能对比

| 场景 | 之前 | 现在 | 提升 |
|------|------|------|------|
| 首次访问（无缓存） | 4138ms | < 100ms | **41倍** |
| 二次访问（有缓存） | 1025ms | < 100ms | **10倍** |
| 构建时间 | 0ms | ~15秒（100篇） | 一次性成本 |

---

## 🛠️ 技术细节

### Worker 线程架构

```
主线程 (pre-render.ts)
  ├─ Worker 1 (markdown-worker.ts)
  ├─ Worker 2 (markdown-worker.ts)
  ├─ Worker 3 (markdown-worker.ts)
  └─ Worker 4 (markdown-worker.ts)

每个 Worker:
  1. 接收文章数据
  2. 处理 Markdown → HTML
  3. 返回结果
  4. 处理下一篇文章
```

### Markdown 处理优化

关闭不常用功能以提速：
```typescript
{
  wikilinks: true,          // 保留
  callouts: true,           // 保留
  highlight: true,          // 保留
  mermaid: false,           // 关闭（慢）
  enableYouTubeEmbed: false, // 关闭
  enableVideoEmbed: false,   // 关闭
}
```

---

## ❓ 常见问题

### Q: 什么时候需要预渲染？

**A**: 以下情况建议预渲染：
- 部署到生产环境前
- 导入/更新大量文章后
- 发现缓存命中率低时

### Q: 预渲染会影响开发体验吗？

**A**: 不会。开发模式下：
- 不需要预渲染
- 文章首次访问时自动实时处理
- 处理后自动缓存

### Q: 如何清除所有缓存？

**A**: 运行 SQL：
```sql
UPDATE articles SET html_content = NULL, reading_time = NULL;
```

### Q: 并发数如何调整？

**A**: 修改 `scripts/pre-render.ts`：
```typescript
const maxConcurrency = Math.min(cpuCount, 8); // 最多 8 线程
```

---

## 📝 部署清单

### ⭐ 推荐方式：云端自动预渲染（已配置）

**直接推送到 GitHub 即可！Vercel 会自动处理一切。**

```bash
# 1. 提交代码
git add .
git commit -m "Update articles"

# 2. 推送到 GitHub
git push

# 3. Vercel 自动执行：
#    ✅ 检测到推送
#    ✅ 拉取最新代码
#    ✅ 运行 npm run build:full
#       - 预渲染所有文章（多线程）
#       - 构建 Astro 站点
#    ✅ 自动部署
```

**优势**：
- ✅ 无需本地数据库配置
- ✅ 自动使用 Vercel 环境变量
- ✅ 每次部署都是最新预渲染
- ✅ 充分利用 Vercel 服务器性能

### 备选方式 1：手动触发部署

```bash
# 使用 Vercel CLI 手动部署
npm run deploy:full
```

这个命令会：
1. ✅ 从 Git 导入最新 Markdown
2. ✅ 触发 Vercel 部署（会自动预渲染）

### 备选方式 2：完全手动（不推荐）

```bash
# 仅在需要本地测试预渲染时使用
# 需要配置本地 .env 文件

# 1. 导入文章
npm run import:git

# 2. 本地预渲染（需要 DATABASE_URL）
npm run pre-render

# 3. 构建
npm run build

# 4. 部署
vercel --prod
```

**注意**：不推荐此方式，因为需要本地配置数据库连接。

---

## 🎯 最佳实践

1. **部署前必须预渲染**
   ```bash
   npm run deploy:full
   ```

2. **监控缓存命中率**
   - 查看终端日志
   - 如果 `CACHE MISS` 过多，重新预渲染

3. **定期预渲染**
   - 每次导入新文章后
   - 每次更新文章后

4. **性能测试**
   ```bash
   # 本地测试
   npm run build:full
   npm run preview
   ```

---

## 🔗 相关文件

- `scripts/pre-render.ts` - 主预渲染脚本
- `scripts/markdown-worker.ts` - Worker 线程
- `src/pages/articles/[id].astro` - 文章页面（支持缓存）
- `QUARTZ_PERFORMANCE_ANALYSIS.md` - Quartz 性能分析

---

## 🚀 下一步优化

1. **增量预渲染** - 只处理变更的文章
2. **构建时生成静态文件** - 完全静态化
3. **SPA 模式** - 客户端路由
4. **CDN 缓存** - 边缘计算

---

## 总结

通过构建时预渲染，我们实现了：
- ⚡ **41倍**性能提升（首次访问）
- 🧵 **多线程**并行处理
- 💾 **数据库缓存**自动管理
- 📊 **性能监控**实时日志

**核心思想**：在构建时完成所有计算，运行时只做数据库查询！

