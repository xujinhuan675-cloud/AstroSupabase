# Astro 5.0 迁移说明

## ⚠️ 重大变更：移除 `output: 'hybrid'`

在 **Astro 5.0** 版本中，官方移除了 `output: 'hybrid'` 配置选项。

### 为什么会报错？

如果您看到以下错误：

```
! output: Did not match union.
  > Expected "static" | "server", received "hybrid"
```

这是因为 Astro 5.x **不再支持 `output: 'hybrid'`**。

---

## 🔄 迁移指南

### Astro 4.x vs Astro 5.x

| Astro 4.x | Astro 5.x | 功能 |
|-----------|-----------|------|
| `output: 'static'` | `output: 'static'` | 纯静态站点 |
| `output: 'hybrid'` | **已移除** ❌ | 混合渲染（静态 + SSR） |
| `output: 'server'` | `output: 'server'` | 默认 SSR |

### 新的混合渲染方式

Astro 5.x 提供了两种实现混合渲染的方式：

#### 方式 1：服务器优先（推荐用于本项目）

**配置：**
```typescript
// astro.config.ts
export default defineConfig({
  output: 'server',  // 默认 SSR
  adapter: vercel(),
});
```

**页面配置：**
```typescript
// src/pages/blog.astro
export const prerender = true;  // 标记为静态预渲染
```

```typescript
// src/pages/api/articles.ts
export const prerender = false;  // 默认值，使用 SSR（可省略）
```

**适用场景：**
- ✅ 项目主要是动态内容/API
- ✅ 部分公开页面需要静态化
- ✅ **这是本项目的情况**

#### 方式 2：静态优先

**配置：**
```typescript
// astro.config.ts
export default defineConfig({
  output: 'static',  // 默认静态
  adapter: vercel(),
});
```

**页面配置：**
```typescript
// src/pages/blog.astro
export const prerender = true;  // 默认值，静态预渲染（可省略）
```

```typescript
// src/pages/api/articles.ts
export const prerender = false;  // 标记为 SSR
```

**适用场景：**
- ✅ 项目主要是静态内容
- ✅ 少量 API 需要动态渲染

---

## ✅ 本项目的配置

### 当前配置（正确）

```typescript
// astro.config.ts
export default defineConfig({
  output: 'server',  // ✅ 服务器优先
  adapter: vercel(),
});
```

### 页面配置

**静态预渲染的页面：**
- ✅ `src/pages/index.astro` - `prerender: true`
- ✅ `src/pages/blog.astro` - `prerender: true`
- ✅ `src/pages/articles/[id].astro` - `prerender: true` + `getStaticPaths()`
- ✅ `src/pages/tags/index.astro` - `prerender: true`
- ✅ `src/pages/tags/[tag].astro` - `prerender: true` + `getStaticPaths()`
- ✅ `src/pages/categories/index.astro` - `prerender: true`
- ✅ `src/pages/categories/[category].astro` - `prerender: true` + `getStaticPaths()`

**SSR 的页面：**
- ✅ `src/pages/api/articles.ts` - `prerender: false`（默认）
- ✅ `src/pages/dashboard/**/*.astro` - SSR（默认）
- ✅ `src/pages/auth/**/*.astro` - SSR（默认）

---

## 🔧 如何验证配置

### 1. 检查 Astro 版本

```bash
npx astro --version
```

**输出：**
```
astro v5.15.1
```

### 2. 检查配置信息

```bash
npx astro info
```

**输出：**
```
Astro                    v5.15.1
Output                   server        ✅ 正确
Adapter                  @astrojs/vercel (v9.0.0)
```

### 3. 本地测试

```bash
npm run dev
```

应该**不再出现**配置错误：
- ❌ ~~`Expected "static" | "server", received "hybrid"`~~
- ✅ 服务器正常启动

### 4. 构建测试

```bash
npm run build
```

**预期输出：**
```
▶ Building static routes...
  ├─ /index.html                        (+XXms)
  ├─ /blog/index.html                   (+XXms)
  ├─ /articles/1/index.html             (+XXms)
  └─ ...

▶ Building server routes...
  ├─ /api/articles                      (+XXms)
  └─ ...
```

构建日志应该显示：
- ✅ 静态路由被预渲染为 HTML 文件
- ✅ 服务器路由作为无服务器函数

---

## 📚 参考资料

### 官方文档

1. **Astro 5.0 升级指南**
   - [英文](https://docs.astro.build/en/guides/upgrade-to/v5/)
   - [中文](https://docs.astro.build/zh-cn/guides/upgrade-to/v5/)

2. **按需渲染（SSR）**
   - [英文](https://docs.astro.build/en/guides/on-demand-rendering/)
   - [中文](https://docs.astro.build/zh-cn/guides/server-side-rendering/)

3. **Vercel 适配器**
   - [官方文档](https://docs.astro.build/en/guides/integrations-guide/vercel/)

### 关键变更

#### 移除的功能
- ❌ `output: 'hybrid'` - 使用 `output: 'server'` + 页面级 `prerender: true` 替代

#### 新增的功能
- ✅ 更灵活的页面级渲染控制
- ✅ 更清晰的配置语义

---

## 🎯 总结

### 关键要点

1. **Astro 5.0 移除了 `output: 'hybrid'`**
   - 不是 bug，是有意的设计变更

2. **新的混合渲染方式**
   - `output: 'server'` + 页面级 `prerender: true`
   - 或 `output: 'static'` + 页面级 `prerender: false`

3. **功能完全相同**
   - 新方式实现了与 `hybrid` 相同的效果
   - 配置更加灵活和明确

4. **本项目已正确配置**
   - ✅ `output: 'server'`
   - ✅ 公开页面标记为 `prerender: true`
   - ✅ API 和后台保持 SSR

### 性能优化不受影响

- ✅ 静态页面仍然在构建时预渲染
- ✅ CDN 缓存仍然可用
- ✅ 性能提升效果完全相同

---

**迁移完成！配置已更新为 Astro 5.x 兼容。** 🎉

