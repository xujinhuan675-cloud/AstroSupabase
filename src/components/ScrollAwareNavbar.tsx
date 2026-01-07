/**
 * ScrollAwareNavbar - 滚动感知导航栏组件
 * 向下滚动时隐藏，向上滚动时显示
 */
import { useState, useEffect, useCallback, type ReactNode } from 'react';

interface ScrollAwareNavbarProps {
  threshold?: number;
  children: ReactNode;
  className?: string;
}

export default function ScrollAwareNavbar({
  threshold = 50,
  children,
  className = '',
}: ScrollAwareNavbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // 在页面顶部时始终显示
    if (currentScrollY < threshold) {
      setIsVisible(true);
      setLastScrollY(currentScrollY);
      return;
    }

    // 判断滚动方向
    const scrollDiff = currentScrollY - lastScrollY;
    
    if (scrollDiff > 10) {
      // 向下滚动超过阈值，隐藏导航栏
      setIsVisible(false);
    } else if (scrollDiff < -10) {
      // 向上滚动超过阈值，显示导航栏
      setIsVisible(true);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, threshold]);

  useEffect(() => {
    // 使用 passive 监听器提升性能
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div
      className={`scroll-aware-navbar ${isVisible ? 'visible' : 'hidden'} ${className}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      {children}
    </div>
  );
}
