/**
 * Quartz Graph 组件（适配版）
 * 适配 AstroSupabase 的 React 组件版本
 */

import React, { useEffect, useRef } from 'react';
import type { D3Config } from '../../types/graph-quartz';
import { initGraph } from './scripts/graph-inline';
import { graphConfig } from '../../config';
import '../../styles/quartz/graph-quartz.css';

export interface QuartzGraphProps {
  /** 当前文章的 slug */
  currentSlug?: string;
  /** 局部图谱配置 */
  localGraph?: Partial<D3Config>;
  /** 全局图谱配置 */
  globalGraph?: Partial<D3Config>;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 自定义标题 */
  title?: string;
  /** 容器高度 */
  height?: number;
  /** 是否为全局图谱模式 */
  isGlobal?: boolean;
}

// 使用集中管理的配置
const defaultLocalGraph = graphConfig.defaultLocal;
const defaultGlobalGraph = graphConfig.defaultGlobal;

export default function QuartzGraph({
  currentSlug,
  localGraph,
  globalGraph,
  showTitle = true,
  title = '知识图谱',
  height,
  isGlobal = false,
}: QuartzGraphProps) {
  const localContainerRef = useRef<HTMLDivElement>(null);
  const globalContainerRef = useRef<HTMLDivElement>(null);
  const globalOuterRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const hideGlobalGraphRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const slug = currentSlug || '';

    // 清理之前的图谱
    cleanupRef.current.forEach(cleanup => cleanup());
    cleanupRef.current = [];

    // 初始化局部图谱
    if (localContainerRef.current && !isGlobal) {
      const localConfig = { ...defaultLocalGraph, ...localGraph };
      localContainerRef.current.setAttribute('data-cfg', JSON.stringify(localConfig));
      
      initGraph(localContainerRef.current, slug)
        .then(cleanup => {
          if (cleanup) cleanupRef.current.push(cleanup);
        })
        .catch(err => {
          console.error('Failed to initialize local graph:', err);
        });
    }

    // 初始化全局图谱容器（如果存在）
    if (globalContainerRef.current && globalGraph) {
      const globalConfig = { ...defaultGlobalGraph, ...globalGraph };
      globalContainerRef.current.setAttribute('data-cfg', JSON.stringify(globalConfig));
    }

    // 设置全局图谱按钮事件
    const globalIconButtons = document.querySelectorAll('.global-graph-icon');
    globalIconButtons.forEach(icon => {
      const handleClick = () => {
        if (globalOuterRef.current) {
          globalOuterRef.current.classList.add('active');
          const sidebar = globalOuterRef.current.closest('.sidebar') as HTMLElement;
          if (sidebar) {
            sidebar.style.zIndex = '1';
          }

          // 初始化全局图谱
          if (globalContainerRef.current && slug) {
            const globalConfig = { ...defaultGlobalGraph, ...globalGraph };
            globalContainerRef.current.setAttribute('data-cfg', JSON.stringify(globalConfig));
            
            initGraph(globalContainerRef.current, slug)
              .then(cleanup => {
                if (cleanup) cleanupRef.current.push(cleanup);
              })
              .catch(err => {
                console.error('Failed to initialize global graph:', err);
              });
          }
        }
      };

      icon.addEventListener('click', handleClick);
      cleanupRef.current.push(() => icon.removeEventListener('click', handleClick));
    });

    // 隐藏全局图谱的处理
    const hideGlobalGraph = () => {
      if (globalOuterRef.current) {
        globalOuterRef.current.classList.remove('active');
        const sidebar = globalOuterRef.current.closest('.sidebar') as HTMLElement;
        if (sidebar) {
          sidebar.style.zIndex = '';
        }
        // 清理全局图谱
        cleanupRef.current.forEach(cleanup => cleanup());
        cleanupRef.current = [];
      }
    };
    hideGlobalGraphRef.current = hideGlobalGraph;

    // 点击背景关闭全局图谱
    if (globalOuterRef.current) {
      const handleBackgroundClick = (e: MouseEvent) => {
        if (e.target === globalOuterRef.current) {
          hideGlobalGraph();
        }
      };
      globalOuterRef.current.addEventListener('click', handleBackgroundClick);
      cleanupRef.current.push(() => {
        globalOuterRef.current?.removeEventListener('click', handleBackgroundClick);
      });
    }

    // ESC 键关闭全局图谱
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && globalOuterRef.current?.classList.contains('active')) {
        hideGlobalGraph();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    cleanupRef.current.push(() => document.removeEventListener('keydown', handleKeyDown));

    // Ctrl+G 快捷键切换全局图谱
    const handleGlobalGraphShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        if (globalOuterRef.current) {
          const isActive = globalOuterRef.current.classList.contains('active');
          if (isActive) {
            hideGlobalGraph();
          } else {
            globalIconButtons[0]?.dispatchEvent(new Event('click'));
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalGraphShortcut);
    cleanupRef.current.push(() => document.removeEventListener('keydown', handleGlobalGraphShortcut));

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, [currentSlug, localGraph, globalGraph, isGlobal]);

  // 主题变化时重新渲染
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleThemeChange = () => {
      // 重新初始化图谱以应用新主题
      if (localContainerRef.current && currentSlug) {
        const localConfig = { ...defaultLocalGraph, ...localGraph };
        localContainerRef.current.setAttribute('data-cfg', JSON.stringify(localConfig));
        
        initGraph(localContainerRef.current, currentSlug)
          .then(cleanup => {
            cleanupRef.current.forEach(c => c());
            cleanupRef.current = [];
            if (cleanup) cleanupRef.current.push(cleanup);
          })
          .catch(err => {
            console.error('Failed to reinitialize graph on theme change:', err);
          });
      }
    };

    // 监听主题变化事件（如果 Quartz 主题系统支持）
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [currentSlug, localGraph]);

  if (isGlobal) {
    return (
      <div className="graph global-graph-only">
        {showTitle && <h3>{title}</h3>}
        <div className="global-graph-outer" ref={globalOuterRef}>
          <div 
            className="global-graph-container" 
            ref={globalContainerRef}
            style={height ? { height: `${height}px` } : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="graph">
      {showTitle && <h3>{title}</h3>}
      <div className="graph-outer" style={height ? { height: `${height}px` } : undefined}>
        <div className="graph-container" ref={localContainerRef} />
        <button className="global-graph-icon" aria-label="Global Graph">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 55 55"
            fill="currentColor"
            xmlSpace="preserve"
          >
            <path
              d="M49,0c-3.309,0-6,2.691-6,6c0,1.035,0.263,2.009,0.726,2.86l-9.829,9.829C32.542,17.634,30.846,17,29,17
              s-3.542,0.634-4.898,1.688l-7.669-7.669C16.785,10.424,17,9.74,17,9c0-2.206-1.794-4-4-4S9,6.794,9,9s1.794,4,4,4
              c0.74,0,1.424-0.215,2.019-0.567l7.669,7.669C21.634,21.458,21,23.154,21,25s0.634,3.542,1.688,4.897L10.024,42.562
              C8.958,41.595,7.549,41,6,41c-3.309,0-6,2.691-6,6s2.691,6,6,6s6-2.691,6-6c0-1.035-0.263-2.009-0.726-2.86l12.829-12.829
              c1.106,0.86,2.44,1.436,3.898,1.619v10.16c-2.833,0.478-5,2.942-5,5.91c0,3.309,2.691,6,6,6s6-2.691,6-6c0-2.967-2.167-5.431-5-5.91
              v-10.16c1.458-0.183,2.792-0.759,3.898-1.619l7.669,7.669C41.215,39.576,41,40.26,41,41c0,2.206,1.794,4,4,4s4-1.794,4-4
              s-1.794-4-4-4c-0.74,0-1.424,0.215-2.019,0.567l-7.669-7.669C36.366,28.542,37,26.846,37,25s-0.634-3.542-1.688-4.897l9.665-9.665
              C46.042,11.405,47.451,12,49,12c3.309,0,6-2.691,6-6S52.309,0,49,0z M11,9c0-1.103,0.897-2,2-2s2,0.897,2,2s-0.897,2-2,2
              S11,10.103,11,9z M6,51c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S8.206,51,6,51z M33,49c0,2.206-1.794,4-4,4s-4-1.794-4-4
              s1.794-4,4-4S33,46.794,33,49z M29,31c-3.309,0-6-2.691-6-6s2.691-6,6-6s6,2.691,6,6S32.309,31,29,31z M47,41c0,1.103-0.897,2-2,2
              s-2-0.897-2-2s0.897-2,2-2S47,39.897,47,41z M49,10c-2.206,0-4-1.794-4-4s1.794-4,4-4s4,1.794,4,4S51.206,10,49,10z"
            />
          </svg>
        </button>
      </div>
      <div className="global-graph-outer" ref={globalOuterRef}>
        <button 
          className="global-graph-close"
          onClick={() => hideGlobalGraphRef.current?.()}
          aria-label="关闭图谱"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="global-graph-container" ref={globalContainerRef} />
      </div>
    </div>
  );
}
