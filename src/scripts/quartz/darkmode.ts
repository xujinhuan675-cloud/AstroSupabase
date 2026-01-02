/**
 * Darkmode 客户端脚本
 * 从 Quartz 迁移
 * 
 * 功能：
 * - 主题切换逻辑
 * - 持久化存储
 * - 系统主题检测
 * 
 * 性能优化：
 * - 使用 CSS 变量实现平滑过渡
 * - 避免页面闪烁和重排
 * - 使用 requestAnimationFrame 优化动画
 */

// 在 DOM 加载前立即初始化主题（防止闪烁）
const initTheme = () => {
  const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const currentTheme = localStorage.getItem("theme") ?? userPref;
  
  // 立即设置主题，避免闪烁
  document.documentElement.setAttribute("saved-theme", currentTheme);
  
  // 添加过渡类（在初始化后启用过渡动画）
  requestAnimationFrame(() => {
    document.documentElement.classList.add('theme-transition-enabled');
  });
};

// 立即执行初始化
initTheme();

// 发送主题变更事件
const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event = new CustomEvent("themechange", {
    detail: { theme },
  });
  document.dispatchEvent(event);
};

// 切换主题（使用 requestAnimationFrame 优化）
const switchTheme = () => {
  const currentTheme = document.documentElement.getAttribute("saved-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  // 使用 requestAnimationFrame 确保在下一帧渲染前更新
  requestAnimationFrame(() => {
    // 批量更新 DOM，减少重排
    document.documentElement.setAttribute("saved-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    // 在下一帧发送事件，避免阻塞渲染
    requestAnimationFrame(() => {
      emitThemeChangeEvent(newTheme);
    });
  });
};

// 系统主题变化监听
const themeChange = (e: MediaQueryListEvent) => {
  // 只有在用户没有手动设置主题时才跟随系统
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return; // 用户已手动设置，不跟随系统
  
  const newTheme = e.matches ? "dark" : "light";
  
  requestAnimationFrame(() => {
    document.documentElement.setAttribute("saved-theme", newTheme);
    emitThemeChangeEvent(newTheme);
  });
};

// 设置暗色模式按钮
export function setupDarkmode() {
  const darkmodeButtons = document.getElementsByClassName("darkmode");
  
  for (const button of darkmodeButtons) {
    // 移除旧的监听器
    (button as HTMLElement).onclick = null;
    
    // 添加点击事件（使用 passive 提高性能）
    button.addEventListener("click", switchTheme, { passive: true });
  }

  // 监听系统主题变化
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeMediaQuery.addEventListener("change", themeChange);
}

// 自动初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupDarkmode);
} else {
  setupDarkmode();
}

export { switchTheme, emitThemeChangeEvent };

