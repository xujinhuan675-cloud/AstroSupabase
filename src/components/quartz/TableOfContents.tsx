/**
 * TableOfContents 组件
 * 从 Quartz 迁移
 * 
 * 功能：文章目录导航
 */

import React, { useEffect, useState } from 'react';
import '../../styles/quartz/toc.css';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 只从文章正文内容中提取标题（排除侧边栏模块）
    const contentArea = document.querySelector('article .popover-hint') || 
                        document.querySelector('article .prose') ||
                        document.querySelector('article');
    
    if (!contentArea) {
      setTocItems([]);
      return;
    }
    
    const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const items: TocItem[] = [];

    headings.forEach((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-') || '';
      }

      const level = parseInt(heading.tagName.substring(1));
      items.push({
        id: heading.id,
        text: heading.textContent || '',
        level: level
      });
    });

    setTocItems(items);

    // 监听滚动，高亮当前标题
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (let i = items.length - 1; i >= 0; i--) {
        const element = document.getElementById(items[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveId(items[i].id);
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

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className="toc">
      <button className="toc-toggle">
        <h3>目录</h3>
      </button>
      <div className="toc-content">
        <ul className="overflow">
          {tocItems.map((item) => (
            <li
              key={item.id}
              className={`depth-${item.level} ${activeId === item.id ? 'active' : ''}`}
              style={{ paddingLeft: `${(item.level - 1) * 1}rem` }}
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.id);
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

