# 📂 路径结构说明

**更新日期**: 2025-10-31  
**适用场景**: 学科知识文档博客

---

## 🗺️ 当前路径结构

### 主要页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Landing Page | 欢迎页（星空背景 + 知识图谱） |
| `/blog` | 博客主页 | 所有文章列表 |
| `/articles` | 文章列表 | 与 `/blog` 相同，但更语义化 |
| `/articles/[id]` | 文章详情 | 单篇文章内容 |

### 学科分类系统 ✨ 新增

| 路径 | 页面 | 说明 |
|------|------|------|
| `/categories` | 学科分类导航 | 展示所有学科分类 |
| `/categories/math` | 数学分类 | 数学相关文章 📐 |
| `/categories/physics` | 物理分类 | 物理相关文章 ⚛️ |
| `/categories/chemistry` | 化学分类 | 化学相关文章 🧪 |
| `/categories/biology` | 生物分类 | 生物相关文章 🧬 |
| `/categories/computer` | 计算机分类 | 编程和计算机科学 💻 |
| `/categories/literature` | 文学分类 | 文学作品和语言学习 📚 |

### 标签系统

| 路径 | 页面 | 说明 |
|------|------|------|
| `/tags/[tag]` | 标签页 | 特定标签的文章列表 |

### SEO 和系统页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/404` | 404 页面 | 页面未找到提示 ✨ 新增 |
| `/rss.xml` | RSS Feed | 文章订阅源 ✨ 新增 |
| `/sitemap-0.xml` | Sitemap | 站点地图（自动生成）✨ 新增 |

### 用户认证和管理

| 路径 | 页面 | 说明 |
|------|------|------|
| `/auth/login` | 登录页 | 用户登录 |
| `/auth/signup` | 注册页 | 用户注册 |
| `/dashboard` | 管理后台 | 文章管理（需登录） |
| `/dashboard/article` | 文章管理 | 文章列表 |
| `/dashboard/article/new` | 新建文章 | 创建新文章 |
| `/dashboard/article/[id]` | 编辑文章 | 编辑现有文章 |

### 其他功能页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/graph` | 全局图谱 | 全局知识图谱 |

---

## 🎨 推荐的导航结构

### 主导航（Header）

```
首页 | 文章 | 学科分类 | 标签 | 图谱
```

### 学科分类下拉菜单

```
学科分类 ▼
  ├─ 📐 数学
  ├─ ⚛️ 物理
  ├─ 🧪 化学
  ├─ 🧬 生物
  ├─ 💻 计算机
  └─ 📚 文学
```

---

## 📋 使用建议

### 1. 文章分类方式

**方法 A：使用标签**（当前实现）
- 在文章中添加标签：`tags: ["数学", "几何"]`
- 通过标签过滤文章

**方法 B：使用分类字段**（推荐，需要数据库迁移）
- 在数据库添加 `category` 字段
- 每篇文章只属于一个主分类
- 标签用于更细粒度的分类

### 2. 内容组织建议

**学科知识文档的组织方式**：

```
数学
  ├─ 代数
  │   ├─ 线性代数基础
  │   └─ 矩阵运算
  ├─ 几何
  │   ├─ 解析几何
  │   └─ 立体几何
  └─ 微积分
      ├─ 极限与连续
      └─ 导数应用

物理
  ├─ 力学
  ├─ 电磁学
  └─ 热力学
```

**实现方式**：
- 一级分类：`/categories/math`
- 二级分类：使用标签 `tags: ["代数", "线性代数"]`
- 三级细节：文章标题和内容

---

## 🔧 如何添加新分类

### 方法 1：修改分类配置（简单）

编辑 `src/pages/categories/index.astro` 和 `src/pages/categories/[category].astro`：

```typescript
const categories = [
  // 添加新分类
  { 
    id: 'history', 
    name: '历史', 
    icon: '📜',
    description: '历史事件和人物研究',
    color: '#6B7280'
  },
  // ... 其他分类
];
```

### 方法 2：数据库驱动（推荐）

1. 创建 `categories` 表
2. 在文章表添加 `category_id` 字段
3. 通过 API 动态获取分类

---

## 🚀 导航组件示例

### 创建主导航组件

```astro
---
// src/components/MainNav.astro
---

<nav class="main-nav">
  <a href="/">首页</a>
  <a href="/blog">文章</a>
  
  <div class="dropdown">
    <button>学科分类 ▼</button>
    <div class="dropdown-menu">
      <a href="/categories/math">📐 数学</a>
      <a href="/categories/physics">⚛️ 物理</a>
      <a href="/categories/chemistry">🧪 化学</a>
      <a href="/categories/biology">🧬 生物</a>
      <a href="/categories/computer">💻 计算机</a>
      <a href="/categories/literature">📚 文学</a>
    </div>
  </div>
  
  <a href="/graph">图谱</a>
</nav>
```

---

## 📊 路径优先级建议

### 用户常访问路径（高优先级）

1. ✅ `/` - Landing Page
2. ✅ `/blog` - 博客主页
3. ✅ `/articles/[id]` - 文章详情
4. ✅ `/categories` - 学科分类（新增）
5. ✅ `/categories/[category]` - 具体学科（新增）

### SEO 必备（高优先级）

1. ✅ `/rss.xml` - RSS 订阅
2. ✅ `/sitemap-0.xml` - 站点地图
3. ✅ `/404` - 404 页面

### 管理功能（中优先级）

1. ✅ `/dashboard` - 后台管理
2. ✅ `/auth/login` - 登录

### 可选功能（低优先级）

1. `/search` - 搜索结果页（可选，当前使用弹窗）
2. `/about` - 关于页面
3. `/docs` - 文档中心（系统性文档）

---

## 🎯 SEO 友好的 URL 设计

### 遵循的原则

1. ✅ 语义化：`/categories/math` 而不是 `/cat/1`
2. ✅ 简短：`/articles/2` 而不是 `/article/view?id=2`
3. ✅ 小写：使用小写字母
4. ✅ 连字符：多词使用连字符 `/my-article`
5. ✅ 层级清晰：`/categories/math` 表明层级关系

### 示例对比

| ❌ 不好 | ✅ 好 |
|---------|------|
| `/p?id=123` | `/articles/123` |
| `/category.php?cat=math` | `/categories/math` |
| `/articleList` | `/articles` 或 `/blog` |
| `/tag.aspx?tag=python` | `/tags/python` |

---

## 📝 下一步建议

### 1. 添加导航组件
- 创建主导航栏
- 添加学科分类下拉菜单
- 添加面包屑导航

### 2. 数据库优化
- 添加 `category` 字段到 articles 表
- 创建 categories 表（如果需要动态管理）
- 添加迁移脚本

### 3. 内容组织
- 规划学科体系
- 编写示例文章
- 添加标签体系

### 4. SEO 优化
- 提交 Sitemap 到 Google
- 添加 RSS 订阅链接
- 优化页面 meta 标签

---

## 🔗 相关文件

- `src/pages/articles/index.astro` - 文章列表页
- `src/pages/categories/index.astro` - 学科分类导航
- `src/pages/categories/[category].astro` - 具体学科页面
- `src/pages/404.astro` - 404 页面
- `src/pages/rss.xml.ts` - RSS Feed
- `astro.config.ts` - Sitemap 配置

---

**创建日期**: 2025-10-31  
**最后更新**: 2025-10-31

