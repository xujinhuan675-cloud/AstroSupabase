import { useEffect, useState } from 'react';
import '../../styles/quartz/toc.css';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

type ScrollTarget = Window | HTMLElement;

interface TableOfContentsProps {
  variant?: 'desktop' | 'mobile';
  showHeader?: boolean;
  closeOnNavigate?: boolean;
}

function isWindowTarget(target: ScrollTarget): target is Window {
  return target === window;
}

function closeMobileTocPanel() {
  const panel = document.querySelector('.mobile-toc-panel');
  const toggle = document.querySelector('.mobile-toc-toggle');

  panel?.classList.remove('active');
  panel?.setAttribute('aria-hidden', 'true');
  toggle?.classList.remove('active');
  toggle?.setAttribute('aria-expanded', 'false');
}

export default function TableOfContents({
  variant = 'desktop',
  showHeader = variant === 'desktop',
  closeOnNavigate = variant === 'mobile',
}: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [hasResolved, setHasResolved] = useState(false);

  useEffect(() => {
    // 只从 Markdown 渲染后的正文内容中提取标题
    // 注意：文章页顶部的页面标题不在 .prose 内，避免被误识别为目录项
    const contentArea = document.querySelector('article .prose');
    const pageTitle = (document.querySelector('article > .popover-hint header h1')?.textContent || '').trim();

    if (!contentArea) {
      setTocItems([]);
      setHasResolved(true);
      return;
    }

    const headings = Array.from(contentArea.querySelectorAll('h1, h2, h3, h4')) as HTMLElement[];
    const tocHeadings = headings.filter((heading) => {
      const level = parseInt(heading.tagName.substring(1), 10);
      if (Number.isNaN(level) || level > 4) return false;

      const text = (heading.textContent || '').trim();
      if (level === 1 && pageTitle.length > 0 && text === pageTitle) {
        return false;
      }
      return true;
    });

    if (tocHeadings.length === 0) {
      setTocItems([]);
      setHasResolved(true);
      return;
    }

    const minLevel = tocHeadings.reduce((min, heading) => {
      const level = parseInt(heading.tagName.substring(1), 10);
      return Math.min(min, level);
    }, 6);

    const items = tocHeadings.map((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
      }

      const level = parseInt(heading.tagName.substring(1), 10);
      const text = (heading.textContent || '').trim();
      const depth = Math.min(Math.max(level - minLevel + 1, 1), 4);

      return {
        id: heading.id,
        text,
        depth,
      };
    });

    setTocItems(items);
    setHasResolved(true);

    let activeScrollTarget: ScrollTarget;

    const getScrollTarget = (): ScrollTarget => {
      const center = document.querySelector<HTMLElement>('.center');
      if (!center) return window;

      const style = window.getComputedStyle(center);
      const canCenterScroll =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        center.scrollHeight > center.clientHeight + 1;

      return canCenterScroll ? center : window;
    };

    const getScrollTop = (target: ScrollTarget): number => {
      if (isWindowTarget(target)) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return target.scrollTop;
    };

    const getElementTop = (target: ScrollTarget, element: HTMLElement): number => {
      if (isWindowTarget(target)) {
        return element.getBoundingClientRect().top + window.scrollY;
      }

      const targetRect = target.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      return elementRect.top - targetRect.top + target.scrollTop;
    };

    const updateActiveSection = () => {
      const scrollTop = getScrollTop(activeScrollTarget);
      const indicatorOffset = isWindowTarget(activeScrollTarget) ? 100 : 70;
      const position = scrollTop + indicatorOffset;

      let nextActiveId = '';
      for (let i = tocHeadings.length - 1; i >= 0; i--) {
        const element = tocHeadings[i];
        if (getElementTop(activeScrollTarget, element) <= position) {
          nextActiveId = element.id;
          break;
        }
      }

      if (!nextActiveId && tocHeadings.length > 0) {
        nextActiveId = tocHeadings[0].id;
      }

      setActiveId(nextActiveId);
    };

    const onScroll = () => {
      updateActiveSection();
    };

    const bindScrollTarget = () => {
      const next = getScrollTarget();
      if (activeScrollTarget === next) return;

      if (activeScrollTarget) {
        activeScrollTarget.removeEventListener('scroll', onScroll);
      }

      activeScrollTarget = next;
      activeScrollTarget.addEventListener('scroll', onScroll, { passive: true });
      updateActiveSection();
    };

    activeScrollTarget = getScrollTarget();
    activeScrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', bindScrollTarget, { passive: true });
    updateActiveSection();

    return () => {
      activeScrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', bindScrollTarget);
    };
  }, []);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const center = document.querySelector<HTMLElement>('.center');
    const style = center ? window.getComputedStyle(center) : null;
    const canCenterScroll = !!center && !!style &&
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      center.scrollHeight > center.clientHeight + 1;

    if (canCenterScroll && center) {
      const top = element.getBoundingClientRect().top - center.getBoundingClientRect().top + center.scrollTop - 16;
      center.scrollTo({ top, behavior: 'smooth' });
    } else {
      const navOffset = 80;
      const top = element.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    if (closeOnNavigate) {
      closeMobileTocPanel();
    }
  };

  if (!hasResolved) {
    return null;
  }

  if (tocItems.length === 0) {
    if (variant === 'mobile') {
      return (
        <div className={`toc toc-${variant} toc-empty`}>
          <div className="toc-content">
            <p className="mobile-toc-empty">暂无目录</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`toc toc-${variant}`}>
      {showHeader && (
        <button className="toc-toggle">
          <h3>目录</h3>
        </button>
      )}
      <div className="toc-content">
        <ul className="toc-list">
          {tocItems.map((item) => (
            <li key={item.id} className={`toc-item depth-${item.depth} ${activeId === item.id ? 'active' : ''}`}>
              <div className="toc-item-container">
                <a
                  className="toc-link"
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleClick(item.id);
                  }}
                >
                  {item.text}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
