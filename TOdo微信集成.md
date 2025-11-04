# Astro + Supabase 微信扫码登录集成方案

## 目录
- [技术背景](#技术背景)
- [整体架构](#整体架构)
- [准备工作](#准备工作)
- [代码实现](#代码实现)
- [环境变量配置](#环境变量配置)
- [进阶优化](#进阶优化)

---

## 技术背景

### 微信开放平台扫码登录原理

微信网站应用扫码登录使用 OAuth 2.0 授权流程，通过嵌入 iframe 或直接跳转到微信授权页面来实现。

#### 关键 API 参数

微信授权 URL 格式：
```
https://open.weixin.qq.com/connect/qrconnect?
  appid={APPID}&
  scope=snsapi_login&
  redirect_uri={回调地址}&
  state={状态参数}&
  login_type=jssdk&
  self_redirect=default&
  style={样式}&
  href={自定义CSS}
```

**参数说明：**
- **appid**: 微信开放平台的应用ID
- **scope**: `snsapi_login` - 网站应用固定使用此值
- **redirect_uri**: 授权回调地址，需要 URL 编码
- **state**: 用于保持请求和回调的状态，防止 CSRF 攻击
- **style**: 二维码样式（如 `black`、`white`）
- **href**: base64 编码的自定义 CSS 样式（可选）

#### 自定义样式示例

可通过 `href` 参数传入 base64 编码的 CSS 来定制二维码显示：

```css
.impowerBox .qrcode {width: 200px;}
.impowerBox .title {display: none;}  /* 隐藏标题 */
.impowerBox .info {width: 200px;}
.impowerBox .status {text-align: center;}
```

#### 移动端适配

移动端可在微信内置浏览器中直接授权：
```html
<p>移动端，请在<a href="weixin://">微信</a>中打开网站，点击即可授权。</p>
```

---

## 整体架构

### 架构方案：Astro + Supabase + 微信 OAuth

> ✅ 不放弃 Supabase Auth  
> ✅ 支持 Vercel / Cloudflare 部署  
> ✅ 支持 PC / 手机浏览器扫码登录

### 登录流程图

```
[用户点击"微信登录"]
        ↓
[跳转微信OAuth授权页]
        ↓
[微信返回code到中间API（/api/auth/wechat/callback）]
        ↓
[中间API用code向微信服务器换取openid/unionid]
        ↓
[中间API用 Supabase Service Key 创建/查找用户]
        ↓
[中间API返回 Supabase access_token 给前端]
        ↓
[前端调用 supabase.auth.setSession() 完成登录]
```

---

## 准备工作

### 1️⃣ 注册微信开放平台应用

1. 访问：[https://open.weixin.qq.com/](https://open.weixin.qq.com/)
2. 进入「网站应用」→「创建应用」
3. 填写应用信息并提交审核
4. 获取关键信息：
   - `AppID`（应用ID）
   - `AppSecret`（应用密钥）
5. 设置授权回调域名为：
   ```
   https://yourdomain.com/api/auth/wechat/callback
   ```

---

## 代码实现

### 1. 创建 Astro API 路由

新建文件：`src/pages/api/auth/wechat/callback.ts`

```ts
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("缺少 code", { status: 400 });
  }

  // 1️⃣ 用 code 换取 access_token 与 openid
  const wxRes = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${
      import.meta.env.WECHAT_APP_ID
    }&secret=${import.meta.env.WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`
  );
  const wxData = await wxRes.json();

  if (!wxData.openid) {
    return new Response(JSON.stringify(wxData), { status: 400 });
  }

  // 2️⃣ 获取微信用户资料
  const infoRes = await fetch(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${wxData.access_token}&openid=${wxData.openid}`
  );
  const info = await infoRes.json();

  // 3️⃣ 在 Supabase 中创建或获取用户
  const email = `${info.unionid || info.openid}@wechat.user`;
  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      nickname: info.nickname,
      avatar: info.headimgurl,
      wechat_openid: info.openid,
    },
  });

  if (error && !error.message.includes("already exists")) {
    return new Response(error.message, { status: 400 });
  }

  // 4️⃣ 创建 JWT 会话
  const jwt = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  // 5️⃣ 重定向回前端携带 token
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/auth/callback?access_token=${jwt.data.properties.action_link.split("token=")[1]}`,
    },
  });
};
```

### 2. 前端页面集成登录按钮

在登录页（例如 `src/pages/login.astro`）中添加：

```astro
---
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY)
---

<button 
  onClick={() => {
    const redirectUri = encodeURIComponent("https://yourdomain.com/api/auth/wechat/callback");
    window.location.href = `https://open.weixin.qq.com/connect/qrconnect?appid=${import.meta.env.WECHAT_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=astro`
  }}>
  微信扫码登录
</button>
```

**可选的 iframe 嵌入方式：**

如果需要直接在页面中嵌入二维码（如 Tab 切换登录方式），可以使用 iframe：

```astro
<iframe 
  src={`https://open.weixin.qq.com/connect/qrconnect?appid=${import.meta.env.WECHAT_APP_ID}&scope=snsapi_login&redirect_uri=${encodeURIComponent("https://yourdomain.com/api/auth/wechat/callback")}&state=astro&login_type=jssdk&self_redirect=default&style=black`}
  width="200"
  height="200"
  frameBorder="0"
/>
```

### 3. 创建登录回调页

新建文件：`src/pages/auth/callback.astro`

```astro
---
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY)

const accessToken = Astro.url.searchParams.get("access_token")

if (accessToken) {
  await supabase.auth.setSession({ access_token: accessToken })
  return Astro.redirect("/")
}
---

<p>登录中，请稍候...</p>
```

---

## 环境变量配置

在项目根目录创建或更新 `.env` 文件：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 微信开放平台配置
WECHAT_APP_ID=wx123456789
WECHAT_APP_SECRET=abcdef123456
```

> ⚠️ **安全提示：** `SERVICE_ROLE_KEY` 一定不要暴露在前端，只在后端（API 路由）使用！

### 部署环境变量配置

**Vercel:**
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add WECHAT_APP_ID
vercel env add WECHAT_APP_SECRET
```

**Cloudflare Pages:**
在 Cloudflare Dashboard → Pages → Settings → Environment Variables 中添加

---

## 完整登录流程

1. 用户点击「微信扫码登录」按钮
2. 跳转到微信授权页面（或显示二维码）
3. 用户扫码确认授权
4. 微信回调到 `/api/auth/wechat/callback`
5. 后端用 code 换取用户信息，在 Supabase 中创建/查找用户
6. 生成 Supabase session token
7. 重定向到 `/auth/callback?access_token=xxx`
8. 前端设置 session，完成登录
9. 重定向到主页或目标页面

---

## 进阶优化

### 1. 使用 Supabase Edge Function

可将 `/api/auth/wechat/callback` 迁移为 Supabase Edge Function，获得更好的安全性和性能。

### 2. 用户资料管理

登录后自动创建/更新用户资料表：

```sql
-- 创建 profiles 表
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nickname TEXT,
  avatar TEXT,
  wechat_openid TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

在 callback API 中更新：
```ts
await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    nickname: info.nickname,
    avatar: info.headimgurl,
    wechat_openid: info.openid,
    updated_at: new Date().toISOString()
  });
```

### 3. 支持邮箱绑定

允许微信登录用户绑定邮箱，以便找回密码等功能。

### 4. 前端状态管理

配合 `supabase.auth.onAuthStateChange` 实现登录状态自动刷新：

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('用户已登录', session)
    // 更新 UI 状态
  } else if (event === 'SIGNED_OUT') {
    console.log('用户已登出')
    // 清理 UI 状态
  }
})
```

### 5. 错误处理优化

增强 callback API 的错误处理：

```ts
export const GET: APIRoute = async ({ url }) => {
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    
    // 检查用户是否取消授权
    if (error) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent(error)}`,
        },
      });
    }
    
    if (!code) {
      return new Response("缺少授权码", { status: 400 });
    }
    
    // ... 后续流程
  } catch (err) {
    console.error('微信登录错误:', err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=login_failed`,
      },
    });
  }
};
```

### 6. 安全增强

- 使用随机 `state` 参数并验证，防止 CSRF 攻击
- 添加请求频率限制，防止滥用
- 验证回调 URL 的合法性

---

## 总结

本方案实现了 Astro + Supabase 与微信扫码登录的完整集成，保留了 Supabase Auth 的优势，同时支持微信便捷登录。通过合理的架构设计，可以在不放弃现有认证系统的情况下，为用户提供多种登录方式。