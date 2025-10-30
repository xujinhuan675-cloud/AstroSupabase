# ⚡ 快速修复指南

## 🎯 您遇到的问题

1. ✅ **首页显示 2 篇文章，但与 content/ 目录不匹配**
   - 首页显示的文章来自数据库（旧数据）
   - content/ 目录只有 1 个文件：`example.md`
   
2. ✅ **后台管理系统看不到文章**
   - 需要登录才能访问

---

## 🚀 立即修复（3 步）

### 步骤 1：清空并重新同步数据库

在本地运行：

```bash
cd F:\IOTO-Doc\AstroSupabase
npm run sync
```

**结果**：
- ❌ 删除数据库中的所有旧文章
- ✅ 重新导入 content/ 目录中的文章
- ✅ 数据库与 content/ 完全一致

---

### 步骤 2：提交到 GitHub

```bash
git add .
git commit -m "添加文章同步脚本并清理数据"
git push origin main
```

**结果**：
- ✅ GitHub Actions 自动运行
- ✅ 部署到 Vercel
- ✅ 网站更新

---

### 步骤 3：验证结果

1. **访问首页**：`https://astrosupabase.vercel.app/`
   - 应该只显示 1 篇文章："欢迎使用 Quartz 数字花园"

2. **登录后台**：
   - 访问：`https://astrosupabase.vercel.app/auth/login`
   - 登录后访问：`https://astrosupabase.vercel.app/dashboard/article`
   - 应该看到 1 篇文章

---

## 📝 添加更多文章

### 方法 1：通过 content/ 目录（推荐）

```bash
# 1. 创建新文章
cd F:\IOTO-Doc\AstroSupabase\content\articles
# 创建新的 .md 文件，例如：my-first-post.md

# 2. 编辑文件，添加 frontmatter
---
title: "我的第一篇文章"
excerpt: "这是我的第一篇文章摘要"
tags: [测试, 博客]
status: published
---

# 我的第一篇文章

这是文章内容...

# 3. 同步到数据库
npm run sync

# 4. 提交到 GitHub
git add .
git commit -m "添加新文章"
git push origin main
```

### 方法 2：通过后台管理系统

1. 登录：`https://astrosupabase.vercel.app/auth/login`
2. 访问后台：`/dashboard/article`
3. 点击"新建文章"
4. 填写内容并保存
5. 文章立即显示在首页

---

## ⚠️ 重要提示

### 选择工作流程

**🔹 以 content/ 为主**（推荐）
- ✅ 优点：所有文章在本地，方便版本控制
- ✅ 使用命令：`npm run sync`
- ⚠️ 注意：会删除后台创建的文章

**🔹 以后台为主**
- ✅ 优点：可视化编辑，方便快捷
- ✅ 直接在后台创建和编辑
- ⚠️ 注意：不要运行 `npm run sync`，否则会删除

**🔹 混合模式**（不推荐）
- ⚠️ 容易造成数据不一致
- 如果必须混用，使用 `npm run import:git`（增量更新）

---

## 🔐 后台登录

如果还没有账号：

1. **注册**：`https://astrosupabase.vercel.app/auth/signup`
2. **登录**：`https://astrosupabase.vercel.app/auth/login`
3. **后台**：`https://astrosupabase.vercel.app/dashboard/article`

---

## 🎉 完成！

运行 `npm run sync` 后：
- ✅ 首页只显示 1 篇文章（来自 example.md）
- ✅ 后台可以看到并编辑这篇文章
- ✅ 数据完全一致
- ✅ 可以开始添加更多内容

---

## 🆘 需要帮助？

查看详细文档：`SYNC_GUIDE.md`

