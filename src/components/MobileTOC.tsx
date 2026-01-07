/**
 * MobileTOC - 移动端目录导航组件
 * 固定在底部的目录按钮，点击弹出目录列表
 */
import { useState, useCallback, useEffect } from 'react';
import { useIsMobile } from '../hooks';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface MobileTOCProps {
  headings: Heading[];
  currentSection?: string;
}

export default function MobileTOC({ headings, currentSection }: MobileTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(currentSection || '');
  const isMobile = useIsMobile();

  // 监听滚动更新当前章节
  useEffect(() => {
    if (!isMobile || headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-64px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings, isMobile]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsOpen(false);
    }
  }, []);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-toc')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // 非移动端或无标题时不显示
  if (!isMobile || headings.length === 0) return null;

  return (
    <div className="mobile-toc">
      {/* 目录按钮 */}
      <button
        className="mobile-toc-button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label="目录导航"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>目录</span>
      </button>

      {/* 目录弹出层 */}
      {isOpen && (
        <div className="mobile-toc-popup">
          <div className="mobile-toc-header">
            <span>目录</span>
            <button
              className="mobile-toc-close"
              onClick={() => setIsOpen(false)}
              aria-label="关闭目录"
            >
              ✕
            </button>
          </div>
          <nav className="mobile-toc-nav">
            <ul className="mobile-toc-list">
              {headings.map(({ id, text, level }) => (
                <li key={id} className={`mobile-toc-item level-${level}`}>
                  <button
                    className={`mobile-toc-link ${activeId === id ? 'active' : ''}`}
                    onClick={() => handleItemClick(id)}
                  >
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <style>{`
        .mobile-toc {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 50;
        }

        .mobile-toc-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--secondary, #6366f1);
          color: white;
          border: none;
          border-radius: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          min-height: 44px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .mobile-toc-button:active {
          transform: scale(0.95);
        }

        .mobile-toc-popup {
          position: absolute;
          bottom: calc(100% + 0.75rem);
          right: 0;
          width: 280px;
          max-height: 60vh;
          background: var(--light, #fff);
          border: 1px solid var(--lightgray, #e5e7eb);
          border-radius: 0.75rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mobile-toc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--lightgray, #e5e7eb);
          font-weight: 600;
          color: var(--dark, #1f2937);
        }

        .mobile-toc-close {
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          color: var(--gray, #6b7280);
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-toc-nav {
          max-height: calc(60vh - 50px);
          overflow-y: auto;
        }

        .mobile-toc-list {
          list-style: none;
          margin: 0;
          padding: 0.5rem 0;
        }

        .mobile-toc-item {
          margin: 0;
        }

        .mobile-toc-item.level-2 {
          padding-left: 0;
        }

        .mobile-toc-item.level-3 {
          padding-left: 1rem;
        }

        .mobile-toc-item.level-4 {
          padding-left: 2rem;
        }

        .mobile-toc-link {
          display: block;
          width: 100%;
          padding: 0.625rem 1rem;
          text-align: left;
          background: none;
          border: none;
          color: var(--darkgray, #4b5563);
          font-size: 0.875rem;
          cursor: pointer;
          min-height: 44px;
          transition: background 0.2s ease;
        }

        .mobile-toc-link:hover,
        .mobile-toc-link:active {
          background: var(--highlight, #f3f4f6);
        }

        .mobile-toc-link.active {
          color: var(--secondary, #6366f1);
          font-weight: 500;
          background: var(--highlight, #f3f4f6);
        }
      `}</style>
    </div>
  );
}
