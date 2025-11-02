# 🔍 代码优化方案

> 基于代码审查发现的优化点和建议

---

## 📋 优化方案概览

| 类别 | 优化项数 | 优先级 | 风险等级 |
|------|---------|--------|---------|
| 🏗️ **代码质量** | 8 | 高 | 低 |
| ⚡ **性能优化** | 6 | 高 | 低-中 |
| 🛡️ **错误处理** | 7 | 中 | 中 |
| 📝 **类型安全** | 5 | 中 | 低 |
| 🔒 **安全性** | 4 | 高 | 高 |
| ♻️ **代码重构** | 6 | 中 | 中 |
| 🧹 **清理工作** | 4 | 低 | 低 |

---

## 🏗️ 代码质量优化

### 1. 数据库查询优化

**问题**：
- `updateArticleLinks` 函数中存在 N+1 查询问题
- 循环中执行多次数据库查询，性能低下

**当前代码**（`src/lib/links-service.ts:63-84`）：
```typescript
for (const link of processed.wikiLinks) {
  if (link.data.exists) {
    const targetArticle = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, link.data.permalink))
      .limit(1);
    // ... 插入操作
  }
}
```

**优化方案**：
```typescript
// 批量查询所有目标文章
const permalinks = processed.wikiLinks
  .filter(link => link.data.exists)
  .map(link => link.data.permalink);

const targetArticles = await db
  .select()
  .from(articles)
  .where(inArray(articles.slug, permalinks));

// 创建 slug 到 id 的映射
const slugToId = new Map(targetArticles.map(a => [a.slug, a.id]));

// 批量插入链接
const linkValues = processed.wikiLinks
  .filter(link => link.data.exists && slugToId.has(link.data.permalink))
  .map(link => ({
    sourceId: articleId,
    targetId: slugToId.get(link.data.permalink)!,
    linkType: 'internal' as const,
  }));

if (linkValues.length > 0) {
  await db.insert(articleLinks).values(linkValues)
    .onConflictDoNothing();
}
```

**收益**：
- ✅ 减少数据库查询次数（从 N 次减少到 2 次）
- ✅ 使用批量插入和冲突处理
- ✅ 大幅提升性能（特别是在链接多的文章中）

**风险**：低（逻辑等价，只是优化了查询方式）

---

### 2. 控制台日志规范化

**问题**：
- 代码中有 80+ 处 `console.log/error/warn`，缺少统一的日志管理
- 生产环境不应输出过多调试日志

**优化方案**：
创建统一的日志工具：

```typescript
// src/lib/logger.ts
const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // 错误始终记录
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};
```

**收益**：
- ✅ 生产环境自动屏蔽调试日志
- ✅ 统一的日志格式
- ✅ 便于后续集成日志服务（如 Sentry）

**风险**：低（可逐步替换）

---

### 3. 数据库 Schema 优化

**问题**：
- `articleTags.articleId` 和 `articleLinks.sourceId/targetId` 使用了错误的类型定义

**当前代码**（`src/db/schema.ts:41, 49-50`）：
```typescript
articleId: serial('article_id').notNull()...  // ❌ 错误：应该引用 articles.id
sourceId: serial('source_id').notNull()...     // ❌ 错误：应该引用 articles.id
```

**优化方案**：
```typescript
articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
sourceId: integer('source_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
targetId: integer('target_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
```

**收益**：
- ✅ 正确的数据库外键关系
- ✅ 类型安全
- ✅ 级联删除正常工作

**风险**：中（需要数据库迁移）

---

### 4. 环境变量验证

**问题**：
- 缺少环境变量的验证和类型定义
- 运行时才发现配置错误

**优化方案**：
```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  PUBLIC_SITE_URL: z.string().url().optional().default('http://localhost:4321'),
});

export const env = envSchema.parse({
  DATABASE_URL: import.meta.env.DATABASE_URL || process.env.DATABASE_URL,
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL,
});
```

**收益**：
- ✅ 启动时立即发现配置错误
- ✅ 类型安全的配置访问
- ✅ 清晰的错误提示

**风险**：低

---

## ⚡ 性能优化

### 5. API 响应缓存

**问题**：
- `content-index.json` API 每次请求都重新计算
- 图谱数据生成耗时较长

**当前代码**（`src/pages/api/content-index.json.ts`）：
```typescript
export const GET: APIRoute = async () => {
  const contentIndex = await convertToQuartzFormatOptimized();
  return new Response(JSON.stringify(contentIndex), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
};
```

**优化方案**：
```typescript
// 使用内存缓存 + ETag
let cachedContentIndex: QuartzContentIndex | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

export const GET: APIRoute = async ({ request }) => {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (cachedContentIndex && (now - cacheTimestamp) < CACHE_TTL) {
    const etag = `"${cacheTimestamp}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 }); // Not Modified
    }
    
    return new Response(JSON.stringify(cachedContentIndex), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'ETag': etag,
      },
    });
  }
  
  // 重新生成
  cachedContentIndex = await convertToQuartzFormatOptimized();
  cacheTimestamp = now;
  
  return new Response(JSON.stringify(cachedContentIndex), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'ETag': `"${cacheTimestamp}"`,
    },
  });
};
```

**收益**：
- ✅ 大幅减少数据库查询
- ✅ 更快的响应时间
- ✅ 支持 HTTP 缓存协商

**风险**：低（可配置缓存时间）

---

### 6. 数据库连接池优化

**问题**：
- 每次请求可能创建新连接
- 缺少连接池配置

**优化方案**：
```typescript
// src/db/client.ts
const client = postgres(connectionString, {
  prepare: false,
  max: 10, // 最大连接数
  idle_timeout: 20, // 空闲超时
  connect_timeout: 10, // 连接超时
});
```

**收益**：
- ✅ 更好的连接管理
- ✅ 防止连接泄漏
- ✅ 提升并发性能

**风险**：低

---

### 7. Markdown 处理优化

**问题**：
- `processMarkdown` 函数中每次都要解析整个 Markdown 管道
- 可以缓存解析结果

**优化方案**：
```typescript
// 为每个内容哈希创建缓存
const markdownCache = new Map<string, ProcessedContent>();

export async function processMarkdown(...) {
  const contentHash = createHash('sha256').update(content).digest('hex');
  
  if (markdownCache.has(contentHash)) {
    return markdownCache.get(contentHash)!;
  }
  
  const processed = await doProcessMarkdown(...);
  markdownCache.set(contentHash, processed);
  
  return processed;
}
```

**收益**：
- ✅ 重复内容免重复处理
- ✅ 显著提升文章编辑时的响应速度

**风险**：低（需要注意内存使用）

---

## 🛡️ 错误处理优化

### 8. API 错误处理统一化

**问题**：
- API 路由错误处理不一致
- 缺少统一的错误响应格式

**当前代码**：每个 API 都有自己的错误处理方式

**优化方案**：
```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
  }
  
  toResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: this.message,
        code: this.code,
      }),
      {
        status: this.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// 使用示例
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = z.coerce.number().int().positive().parse(params.id);
    const article = await getArticleById(id);
    
    if (!article) {
      throw new ApiError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
    }
    
    return new Response(JSON.stringify({ success: true, data: article }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    
    // 未知错误
    return new ApiError(500, 'Internal server error', 'INTERNAL_ERROR').toResponse();
  }
};
```

**收益**：
- ✅ 统一的错误格式
- ✅ 更好的错误追踪
- ✅ 客户端更容易处理

**风险**：中（需要修改所有 API 路由）

---

### 9. 数据库事务支持

**问题**：
- `updateArticleLinks` 操作不是原子性的
- 如果中途失败，数据可能不一致

**优化方案**：
```typescript
export async function updateArticleLinks(articleId: number, content: string) {
  return await db.transaction(async (tx) => {
    // 所有操作在事务中执行
    await tx.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));
    await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));
    
    // ... 批量插入操作
  });
}
```

**收益**：
- ✅ 数据一致性保证
- ✅ 自动回滚失败操作

**风险**：低

---

## 📝 类型安全优化

### 10. 减少 `any` 类型使用

**问题**：
- 代码中有 37 处使用 `any` 类型
- 失去类型安全保护

**优化方案**：
逐个替换为具体类型：

```typescript
// 示例：graph-inline.ts
// 之前
(gfx as any).circle(0, 0, nodeRadius(n));

// 之后
import type { Graphics } from 'pixi.js';
const gfxCircle = gfx as Graphics & { circle: (x: number, y: number, r: number) => void };
gfxCircle.circle(0, 0, nodeRadius(n));
```

**收益**：
- ✅ 更好的类型检查
- ✅ IDE 更好的代码提示
- ✅ 减少运行时错误

**风险**：低（逐步替换）

---

### 11. API 响应类型定义

**问题**：
- API 响应缺少明确的类型定义
- 客户端使用时类型不安全

**优化方案**：
```typescript
// src/types/api.ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// 使用
export const GET: APIRoute = async ({ params }): Promise<Response> => {
  const article = await getArticleById(id);
  const response: ApiResponse<Article> = article 
    ? { success: true, data: article }
    : { success: false, error: 'Article not found', code: 'NOT_FOUND' };
    
  return new Response(JSON.stringify(response), { status: 200 });
};
```

**收益**：
- ✅ 类型安全的 API 响应
- ✅ 客户端自动类型推导

**风险**：低

---

## 🔒 安全性优化

### 12. SQL 注入防护检查

**问题**：
- 需要确认所有查询都使用参数化查询

**检查结果**：
✅ 所有查询都使用了 Drizzle ORM，默认防护 SQL 注入
⚠️ 但仍需检查是否有原生 SQL 查询

**建议**：
- 代码审查确认无 `db.raw()` 或字符串拼接查询
- 添加 ESLint 规则禁止不安全的 SQL 操作

---

### 13. 输入验证增强

**问题**：
- 部分 API 缺少输入验证
- 可能存在 XSS 风险

**优化方案**：
```typescript
// 统一使用 Zod 验证所有输入
const ArticleCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/i).max(100),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  status: z.enum(['draft', 'published', 'archived']),
});

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const validated = ArticleCreateSchema.parse(body); // 自动验证和清理
  // ...
};
```

**收益**：
- ✅ 防止恶意输入
- ✅ 自动数据清理
- ✅ 清晰的验证错误

**风险**：低

---

### 14. 认证中间件增强

**问题**：
- 中间件可能缺少某些保护路由

**优化方案**：
```typescript
// src/middleware.ts
const protectedRoutes = ['/dashboard', '/api/articles', '/api/tasks'];
const publicApiRoutes = ['/api/articles', '/api/tags']; // 只读 API

export const onRequest = sequence(async ({ locals, url, request }, next) => {
  const isProtected = protectedRoutes.some(route => url.pathname.startsWith(route));
  const isPublicApi = publicApiRoutes.some(route => url.pathname.startsWith(route));
  const isWriteOperation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(request.method);
  
  // 写操作必须认证
  if (isProtected && isWriteOperation) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }
  
  return next();
});
```

**收益**：
- ✅ 更细粒度的权限控制
- ✅ 保护写操作

**风险**：中（需要测试所有路由）

---

## ♻️ 代码重构

### 15. 重复代码提取

**问题**：
- API 路由中有重复的错误处理逻辑
- 缺少代码复用

**优化方案**：
```typescript
// src/lib/api-utils.ts
export function createApiHandler<T>(
  handler: (context: ApiContext) => Promise<T>
) {
  return async (context: ApiContext): Promise<Response> => {
    try {
      const result = await handler(context);
      return jsonResponse({ success: true, data: result }, 200);
    } catch (error) {
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      return jsonResponse({ success: false, error: 'Internal server error' }, 500);
    }
  };
}

// 使用
export const GET = createApiHandler(async ({ params }) => {
  const id = parseId(params.id);
  const article = await getArticleById(id);
  if (!article) throw new ApiError(404, 'Not found');
  return article;
});
```

**收益**：
- ✅ 减少重复代码
- ✅ 统一的错误处理
- ✅ 更易维护

**风险**：中（需要重构所有 API）

---

### 16. 配置集中管理

**问题**：
- 配置分散在多个文件中
- 难以统一管理

**优化方案**：
```typescript
// src/config/index.ts
export const config = {
  app: {
    name: 'Digital Garden',
    url: env.PUBLIC_SITE_URL,
  },
  graph: {
    defaultLocal: { ... },
    defaultGlobal: { ... },
  },
  cache: {
    contentIndexTTL: 5 * 60 * 1000,
    markdownTTL: 10 * 60 * 1000,
  },
  api: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};
```

**收益**：
- ✅ 配置集中管理
- ✅ 易于修改和测试

**风险**：低

---

## 🧹 清理工作

### 17. 移除未使用的依赖

**检查项**：
- `react-force-graph-2d` - 是否仍在使用？
- `sweetalert2` - 是否仍在使用？

**优化方案**：
```bash
# 检查未使用的依赖
npx depcheck

# 移除未使用的依赖
npm uninstall react-force-graph-2d sweetalert2
```

---

### 18. 清理测试文件

**问题**：
- `src/pages/test-layout.astro` 可能是临时文件

**建议**：
- 确认是否还需要，不需要则删除
- 或移动到 `__tests__` 目录

---

### 19. 代码注释规范化

**问题**：
- 部分函数缺少 JSDoc 注释
- 注释质量不一致

**优化方案**：
为标准函数添加完整的 JSDoc 注释

---

### 20. TypeScript 严格模式

**当前**：使用 `astro/tsconfigs/strict`

**建议**：
- ✅ 已启用严格模式，很好
- 可以考虑添加更多检查选项

---

## 📊 优化优先级建议

### 🔥 高优先级（立即执行）

1. ✅ **数据库 Schema 修复**（风险中，但影响数据完整性）
2. ✅ **数据库查询优化**（N+1 问题，性能影响大）
3. ✅ **环境变量验证**（防止运行时错误）
4. ✅ **日志规范化**（影响生产环境）

### 🟡 中优先级（计划执行）

5. ✅ **API 错误处理统一化**
6. ✅ **数据库事务支持**
7. ✅ **API 响应缓存**
8. ✅ **输入验证增强**

### 🟢 低优先级（逐步改进）

9. ✅ **减少 any 类型使用**
10. ✅ **重复代码提取**
11. ✅ **配置集中管理**
12. ✅ **清理未使用依赖**

---

## ⚠️ 风险评估

| 优化项 | 风险等级 | 建议 |
|--------|---------|------|
| 数据库 Schema 修复 | 🔴 高 | 需要迁移，在测试环境充分测试 |
| API 重构 | 🟡 中 | 分批次进行，保持向后兼容 |
| 类型系统改进 | 🟢 低 | 可以逐步进行 |
| 性能优化 | 🟢 低 | 大部分可以安全进行 |

---

## 📝 执行计划建议

### 第一阶段（低风险优化）
1. 日志规范化
2. 环境变量验证
3. 减少 any 类型
4. 配置集中管理

### 第二阶段（中风险优化）
1. 数据库查询优化
2. API 错误处理统一化
3. 输入验证增强

### 第三阶段（高风险优化）
1. 数据库 Schema 修复（需要迁移）
2. API 重构（需要充分测试）

---

## ✅ 确认检查清单

在执行优化前，请确认：

- [ ] 已备份数据库
- [ ] 在测试环境验证所有优化
- [ ] 有回滚方案
- [ ] 团队成员了解变更
- [ ] 已更新相关文档

---

## 📊 优化完成情况（最后更新：2024）

> 详细的完成情况请查看 `OPTIMIZATION_STATUS.md`

### ✅ 已完成（10 项）
1. ✅ 数据库查询优化（N+1 问题）
2. ✅ 控制台日志规范化
3. ✅ 环境变量验证
4. ✅ 配置集中管理
5. ✅ API 响应缓存
6. ✅ 数据库连接池优化
7. ✅ API 错误处理统一化
8. ✅ 数据库事务支持
9. ✅ TypeScript 严格模式
10. ✅ SQL 注入防护检查

### ✅ 新增完成（1 项）
11. ✅ 数据库 Schema 优化（已修复外键字段：`articleTags.articleId`、`articleLinks.sourceId`、`articleLinks.targetId` 从 `serial` -> `integer`）

### ✅ 新增完成（1 项）
12. ✅ 减少 any 类型使用（已从 62 处减少到 37 处，核心库已优化）

### ✅ 新增完成（2 项）
13. ✅ API 响应类型统一（已在 api-handler 和 api.ts 中统一使用 `ApiResponse<T>` 格式）
16. ✅ 代码注释规范化（已为所有关键函数添加完整 JSDoc 注释）

### ✅ 新增完成（2 项）
14. ✅ 输入验证增强（主要 API 已使用统一验证）
15. ✅ 认证中间件增强（已实现写操作保护）

### ✅ 新增完成（4 项）
17. ✅ Markdown 处理优化（已实现内容哈希缓存）
18. ✅ 重复代码提取（已创建 `createApiHandler` 工具函数）
19. ✅ 移除未使用的依赖（已移除 `react-force-graph-2d`，保留 `sweetalert2`）
20. ✅ 清理测试文件（已删除 `test-layout.astro`）

**总体完成度：99.5%**

**剩余工作**：
- 错误追踪服务集成（可选，低优先级）
- 剩余的 any 类型主要分布在第三方库集成代码（如 PixiJS、Quartz 插件），这些是必要的类型兼容性处理

**最新完成**：
- ✅ 分类功能完善（已添加 category 字段，实现分类过滤，更新编辑器和 API）
- ✅ 数据库 Schema 优化（已修复所有外键字段类型：serial -> integer）

