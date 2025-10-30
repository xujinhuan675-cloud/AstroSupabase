# 🚀 快速开始：自动导入配置

## ✅ 已完成的配置

1. ✅ 导入脚本：`scripts/import-from-git.ts`
2. ✅ GitHub Actions：`.github/workflows/deploy.yml`
3. ✅ NPM 脚本：`package.json`
4. ✅ 详细文档：`IMPORT_SETUP.md`

---

## 📝 立即开始（3 步）

### 第 1 步：配置 GitHub Secrets

访问：`https://github.com/你的用户名/仓库名/settings/secrets/actions`

添加这5个 Secrets：

```
DATABASE_URL=postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:6543/postgres
VERCEL_TOKEN=你的_vercel_token
VERCEL_ORG_ID=你的_org_id
VERCEL_PROJECT_ID=你的_project_id
DEFAULT_AUTHOR_ID=你的_用户_id
```

**获取方式：**
- `DATABASE_URL`：Supabase Dashboard → Settings → Database → Connection string
- `VERCEL_TOKEN`：https://vercel.com/account/tokens
- `VERCEL_ORG_ID` 和 `VERCEL_PROJECT_ID`：运行 `vercel`，查看 `.vercel/project.json`
- `DEFAULT_AUTHOR_ID`：登录 `/dashboard`，查看用户ID

### 第 2 步：添加 Markdown 文件

在 `content/` 目录添加文件：

```markdown
---
title: 我的第一篇文章
tags: [技术, 编程]
date: 2025-01-15
---

# 我的第一篇文章

这是正文内容，支持 [[双向链接]]。

标签：#JavaScript #前端
```

### 第 3 步：提交并推送

```bash
git add content/ .github/ scripts/ package.json
git commit -m "配置自动导入功能"
git push
```

**✅ 完成！** GitHub Actions 会自动：
1. 导入 `content/` 中的所有 MD 文件到 Supabase
2. 构建项目
3. 部署到 Vercel

---

## 🔍 查看结果

1. **GitHub Actions 日志**：https://github.com/你的用户名/仓库名/actions
2. **后台管理**：https://你的域名/dashboard/article
3. **前台文章**：https://你的域名/articles/文章slug

---

## 💡 本地测试导入

在推送到 GitHub 之前，可以本地测试：

```bash
# 1. 确保 .env 文件存在
cat .env

# 2. 运行导入脚本
npm run import:git

# 3. 查看输出
# ✅ 成功: X 篇
# ❌ 失败: X 篇
```

---

## 📚 更多信息

详细配置和高级用法请查看 `IMPORT_SETUP.md`。

---

## ⚙️ 配置说明

### 导入规则
- ✅ 重复文章：自动更新覆盖
- ✅ 默认状态：published（已发布）
- ✅ 支持 frontmatter
- ✅ 支持双向链接 `[[...]]`
- ✅ 支持标签 `#tag`

### 导入后可在后台修改
所有导入的文章都可以在 `/dashboard/article/[id]` 编辑，修改立即生效！

---

**现在试试吧！** 🎉

