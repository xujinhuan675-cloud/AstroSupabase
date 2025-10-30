# ⚡ 快速修复性能问题

## 🎯 目标

将文章页面加载时间从 **3.5秒** 降低到 **< 200ms**

---

## 📝 步骤 1: 执行数据库迁移

### 方法 A: Supabase 控制台（推荐）

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard/project/lvueuvuiavvchysfuobi/sql)

2. 点击左侧 **SQL Editor**

3. 创建新查询，粘贴以下 SQL：

```sql
-- 添加 HTML 缓存字段和阅读时间字段
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS reading_time TEXT;

-- 添加注释
COMMENT ON COLUMN articles.html_content IS '缓存的 HTML 内容，避免每次都处理 Markdown';
COMMENT ON COLUMN articles.reading_time IS '缓存的阅读时间';
```

4. 点击 **Run** 执行

5. 验证成功：
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'articles' 
AND column_name IN ('html_content', 'reading_time');
```

### 方法 B: 命令行（如果上面的方法有问题）

```bash
# 使用 psql 连接到数据库
psql "你的DATABASE_URL"

# 粘贴并执行 SQL
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS reading_time TEXT;

# 退出
\q
```

---

## 📝 步骤 2: 重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）

# 重新启动
npm run dev
```

---

## 📝 步骤 3: 测试性能

1. 访问任意文章页面，例如：
   - http://localhost:4321/articles/2

2. 观察终端日志：

**首次访问**（缓存未命中）：
```
19:44:15 [200] /articles/2 2000ms  ← 仍需处理 Markdown
```

**第二次访问**（缓存命中）：
```
19:44:20 [200] /articles/2  150ms  ← 极快！🚀
```

---

## 📝 步骤 4: 预热缓存（可选）

为所有文章生成缓存，避免用户首次访问时等待：

```bash
# 创建预热脚本
tsx scripts/warm-cache.ts
```

**脚本内容**（如果还没创建）：

```typescript
// scripts/warm-cache.ts
import { db } from '../src/db/client';
import { articles } from '../src/db/schema';
import { processMarkdown } from '../src/lib/markdown-processor';
import { eq } from 'drizzle-orm';

async function warmCache() {
  const allArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'));

  console.log(`Found ${allArticles.length} articles to process`);

  for (const article of allArticles) {
    if (!article.htmlContent) {
      console.log(`Processing: ${article.title}`);
      
      const allSlugs = await db
        .select({ slug: articles.slug })
        .from(articles)
        .where(eq(articles.status, 'published'))
        .then(results => new Set(results.map(r => r.slug)));

      const processed = await processMarkdown(
        article.content,
        {},
        async (permalink: string) => allSlugs.has(permalink)
      );
      
      await db.update(articles)
        .set({
          htmlContent: processed.html,
          readingTime: processed.readingTime,
        })
        .where(eq(articles.id, article.id));
      
      console.log(`✓ Cached: ${article.title}`);
    } else {
      console.log(`⊙ Skipped (already cached): ${article.title}`);
    }
  }
  
  console.log('\n✅ Cache warming complete!');
  process.exit(0);
}

warmCache().catch(console.error);
```

---

## ✅ 验证结果

### 性能对比

| 访问类型 | 优化前 | 优化后 | 提升 |
|---------|--------|--------|------|
| 首次访问 | 3.5秒 | ~2秒 | 43% |
| 缓存命中 | 3.5秒 | **< 200ms** | **95%** 🎉 |

### 预期效果

- ✅ 页面秒开（缓存命中）
- ✅ 丝滑流畅的用户体验
- ✅ 减少服务器负载
- ✅ 降低数据库查询压力

---

## 🔧 故障排除

### 问题 1: SQL 执行失败

**错误**: `column "html_content" already exists`

**解决**: 字段已存在，跳过此步骤即可

### 问题 2: 缓存未生效

**检查**:
```sql
-- 查看是否有缓存数据
SELECT id, title, 
       CASE WHEN html_content IS NULL THEN '未缓存' ELSE '已缓存' END as cache_status
FROM articles
WHERE status = 'published'
LIMIT 10;
```

**清除缓存重新生成**:
```sql
UPDATE articles SET html_content = NULL, reading_time = NULL;
```

### 问题 3: 页面仍然很慢

**检查**:
1. 确认数据库字段已添加
2. 确认代码已更新（git pull）
3. 确认服务器已重启
4. 清除浏览器缓存并刷新

---

## 📊 监控性能

在 `src/pages/articles/[id].astro` 添加日志：

```typescript
const startTime = Date.now();

// ... 你的代码 ...

if (article.htmlContent && article.readingTime) {
  console.log(`✓ Cache HIT for article ${articleId} (${Date.now() - startTime}ms)`);
} else {
  console.log(`✗ Cache MISS for article ${articleId} (${Date.now() - startTime}ms)`);
}
```

---

## 🎉 完成！

现在你的文章页面应该已经飞快了！

**下一步建议**:
1. 运行预热脚本为所有文章生成缓存
2. 添加性能监控
3. 考虑添加 CDN 加速静态资源

---

**需要帮助？** 查看完整文档：`PERFORMANCE_OPTIMIZATION.md`

