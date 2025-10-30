# 📋 文章同步指南

## 🎯 问题说明

### 当前问题
1. **首页显示的文章与 content/ 目录不一致**
   - 首页显示的文章来自 Supabase 数据库
   - 数据库中的文章是之前导入的旧数据
   - 删除 content/ 中的文件后，数据库中的数据没有自动删除

2. **后台管理系统中看不到文章**
   - 需要先登录才能访问后台
   - 登录后可以看到数据库中的所有文章

---

## ✅ 解决方案：使用同步脚本

我已经为您创建了一个新的同步脚本 `sync-articles.ts`，它会：
1. **清空数据库**中的所有文章数据
2. **重新导入** content/ 目录中的所有文章
3. 确保数据库与 content/ 目录**完全一致**

---

## 🚀 使用方法

### 方案 1：本地同步（推荐用于测试）

```bash
# 1. 进入项目目录
cd F:\IOTO-Doc\AstroSupabase

# 2. 确保 .env 文件中有 DATABASE_URL
# 如果没有，请先配置

# 3. 运行同步脚本
npm run sync
```

**注意**：运行此命令会：
- ❌ **删除数据库中的所有文章数据**（包括通过后台创建的文章）
- ✅ 重新导入 content/ 目录中的所有 Markdown 文件

### 方案 2：通过 GitHub Actions 同步

#### 步骤 1：更新 GitHub Actions 工作流

修改 `.github/workflows/deploy.yml`，将导入步骤改为同步：

```yaml
# 4. 同步 Markdown 文件到 Supabase（清空并重新导入）
- name: Sync Markdown files to Supabase
  run: npm run sync
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DEFAULT_AUTHOR_ID: ${{ secrets.DEFAULT_AUTHOR_ID }}
```

#### 步骤 2：提交并推送

```bash
git add .
git commit -m "添加文章同步脚本"
git push origin main
```

GitHub Actions 会自动：
1. 清空数据库
2. 重新导入 content/ 中的所有文章
3. 部署到 Vercel

---

## 📊 同步脚本 vs 导入脚本对比

| 特性 | `import:git` (导入) | `sync` (同步) |
|------|-------------------|--------------|
| 清空数据库 | ❌ 否 | ✅ 是 |
| 处理重复文章 | 更新现有文章 | 全部重新创建 |
| 删除已移除的文章 | ❌ 否 | ✅ 是 |
| 适用场景 | 增量更新 | 完全同步 |

---

## 🔧 当前数据库状态

根据网站显示，数据库中目前有：
1. 一篇 ID 为 `851af13c-6923-47aa-b25a-95044d032b07` 的文章（可能是测试数据）
2. "欢迎使用 Quartz 数字花园" 文章（来自 example.md）

---

## 📝 content/ 目录当前文件

```
content/
└── articles/
    └── example.md  # "欢迎使用 Quartz 数字花园"
```

**注意**：`test-import.md` 已被删除

---

## 🎯 执行同步后的预期结果

### 数据库中的文章：
- ✅ **只有 1 篇**：example.md（"欢迎使用 Quartz 数字花园"）
- ❌ 删除旧的测试数据（ID: 851af13c-6923-47aa-b25a-95044d032b07）

### 首页显示：
- 显示 1 篇文章："欢迎使用 Quartz 数字花园"

### 后台管理系统：
- 登录后可以看到 1 篇文章
- 可以编辑、删除或新建文章

---

## 🔐 访问后台管理系统

### 步骤 1：注册账号（如果还没有）

1. 访问：`https://astrosupabase.vercel.app/auth/signup`
2. 填写邮箱和密码
3. 注册成功

### 步骤 2：登录

1. 访问：`https://astrosupabase.vercel.app/auth/login`
2. 使用注册的账号登录

### 步骤 3：访问后台

1. 登录成功后访问：`https://astrosupabase.vercel.app/dashboard/article`
2. 查看所有文章列表
3. 可以编辑、删除或新建文章

---

## ⚠️ 重要提示

### ⚠️ 同步脚本会删除所有数据

运行 `npm run sync` 会：
1. ❌ 删除数据库中的**所有文章**（包括通过后台创建的）
2. ❌ 删除所有文章的**标签**
3. ❌ 删除所有文章的**链接关系**
4. ✅ 重新导入 content/ 目录中的文章

**建议**：
- 如果您在后台创建了重要文章，请先备份
- 或者使用 `npm run import:git`（增量更新模式）

### ✅ 增量更新模式

如果您不想删除现有数据，使用：
```bash
npm run import:git
```

这会：
- ✅ 保留数据库中的现有文章
- ✅ 新增 content/ 中的新文章
- ✅ 更新已存在的文章（根据 slug 匹配）

---

## 🆘 常见问题

### Q1: 为什么首页显示的文章和 content/ 不一样？

**A**: 因为首页从数据库读取数据，而不是直接读取 content/ 文件。需要运行同步脚本更新数据库。

### Q2: 后台管理系统为什么看不到文章？

**A**: 需要先登录。访问 `/auth/login` 登录后即可看到。

### Q3: 我在后台创建的文章会被同步脚本删除吗？

**A**: 是的。`npm run sync` 会清空数据库。如果要保留后台创建的文章，请使用 `npm run import:git`。

### Q4: 如何添加更多文章？

**A**: 有两种方式：
1. 在 content/ 目录创建新的 .md 文件，然后运行同步
2. 登录后台，点击"新建文章"按钮

---

## 📖 推荐工作流程

### 方式 A：以 content/ 为主（推荐）

1. 在 content/ 目录编写 Markdown 文件
2. 提交到 GitHub
3. GitHub Actions 自动同步到数据库
4. 网站自动更新

### 方式 B：以后台为主

1. 登录后台管理系统
2. 在后台创建和编辑文章
3. 文章直接保存到数据库
4. 网站自动显示

**注意**：两种方式不要混用，否则可能造成数据不一致。

---

## 🎉 下一步

运行同步脚本后：
1. ✅ 数据库与 content/ 目录完全一致
2. ✅ 首页显示正确的文章
3. ✅ 后台可以查看和编辑文章
4. ✅ 可以开始添加更多内容

