/**
 * TOC 目录滚动高亮脚本
 * 从 Quartz 迁移
 * 
 * 功能：根据滚动位置高亮当前标题
 */

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const slug = entry.target.id;
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`);
    const windowHeight = entry.rootBounds?.height;
    
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => 
          tocEntryElement.classList.add('in-view')
        );
      } else {
        tocEntryElements.forEach((tocEntryElement) => 
          tocEntryElement.classList.remove('in-view')
        );
      }
    }
  }
});

function toggleToc(this: HTMLElement) {
  this.classList.toggle('collapsed');
  this.setAttribute(
    'aria-expanded',
    this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true',
  );
  
  const content = this.nextElementSibling as HTMLElement | undefined;
  if (!content) return;
  content.classList.toggle('collapsed');
}

export function setupToc() {
  // 设置 TOC 折叠/展开
  for (const toc of document.getElementsByClassName('toc')) {
    const button = toc.querySelector('.toc-header');
    const content = toc.querySelector('.toc-content');
    
    if (!button || !content) return;
    
    button.removeEventListener('click', toggleToc as EventListener);
    button.addEventListener('click', toggleToc as EventListener);
  }
  
  // 更新 TOC 高亮
  observer.disconnect();
  const contentArea = document.querySelector('article .prose');
  if (!contentArea) return;

  const pageTitle = (document.querySelector('article > .popover-hint header h1')?.textContent || '').trim();

  const headers = Array.from(contentArea.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
    .filter((header) => {
      const level = parseInt(header.tagName.substring(1));
      if (level !== 1) return true;
      const text = (header.textContent || '').trim();
      return !(pageTitle.length > 0 && text === pageTitle);
    });

  headers.forEach((header) => observer.observe(header));
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupToc);
} else {
  setupToc();
}

// 页面导航后重新初始化
document.addEventListener('astro:page-load', setupToc);

