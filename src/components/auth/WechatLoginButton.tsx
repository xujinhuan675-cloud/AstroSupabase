import { useState, useEffect } from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
    avatar?: string;
    full_name?: string;
    nickname?: string;
    role?: string;
  };
}

export default function WechatLoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // 检查用户登录状态
    checkUser();
    
    // 点击外部关闭下拉菜单
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const checkUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = () => {
    try {
      // 生成随机 state
      const state = Math.random().toString(36).substring(2, 15);
      
      // 保存 state 到 cookie
      document.cookie = `wechat_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;
      
      // 构建微信授权 URL
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/wechat/callback`);
      const appId = import.meta.env.PUBLIC_WECHAT_APP_ID;
      
      const wechatAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
      
      // 跳转到微信授权页面
      window.location.href = wechatAuthUrl;
    } catch (err) {
      console.error('微信登录错误:', err);
      alert('微信登录失败，请稍后重试');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUser(null);
        window.location.href = '/';
      }
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const handleCopyUID = async () => {
    if (!user?.id) return;
    
    try {
      await navigator.clipboard.writeText(user.id);
      // 可以添加一个提示，但这里简单处理
      alert('UID 已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = user.id;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('UID 已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请手动复制：' + user.id);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="wechat-login-skeleton">
        <div className="skeleton-circle"></div>
      </div>
    );
  }

  if (user) {
    // 已登录状态 - 显示用户信息
    const userName = user.user_metadata?.nickname || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '用户';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.avatar;
    const userRole = user.user_metadata?.role || 'user';
    const isAdmin = userRole === 'admin';
    
    // 显示 UID 前8位
    const displayUID = user.id.substring(0, 8);

    return (
      <div className="user-menu">
        <button 
          className="user-button" 
          aria-label="用户菜单"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}>
          {isAdmin && (
            <a href="/dashboard" className="dropdown-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              控制台
            </a>
          )}
          <button onClick={handleCopyUID} className="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            复制 UID
          </button>
          <button onClick={handleLogout} className="dropdown-item logout-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            退出登录
          </button>
        </div>
      </div>
    );
  }

  // 未登录状态 - 显示微信登录按钮
  return (
    <button
      onClick={handleWechatLogin}
      className="wechat-login-button"
      aria-label="微信登录"
    >
      <svg className="wechat-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
      </svg>
      <span className="wechat-text">微信登录</span>
    </button>
  );
}
