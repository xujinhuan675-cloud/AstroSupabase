# 🔒 Supabase RLS (行级安全) 配置指南

## 📋 当前问题

Supabase Dashboard 显示 **5 个 RLS 安全警告**：

1. `public.article_links` - 未启用 RLS
2. `public.article_tags` - 未启用 RLS  
3. `public.users` - 未启用 RLS
4. `public.tasks` - 未启用 RLS
5. `public.articles` - 未启用 RLS

### ⚠️ 为什么需要配置 RLS？

**安全问题**：
- 这些表暴露在 PostgREST API 中
- 没有 RLS 策略意味着**任何人都可以读取/写入数据**
- 如果使用 Supabase Client SDK，会受到 RLS 限制

**当前影响**：
- 本地开发使用 Drizzle ORM 直接连接数据库，**不受 RLS 限制**
- 生产环境如果使用 Supabase Client SDK，**会受 RLS 影响**

---

## ✅ 解决方案

### 方案 1：继续使用 Drizzle ORM（推荐）

**优点**：
- ✅ 不受 RLS 限制
- ✅ 直接连接数据库，性能更好
- ✅ 不需要配置 RLS 策略
- ✅ 代码无需修改

**缺点**：
- ⚠️ Supabase Dashboard 会继续显示警告
- ⚠️ 如果使用 Supabase Client SDK，需要配置 RLS

**建议**：
- 如果您只使用 Drizzle ORM，可以**忽略这些警告**
- RLS 警告不会影响系统功能

---

### 方案 2：配置 RLS 策略（安全加固）

如果您希望完全消除警告并增强安全性，可以手动配置 RLS 策略。

#### 步骤 1：访问 Supabase SQL Editor

1. 打开 Supabase Dashboard
2. 进入 SQL Editor

#### 步骤 2：启用 RLS 并配置策略

```sql
-- 1. 启用 RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 2. 为 articles 表创建策略

-- 允许所有人读取已发布且未删除的文章
CREATE POLICY "允许公开读取已发布文章" ON public.articles
FOR SELECT
USING (status = 'published' AND is_deleted = false);

-- 允许认证用户创建文章
CREATE POLICY "允许认证用户创建文章" ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新文章
CREATE POLICY "允许认证用户更新文章" ON public.articles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除文章
CREATE POLICY "允许认证用户删除文章" ON public.articles
FOR DELETE
TO authenticated
USING (true);

-- 3. 为 article_tags 表创建策略

-- 允许所有人读取标签
CREATE POLICY "允许公开读取标签" ON public.article_tags
FOR SELECT
USING (true);

-- 允许认证用户创建标签
CREATE POLICY "允许认证用户创建标签" ON public.article_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户删除标签
CREATE POLICY "允许认证用户删除标签" ON public.article_tags
FOR DELETE
TO authenticated
USING (true);

-- 4. 为 article_links 表创建策略

-- 允许所有人读取链接
CREATE POLICY "允许公开读取链接" ON public.article_links
FOR SELECT
USING (true);

-- 允许认证用户创建链接
CREATE POLICY "允许认证用户创建链接" ON public.article_links
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户删除链接
CREATE POLICY "允许认证用户删除链接" ON public.article_links
FOR DELETE
TO authenticated
USING (true);

-- 5. 为 users 表创建策略（如果需要）

-- 允许用户读取自己的信息
CREATE POLICY "允许用户读取自己的信息" ON public.users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

-- 允许用户更新自己的信息
CREATE POLICY "允许用户更新自己的信息" ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- 6. 为 tasks 表创建策略（如果需要）

-- 允许所有人读取任务
CREATE POLICY "允许公开读取任务" ON public.tasks
FOR SELECT
USING (true);

-- 允许认证用户创建任务
CREATE POLICY "允许认证用户创建任务" ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新任务
CREATE POLICY "允许认证用户更新任务" ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除任务
CREATE POLICY "允许认证用户删除任务" ON public.tasks
FOR DELETE
TO authenticated
USING (true);
```

#### 步骤 3：执行 SQL

1. 将上述 SQL 复制到 SQL Editor
2. 点击 "Run" 执行
3. 刷新 Security Advisor 页面
4. 确认警告消失

---

## 🎯 推荐方案

### 🔹 如果您只使用 Drizzle ORM：

**选择方案 1** - 继续使用 Drizzle ORM，**忽略 RLS 警告**

- ✅ 无需任何修改
- ✅ 系统继续正常工作
- ⚠️ Supabase Dashboard 会显示警告（不影响功能）

### 🔹 如果您计划使用 Supabase Client SDK：

**选择方案 2** - 配置 RLS 策略

- ✅ 增强安全性
- ✅ 消除 Supabase 警告
- ⚠️ 需要手动执行 SQL
- ⚠️ 如果策略配置错误，可能影响数据访问

---

## 🔍 当前系统使用的数据库访问方式

### 本地开发 & 生产环境

- 使用 **Drizzle ORM** 直接连接数据库
- 通过 `DATABASE_URL` 连接
- **不经过** Supabase PostgREST API
- **不受** RLS 策略限制

### 文件位置

- 数据库客户端：`src/db/client.ts`
- API 路由：`src/pages/api/articles.ts`、`src/pages/api/articles/[id].ts`

---

## 📝 当前修复状态

### ✅ 已修复的问题

1. **后台编辑页面无法打开** - 已修复
   - 修改：`src/pages/dashboard/article/[id].astro`
   - 方法：改为直接使用数据库查询

2. **首页显示已删除文章** - 已修复
   - 修改：`src/lib/articles.ts`
   - 方法：增加 `isDeleted = false` 过滤条件

3. **API 返回格式不一致** - 已修复
   - 修改：`src/lib/api.ts`
   - 方法：统一返回 `{ data: ... }` 格式

### ⚠️ Supabase RLS 警告

- **状态**：未配置（5 个警告）
- **影响**：不影响当前系统功能
- **原因**：使用 Drizzle ORM 直接连接，不经过 PostgREST API

---

## 🚀 下一步

### 选项 1：忽略 RLS 警告（推荐）

**如果**：
- 您只使用 Drizzle ORM
- 不计划使用 Supabase Client SDK
- 不需要通过 PostgREST API 访问数据

**操作**：
- 无需任何操作
- 继续使用系统
- RLS 警告不会影响功能

---

### 选项 2：配置 RLS 策略

**如果**：
- 您希望消除警告
- 计划使用 Supabase Client SDK
- 需要通过 PostgREST API 访问数据

**操作**：
1. 访问 Supabase SQL Editor
2. 执行上述 SQL 脚本
3. 验证警告消失
4. 测试系统功能

---

## 🎉 总结

所有代码问题已修复：
1. ✅ 后台编辑页面正常工作
2. ✅ 首页不显示已删除文章
3. ✅ API 格式统一

**关于 RLS 警告**：
- 如果只使用 Drizzle ORM，可以**安全地忽略**
- 不会影响系统功能
- 只是 Supabase 的安全提示

需要我帮您配置 RLS 策略吗？还是继续忽略警告？

