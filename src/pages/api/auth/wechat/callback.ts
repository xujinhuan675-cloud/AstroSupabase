import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

// 使用 Service Role Key 创建管理员客户端
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  // 用户取消授权
  if (error) {
    console.error("微信授权错误:", error);
    return redirect(`/auth/login?error=${encodeURIComponent("用户取消授权")}`);
  }
  
  // 缺少授权码
  if (!code) {
    console.error("缺少微信授权码");
    return redirect("/auth/login?error=" + encodeURIComponent("授权失败，请重试"));
  }

  // 验证 state（防 CSRF）
  const savedState = cookies.get("wechat_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.error("State 验证失败");
    return redirect("/auth/login?error=" + encodeURIComponent("安全验证失败"));
  }

  try {
    // 1. 用 code 换取 access_token 和 openid
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${
      import.meta.env.PUBLIC_WECHAT_APP_ID
    }&secret=${
      import.meta.env.WECHAT_APP_SECRET
    }&code=${code}&grant_type=authorization_code`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.openid || tokenData.errcode) {
      console.error("获取微信 token 失败:", tokenData);
      return redirect("/auth/login?error=" + encodeURIComponent("微信授权失败"));
    }

    // 2. 获取微信用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`;
    const userInfoRes = await fetch(userInfoUrl);
    const userInfo = await userInfoRes.json();

    if (userInfo.errcode) {
      console.error("获取微信用户信息失败:", userInfo);
      return redirect("/auth/login?error=" + encodeURIComponent("获取用户信息失败"));
    }

    // 3. 在 Supabase 中查找或创建用户
    // 使用 unionid（如果有）或 openid 作为唯一标识
    const uniqueId = userInfo.unionid || userInfo.openid;
    const email = `${uniqueId}@wechat.placeholder`;

    // 先尝试查找用户
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      u => u.user_metadata?.wechat_openid === userInfo.openid
    );

    let userId: string;

    if (existingUser) {
      // 用户已存在，更新信息
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          nickname: userInfo.nickname,
          avatar: userInfo.headimgurl,
          wechat_openid: userInfo.openid,
          wechat_unionid: userInfo.unionid,
          provider: 'wechat'
        }
      });
    } else {
      // 创建新用户
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          nickname: userInfo.nickname,
          avatar: userInfo.headimgurl,
          wechat_openid: userInfo.openid,
          wechat_unionid: userInfo.unionid,
          provider: 'wechat'
        }
      });

      if (createError || !newUser.user) {
        console.error("创建用户失败:", createError);
        return redirect("/auth/login?error=" + encodeURIComponent("创建用户失败"));
      }

      userId = newUser.user.id;
    }

    // 4. 生成访问令牌
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${url.origin}/dashboard`
      }
    });

    if (sessionError || !sessionData.properties?.action_link) {
      console.error("生成会话失败:", sessionError);
      return redirect("/auth/login?error=" + encodeURIComponent("登录失败"));
    }

    // 从 magic link 中提取 token
    const actionLink = sessionData.properties.action_link;
    const tokenMatch = actionLink.match(/[?&]token=([^&]+)/);
    const accessToken = tokenMatch ? tokenMatch[1] : null;

    if (!accessToken) {
      console.error("无法提取访问令牌");
      return redirect("/auth/login?error=" + encodeURIComponent("登录失败"));
    }

    // 5. 清除 state cookie
    cookies.delete("wechat_oauth_state", { path: "/" });

    // 6. 重定向到回调页面，由前端设置 session
    return redirect(`/auth/wechat/callback?access_token=${accessToken}&refresh_token=${accessToken}`);

  } catch (err) {
    console.error("微信登录处理错误:", err);
    return redirect("/auth/login?error=" + encodeURIComponent("系统错误，请稍后重试"));
  }
};
