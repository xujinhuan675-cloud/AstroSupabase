/**
 * useViewport - 视口状态检测 Hook
 * 用于响应式布局的视口信息获取
 */
import { useState, useEffect, useCallback } from 'react';

export interface ViewportState {
  width: number;
  height: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 640,
  lg: 768,
  xl: 1024,
  '2xl': 1200,
} as const;

const getBreakpoint = (width: number): ViewportState['breakpoint'] => {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

const getViewportState = (): ViewportState => {
  if (typeof window === 'undefined') {
    return {
      width: 375,
      height: 667,
      breakpoint: 'xs',
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      orientation: 'portrait',
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const breakpoint = getBreakpoint(width);

  return {
    width,
    height,
    breakpoint,
    isMobile: width < BREAKPOINTS.lg,
    isTablet: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isDesktop: width >= BREAKPOINTS.xl,
    orientation: width > height ? 'landscape' : 'portrait',
  };
};

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(getViewportState);

  const handleResize = useCallback(() => {
    setViewport(getViewportState());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // 初始化时更新一次
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return viewport;
}

export { BREAKPOINTS };
