# 🔧 Supabase 连接问题排查指南

## 📋 问题描述

```
[ERROR] getaddrinfo ENOTFOUND db.lvueuvuiavvchysfuobi.supabase.co
```

这是一个 **DNS 解析失败**错误，意味着无法连接到 Supabase 数据库服务器。

---

## 🎯 可能的原因及解决方案

### 1️⃣ Supabase 项目被暂停（最常见）⭐

**原因**：
- Supabase 免费计划的项目在 **7 天不活跃**后会自动暂停
- 暂停后数据库连接会失效

**解决方案**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 找到你的项目：`lvueuvuiavvchysfuobi`
3. 如果看到项目状态为 "Paused" 或 "Inactive"
4. 点击 **"Restore"** 或 **"Resume"** 按钮
5. 等待项目重启（通常需要 1-2 分钟）
6. 重新运行 `dev-local.ps1`

### 2️⃣ 网络连接问题

**可能原因**：
- 防火墙阻止了对 Supabase 的访问
- 需要使用代理
- 网络不稳定

**解决方案**：

**A. 检查网络连接**
```powershell
# 在 PowerShell 中测试连接
Test-NetConnection db.lvueuvuiavvchysfuobi.supabase.co -Port 5432
```

如果连接失败，尝试：
- 关闭 VPN/代理后重试
- 检查防火墙设置
- 切换到其他网络环境（如手机热点）

**B. 检查 DNS 解析**
```powershell
# 测试 DNS 解析
nslookup db.lvueuvuiavvchysfuobi.supabase.co
```

如果 DNS 解析失败，尝试：
- 修改 DNS 服务器为公共 DNS（如 8.8.8.8）
- 刷新 DNS 缓存：`ipconfig /flushdns`

### 3️⃣ 项目已删除或配置错误

**检查步骤**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 确认项目 `lvueuvuiavvchysfuobi` 是否存在
3. 如果项目不存在或已删除：
   - 需要创建新项目
   - 更新 `.env` 文件中的配置

### 4️⃣ 环境变量未正确加载

**检查方法**：
```powershell
# 在 PowerShell 中运行
cd F:\IOTO-Doc\astro-supabase-blog
$env:PUBLIC_SUPABASE_URL
$env:PUBLIC_SUPABASE_ANON_KEY
```

如果输出为空，说明环境变量未加载：
- 确保 `.env` 文件存在于项目根目录
- 确保使用 `dev-local.ps1` 启动而不是直接 `npm run dev`
- 重启 PowerShell 窗口

---

## ✅ 快速诊断检查清单

依次检查以下项目：

- [ ] **Supabase 项目状态**
  - 登录 Supabase Dashboard
  - 确认项目是否处于活跃状态
  - 如果暂停，点击 Resume

- [ ] **网络连接**
  ```powershell
  ping supabase.com
  Test-NetConnection db.lvueuvuiavvchysfuobi.supabase.co -Port 5432
  ```

- [ ] **DNS 解析**
  ```powershell
  nslookup db.lvueuvuiavvchysfuobi.supabase.co
  ipconfig /flushdns  # 如果解析失败
  ```

- [ ] **环境变量配置**
  - 检查 `.env` 文件是否存在
  - 确认内容格式正确（无多余空格）
  - 使用 `dev-local.ps1` 启动

- [ ] **防火墙/代理设置**
  - 暂时禁用防火墙测试
  - 关闭 VPN/代理后重试

---

## 🚀 推荐操作步骤

### 立即尝试（按顺序）：

1. **重启 Supabase 项目**（最常见解决方案）
   - 访问：https://supabase.com/dashboard/project/lvueuvuiavvchysfuobi
   - 如果项目暂停，点击恢复
   - 等待 1-2 分钟后重试

2. **测试网络连接**
   ```powershell
   ping supabase.com
   nslookup db.lvueuvuiavvchysfuobi.supabase.co
   ```

3. **刷新 DNS 缓存**
   ```powershell
   ipconfig /flushdns
   ```

4. **重新启动开发服务器**
   - 双击 `dev-local.ps1`
   - 或在 PowerShell 中：
     ```powershell
     cd F:\IOTO-Doc\astro-supabase-blog
     .\dev-local.ps1
     ```

---

## 💡 临时解决方案（本地开发）

如果你只是想测试 Obsidian vault 功能（不需要 Supabase），可以：

### 方案 A：禁用 Supabase 功能

修改 `src/lib/supabase.ts`，添加条件检查：

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// 如果没有配置 Supabase，创建一个 mock 客户端
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase not configured, running in local mode');
  export const supabase = null as any;
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
```

### 方案 B：使用本地 Supabase

```powershell
# 安装 Supabase CLI
npm install -g supabase

# 初始化本地 Supabase
supabase init

# 启动本地 Supabase（需要 Docker）
supabase start
```

---

## 📞 获取更多帮助

如果以上方案都无法解决问题：

1. **查看完整错误日志**
   - 在运行 `dev-local.ps1` 时保存完整输出
   - 查找其他相关错误信息

2. **检查 Supabase 状态页**
   - 访问：https://status.supabase.com/
   - 确认服务是否正常

3. **联系 Supabase 支持**
   - 如果是免费计划，可能需要升级才能获得技术支持

---

## ✨ 预防措施

为了避免将来出现此问题：

1. **定期使用项目**
   - 至少每 7 天访问一次以保持活跃
   - 或升级到付费计划（不会自动暂停）

2. **设置监控**
   - 在 Supabase Dashboard 启用邮件通知
   - 项目暂停前会收到提醒

3. **本地开发环境**
   - 考虑使用本地 Supabase 进行开发
   - 只在生产环境使用云端 Supabase

---

**最后更新**：2025-10-27

**相关文档**：
- [快速开始.md](./快速开始.md)
- [启动脚本说明.md](./启动脚本说明.md)
- [README.md](./README.md)

