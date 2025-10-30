/**
 * Callout 客户端脚本
 * 从 Quartz 迁移
 * 
 * 功能：可折叠的 Callout 提示框
 */

function toggleCallout(this: HTMLElement) {
  const outerBlock = this.parentElement!;
  outerBlock.classList.toggle("is-collapsed");
  
  const content = outerBlock.getElementsByClassName("callout-content")[0] as HTMLElement;
  if (!content) return;
  
  const collapsed = outerBlock.classList.contains("is-collapsed");
  content.style.gridTemplateRows = collapsed ? "0fr" : "1fr";
}

function setupCallout() {
  const collapsible = document.getElementsByClassName(
    "callout is-collapsible"
  ) as HTMLCollectionOf<HTMLElement>;
  
  for (const div of collapsible) {
    const title = div.getElementsByClassName("callout-title")[0] as HTMLElement;
    const content = div.getElementsByClassName("callout-content")[0] as HTMLElement;
    
    if (!title || !content) continue;
    
    // 移除旧的事件监听器（如果存在）
    title.removeEventListener("click", toggleCallout);
    
    // 添加新的事件监听器
    title.addEventListener("click", toggleCallout);
    
    // 设置初始状态
    const collapsed = div.classList.contains("is-collapsed");
    content.style.gridTemplateRows = collapsed ? "0fr" : "1fr";
  }
}

// 在 DOMContentLoaded 时设置
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCallout);
} else {
  setupCallout();
}

// 导出用于动态内容
export { setupCallout };

