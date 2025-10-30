/**
 * Callout 折叠展开脚本
 * 从 Quartz 迁移
 * 
 * 功能：Callout 内容块的折叠/展开交互
 */

function toggleCallout(this: HTMLElement) {
  const outerBlock = this.parentElement!;
  outerBlock.classList.toggle('is-collapsed');
  
  const content = outerBlock.getElementsByClassName('callout-content')[0] as HTMLElement;
  if (!content) return;
  
  const collapsed = outerBlock.classList.contains('is-collapsed');
  content.style.gridTemplateRows = collapsed ? '0fr' : '1fr';
}

export function setupCallout() {
  const collapsible = document.getElementsByClassName(
    'callout is-collapsible',
  ) as HTMLCollectionOf<HTMLElement>;
  
  for (const div of collapsible) {
    const title = div.getElementsByClassName('callout-title')[0] as HTMLElement;
    const content = div.getElementsByClassName('callout-content')[0] as HTMLElement;
    
    if (!title || !content) continue;
    
    title.removeEventListener('click', toggleCallout);
    title.addEventListener('click', toggleCallout);
    
    const collapsed = div.classList.contains('is-collapsed');
    content.style.gridTemplateRows = collapsed ? '0fr' : '1fr';
  }
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupCallout);
} else {
  setupCallout();
}

// 页面导航后重新初始化
document.addEventListener('astro:page-load', setupCallout);

