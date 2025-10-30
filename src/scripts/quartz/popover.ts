/**
 * Popover 悬浮预览脚本
 * 从 Quartz 迁移
 * 
 * 功能：鼠标悬停链接时显示文章预览
 */

import { computePosition, flip, inline, shift } from '@floating-ui/dom';

const p = new DOMParser();
let activeAnchor: HTMLAnchorElement | null = null;

async function mouseEnterHandler(
  this: HTMLAnchorElement,
  event: MouseEvent
) {
  const { clientX, clientY } = event;
  const link = (activeAnchor = this);
  
  // 跳过标记为不显示 popover 的链接
  if (link.dataset.noPopover === 'true') {
    return;
  }

  async function setPosition(popoverElement: HTMLElement) {
    const { x, y } = await computePosition(link, popoverElement, {
      strategy: 'fixed',
      middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
    });
    Object.assign(popoverElement.style, {
      transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
    });
  }

  function showPopover(popoverElement: HTMLElement) {
    clearActivePopover();
    popoverElement.classList.add('active-popover');
    setPosition(popoverElement);

    // 如果有 hash，滚动到对应位置
    if (hash !== '') {
      const targetAnchor = `#popover-internal-${hash.slice(1)}`;
      const heading = popoverInner.querySelector(targetAnchor) as HTMLElement | null;
      if (heading) {
        popoverInner.scroll({ top: heading.offsetTop - 12, behavior: 'instant' as ScrollBehavior });
      }
    }
  }

  const targetUrl = new URL(link.href);
  const hash = decodeURIComponent(targetUrl.hash);
  targetUrl.hash = '';
  targetUrl.search = '';
  const popoverId = `popover-${encodeURIComponent(link.pathname)}`;
  const prevPopoverElement = document.getElementById(popoverId);

  // 如果已经有 popover，直接显示
  if (prevPopoverElement) {
    showPopover(prevPopoverElement);
    return;
  }

  // 获取目标页面内容
  let response: Response;
  try {
    response = await fetch(targetUrl.toString());
  } catch (err) {
    console.error('Failed to fetch popover content:', err);
    return;
  }

  if (!response.ok) return;

  const contentType = response.headers.get('Content-Type') || '';
  const [contentTypeCategory, typeInfo] = contentType.split('/');

  const popoverElement = document.createElement('div');
  popoverElement.id = popoverId;
  popoverElement.classList.add('popover');
  
  const popoverInner = document.createElement('div');
  popoverInner.classList.add('popover-inner');
  popoverInner.dataset.contentType = contentType;
  popoverElement.appendChild(popoverInner);

  // 根据内容类型处理
  switch (contentTypeCategory) {
    case 'image':
      const img = document.createElement('img');
      img.src = targetUrl.toString();
      img.alt = targetUrl.pathname;
      popoverInner.appendChild(img);
      break;
      
    case 'application':
      if (typeInfo === 'pdf') {
        const pdf = document.createElement('iframe');
        pdf.src = targetUrl.toString();
        popoverInner.appendChild(pdf);
      }
      break;
      
    default:
      // HTML 内容
      const contents = await response.text();
      const html = p.parseFromString(contents, 'text/html');
      
      // 修正相对 URL
      const base = html.querySelector('base');
      if (!base) {
        const baseEl = document.createElement('base');
        baseEl.href = targetUrl.origin + targetUrl.pathname;
        html.head.appendChild(baseEl);
      }
      
      // 给所有 ID 添加前缀，避免冲突
      html.querySelectorAll('[id]').forEach((el) => {
        const targetID = `popover-internal-${el.id}`;
        el.id = targetID;
      });
      
      // 提取标记为 popover-hint 的内容
      const elts = [...html.getElementsByClassName('popover-hint')];
      if (elts.length === 0) return;
      
      elts.forEach((elt) => popoverInner.appendChild(elt));
  }

  // 检查是否已经存在（避免重复添加）
  if (document.getElementById(popoverId)) {
    return;
  }

  document.body.appendChild(popoverElement);
  
  // 确保当前链接还是活动的
  if (activeAnchor !== link) {
    return;
  }

  showPopover(popoverElement);
}

function clearActivePopover() {
  activeAnchor = null;
  const allPopoverElements = document.querySelectorAll('.popover');
  allPopoverElements.forEach((popoverElement) => 
    popoverElement.classList.remove('active-popover')
  );
}

export function setupPopover() {
  // 自动标记内部链接
  const allLinks = [...document.querySelectorAll('a')] as HTMLAnchorElement[];
  for (const link of allLinks) {
    // 检查是否是内部链接
    if (link.href && (
      link.href.includes('/articles/') ||
      link.href.includes('/tags/') ||
      link.pathname.startsWith('/articles/') ||
      link.pathname.startsWith('/tags/')
    )) {
      link.classList.add('internal');
    }
  }
  
  // 为所有内部链接添加 popover 功能
  const links = [...document.querySelectorAll('a.internal')] as HTMLAnchorElement[];
  
  for (const link of links) {
    // 移除旧事件（如果有）
    link.removeEventListener('mouseenter', mouseEnterHandler as EventListener);
    link.removeEventListener('mouseleave', clearActivePopover);
    
    // 添加新事件
    link.addEventListener('mouseenter', mouseEnterHandler as EventListener);
    link.addEventListener('mouseleave', clearActivePopover);
  }
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPopover);
} else {
  setupPopover();
}

// 页面导航后重新初始化
document.addEventListener('astro:page-load', setupPopover);

