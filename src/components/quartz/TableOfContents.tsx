import React, { useEffect, useState } from 'react';
import '../../styles/quartz/toc.css';

interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export default function TableOfContents() {
  const [tocTree, setTocTree] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 只从 Markdown 渲染后的正文内容中提取标题
    // 注意：文章页顶部的页面标题不在 .prose 内，避免被误识别为目录项
    const contentArea = document.querySelector('article .prose');

    const pageTitle = (document.querySelector('article > .popover-hint header h1')?.textContent || '').trim();

    if (!contentArea) {
      setTocTree([]);
      return;
    }

    const headings = contentArea.querySelectorAll('h1, h2, h3, h4');
    const root: TocItem[] = [];
    const stack: TocItem[] = [];

    headings.forEach((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
      }

      const level = parseInt(heading.tagName.substring(1));
      if (level > 4) return;

      const text = (heading.textContent || '').trim();

      // 如果正文里写了与页面标题相同的 `# {title}`，则在目录中自动忽略这一项
      if (level === 1 && pageTitle.length > 0 && text === pageTitle) {
        return;
      }

      const item: TocItem = {
        id: heading.id,
        text,
        level: level,
        children: []
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(item);
      } else {
        stack[stack.length - 1].children.push(item);
      }
      stack.push(item);
    });

    setTocTree(root);

    // 默认展开所有（或者可以设置为只展开一级）

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      const allHeadings = Array.from(headings);

      for (let i = allHeadings.length - 1; i >= 0; i--) {
        const element = allHeadings[i] as HTMLElement;
        if (element.offsetTop <= scrollPosition) {
          setActiveId(element.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsed(newCollapsed);
  };

  const renderTree = (items: TocItem[]) => {
    return (
      <ul className="toc-list">
        {items.map((item) => (
          <li key={item.id} className={`depth-${item.level} ${activeId === item.id ? 'active' : ''}`}>
            <div className="toc-item-container" style={{ display: 'flex', alignItems: 'center' }}>
              {item.children.length > 0 && (
                <button
                  className={`toc-collapse-btn ${collapsed.has(item.id) ? 'collapsed' : ''}`}
                  onClick={(e) => toggleCollapse(item.id, e)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '0 4px',
                    fontSize: '0.8rem',
                    color: 'var(--gray)',
                    transform: collapsed.has(item.id) ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  ▼
                </button>
              )}
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.id);
                }}
                style={{ flex: 1, paddingLeft: item.children.length > 0 ? '0' : '1.2rem' }}
              >
                {item.text}
              </a>
            </div>

            {item.children.length > 0 && !collapsed.has(item.id) && (
              renderTree(item.children)
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (tocTree.length === 0) {
    return null;
  }

  return (
    <div className="toc">
      <button className="toc-toggle">
        <h3>目录</h3>
      </button>
      <div className="toc-content">
        {renderTree(tocTree)}
      </div>
    </div>
  );
}

