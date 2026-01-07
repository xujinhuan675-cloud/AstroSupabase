/**
 * CollapsibleSidebar - 可折叠侧边栏组件
 * 移动端显示为手风琴样式，桌面端正常显示
 */
import { useState, useCallback, type ReactNode } from 'react';
import { useIsMobile } from '../hooks';

interface CollapsibleSidebarProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSidebar({
  title,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // 桌面端直接显示内容
  if (!isMobile) {
    return (
      <div className={`sidebar-section ${className}`}>
        <h3 className="sidebar-section-title-desktop">{title}</h3>
        <div className="sidebar-section-content">{children}</div>
      </div>
    );
  }

  // 移动端显示可折叠样式
  return (
    <div className={`sidebar-section ${isOpen ? '' : 'collapsed'} ${className}`}>
      <button
        className="sidebar-section-header"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={`sidebar-content-${title.replace(/\s+/g, '-')}`}
      >
        <span className="sidebar-section-title">{title}</span>
        <span className="sidebar-section-toggle" aria-hidden="true">
          ▼
        </span>
      </button>
      <div
        id={`sidebar-content-${title.replace(/\s+/g, '-')}`}
        className="sidebar-section-content"
        role="region"
        aria-labelledby={`sidebar-header-${title.replace(/\s+/g, '-')}`}
      >
        {children}
      </div>
    </div>
  );
}
