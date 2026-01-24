# 搜索功能修复总结

## 🎯 问题
线上搜索接口 `/api/search` 返回空数组，本地正常。

## 🔍 根本原因
文章的 `search_vector` 字段为 NULL，全文搜索无法匹配。

## ✅ 解决方案

### 已创建的工具

#### 1. 诊断脚本 (`scripts/diagnose-search.ts`)
**功能**:
- 检查文章总数和已发布数
- 检查 `search_vector` 字段状态
- 测试多个搜索查询
- 检查触发器是否存在
- 显示示例文章的搜索向量

**使用**:
```bash
npm run diagnose:search
```

#### 2. 修复脚本 (`scripts/rebuild-search-index.ts`)
**功能**:
- 为所有文章重新生成 `search_vector`
- 使用与触发器相同的逻辑

**使用**:
```bash
npm run fix:search
```

#### 3. 自动修复脚本 (`scripts/post-deploy-fix.ts`)
**功能**:
- 自动检查搜索向量状态
- 自动修复缺失的搜索向量
- 验证修复结果
- 测试搜索功能

**使用**:
```bash
npm run post-deploy
```

### 更新的部署流程

**package.json 新增命令**:
```json
{
  "scripts": {
    "diagnose:search": "tsx scripts/diagnose-search.ts",
    "fix:search": "tsx scripts/rebuild-search-index.ts",
    "fix:prod": "tsx scripts/post-deploy-fix.ts",
    "post-deploy": "tsx scripts/post-deploy-fix.ts",
    "deploy": "npm run import:git && vercel --prod",
    "deploy:full": "npm run import:git && npm run pre-render && npm run generate-graph && vercel --prod"
  }
}
```

**注意**: 
- `deploy` 命令**不会**自动修复线上数据库
- 需要部署后手动运行修复脚本
- 使用临时环境变量指向线上数据库

## 📋 快速修复步骤

### ⚠️ 重要：本地 vs 线上

**所有脚本修复的是 `DATABASE_URL` 指向的数据库**：
- `.env` 配置本地数据库 → 修复本地
- 临时设置线上数据库 → 修复线上

### 修复本地数据库

#### 方法 1: 一键修复
```bash
cd AstroSupabase
npm run post-deploy
```

#### 方法 2: 手动修复
```bash
# 1. 诊断
npm run diagnose:search

# 2. 修复
npm run fix:search

# 3. 验证
npm run diagnose:search
```

### 修复线上数据库（推荐方法）

#### 方法 1: 临时环境变量（最安全）
```bash
# 一次性修复，不修改 .env 文件
DATABASE_URL="postgresql://线上数据库URL" npm run fix:prod
```

#### 方法 2: export 方式
```bash
# 设置环境变量（当前终端会话有效）
export DATABASE_URL="postgresql://线上数据库URL"

# 诊断
npm run diagnose:search

# 修复
npm run fix:prod

# 验证
npm run diagnose:search
```

**详细步骤请查看**: `修复线上搜索功能.md`

## 📚 文档

### 创建的文档
1. **搜索功能修复说明.md** - 快速修复指南
2. **docs/搜索功能排查指南.md** - 详细排查步骤

### 文档内容
- 问题描述和原因分析
- 详细的排查步骤
- 多种修复方法
- 预防措施
- 常见问题解答
- 技术细节说明

## 🔧 技术细节

### 搜索向量生成
```sql
search_vector = 
  setweight(to_tsvector('simple', coalesce(title,'')), 'A') || 
  setweight(to_tsvector('simple', coalesce(content,'')), 'B')
```

### 搜索查询
```typescript
sql`${articles.searchVector} @@ plainto_tsquery('simple', ${searchTerm})`
```

### 索引
```sql
CREATE INDEX articles_search_idx ON articles USING gin(search_vector);
```

## 🚀 部署建议

### 部署流程
```bash
# 1. 部署到 Vercel
npm run deploy

# 2. 部署完成后，修复线上数据库
DATABASE_URL="postgresql://线上数据库URL" npm run fix:prod
```

### 完整流程（含预渲染）
```bash
# 1. 完整部署
npm run deploy:full

# 2. 修复线上数据库
DATABASE_URL="postgresql://线上数据库URL" npm run fix:prod
```

### 部署后检查
```bash
# 测试搜索 API
curl "https://your-domain.vercel.app/api/search?q=数学"
```

## ⚠️ 注意事项

1. **环境变量**: 确保 `DATABASE_URL` 正确配置
2. **迁移执行**: 确保 `0003_add_links_support.sql` 已执行
3. **触发器**: 新文章会自动生成搜索向量
4. **定期检查**: 大量导入后运行诊断

## 📊 预期结果

### 修复前
```bash
curl "/api/search?q=数学"
# 返回: []
```

### 修复后
```bash
curl "/api/search?q=数学"
# 返回: [{"id":1,"title":"数学基础",...}]
```

## 🎉 总结

### 已完成
- ✅ 创建诊断脚本
- ✅ 创建修复脚本
- ✅ 创建自动修复脚本
- ✅ 更新部署流程
- ✅ 编写详细文档

### 使用流程
1. 运行 `npm run diagnose:search` 确认问题
2. 运行 `npm run fix:search` 修复
3. 或直接运行 `npm run post-deploy` 自动处理
4. 测试搜索 API 验证

### 后续维护
- 使用新的部署命令 `npm run deploy`
- 定期运行诊断检查
- 监控搜索功能状态

---

**创建日期**: 2026-01-24  
**状态**: ✅ 完成  
**下一步**: 运行修复脚本并测试
