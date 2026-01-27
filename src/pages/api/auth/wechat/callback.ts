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
    return redirect(`/?error=${encodeURIComponent("用户取消授权")}`);
  }
  
  // 缺少授权码
  if (!code) {
    console.error("缺少微信授权码");
    return redirect("/?error=" + encodeURIComponent("授权失败，请重试"));
  }

  // 验证 state（防 CSRF）
  const savedState = cookies.get("wechat_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    console.error("State 验证失败");
    return redirect("/?error=" + encodeURIComponent("安全验证失败"));
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
      return redirect("/?error=" + encodeURIComponent("微信授权失败"));
    }

    // 2. 获取微信用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}`;
    const userInfoRes = await fetch(userInfoUrl);
    const userInfo = await userInfoRes.json();

    if (userInfo.errcode) {
      console.error("获取微信用户信息失败:", userInfo);
      return redirect("/?error=" + encodeURIComponent("获取用户信息失败"));
    }

    // 3. 在 Supabase 中查找或创建用户
    // 使用 unionid（如果有）或 openid 作为唯一标识
    const uniqueId = userInfo.unionid || userInfo.openid;
    const email = `${uniqueId}@wechat.placeholder`;

    // 管理员白名单
    const ADMIN_USER_IDS = [
      '372a716c-2c7d-44ca-a7fb-3dd221cedb60',
      '851af13c-6923-47aa-b25a-95044d032b07'
    ];

    // 先尝试查找用户
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      u => u.user_metadata?.wechat_openid === userInfo.openid
    );

    let userId: string;
    let userRole = 'user'; // 默认角色

    if (existingUser) {
      // 用户已存在，更新信息
      userId = existingUser.id;
      
      // 检查是否为管理员
      if (ADMIN_USER_IDS.includes(userId)) {
        userRole = 'admin';
      }
      
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          nickname: userInfo.nickname,
          avatar: userInfo.headimgurl,
          wechat_openid: userInfo.openid,
          wechat_unionid: userInfo.unionid,
          provider: 'wechat',
          role: userRole
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
          provider: 'wechat',
          role: 'user' // 新用户默认为普通用户
        }
      });

      if (createError || !newUser.user) {
        console.error("创建用户失败:", createError);
        return redirect("/?error=" + encodeURIComponent("创建用户失败"));
      }

      userId = newUser.user.id;
      
      // 如果新用户的 ID 在管理员白名单中，更新为管理员
      if (ADMIN_USER_IDS.includes(userId)) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            nickname: userInfo.nickname,
            avatar: userInfo.headimgurl,
            wechat_openid: userInfo.openid,
            wechat_unionid: userInfo.unionid,
            provider: 'wechat',
            role: 'admin'
          }
        });
      }
    }

    // 4. 使用 signInWithPassword 的替代方案
    // 为用户设置一个临时密码并立即登录
    const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // 更新用户密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword
    });

    if (updateError) {
      console.error("更新用户密码失败:", updateError);
      return redirect("/?error=" + encodeURIComponent("登录失败"));
    }

    // 使用密码登录获取 session
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: tempPassword
    });

    if (signInError || !signInData.session) {
      console.error("登录失败:", signInError);
      return redirect("/?error=" + encodeURIComponent("登录失败"));
    }

    const { access_token, refresh_token } = signInData.session;

    // 5. 清除 state cookie
    cookies.delete("wechat_oauth_state", { path: "/" });

    // 6. 设置 session cookies
    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    // 7. 直接跳转到首页
    return redirect("/");

  } catch (err) {
    console.error("微信登录处理错误:", err);
    return redirect("/?error=" + encodeURIComponent("系统错误，请稍后重试"));
  }
};
