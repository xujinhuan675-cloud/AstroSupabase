/**
 * Darkmode 客户端脚本
 * 从 Quartz 迁移
 * 
 * 功能：
 * - 主题切换逻辑
 * - 持久化存储
 * - 系统主题检测
 */

// 初始化主题（在 DOM 加载前）
const userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
const currentTheme = localStorage.getItem("theme") ?? userPref;
document.documentElement.setAttribute("saved-theme", currentTheme);

// 发送主题变更事件
const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event = new CustomEvent("themechange", {
    detail: { theme },
  });
  document.dispatchEvent(event);
};

// 切换主题
const switchTheme = () => {
  const newTheme =
    document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("saved-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  emitThemeChangeEvent(newTheme);
};

// 系统主题变化监听
const themeChange = (e: MediaQueryListEvent) => {
  const newTheme = e.matches ? "dark" : "light";
  document.documentElement.setAttribute("saved-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  emitThemeChangeEvent(newTheme);
};

// 设置暗色模式按钮
export function setupDarkmode() {
  const darkmodeButtons = document.getElementsByClassName("darkmode");
  
  for (const button of darkmodeButtons) {
    // 移除旧的监听器
    (button as HTMLElement).onclick = null;
    
    // 添加点击事件
    button.addEventListener("click", switchTheme);
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

