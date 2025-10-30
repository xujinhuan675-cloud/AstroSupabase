/**
 * Knowledge Graph 组件
 * 使用 Quartz 辅助函数增强
 * 
 * 注意：此组件必须仅在客户端渲染（使用 client:load 或 client:visible）
 */

import React, { useEffect, useState, useRef } from 'react';
import type { GraphData, GraphNode, GraphLink } from '../scripts/graph-helpers';
import '../styles/quartz/graph.css';

// 动态导入 ForceGraph2D，避免 SSR 时访问 window
let ForceGraph2D: any = null;
if (typeof window !== 'undefined') {
  // 只在客户端导入
  import('react-force-graph-2d').then((mod) => {
    ForceGraph2D = mod.default;
  });
}

interface KnowledgeGraphProps {
  currentSlug?: string;
  height?: number;
  showLegend?: boolean;
}

export default function KnowledgeGraph({
  currentSlug,
  height = 600,
  showLegend = true,
}: KnowledgeGraphProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const [graphReady, setGraphReady] = useState(false);
  const graphRef = useRef<any>();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);

  useEffect(() => {
    // 确保在客户端环境
    if (typeof window === 'undefined') return;

    // 动态加载 graph-helpers（确保只在客户端执行）
    import('../scripts/graph-helpers').then(({ 
      fetchGraphData, 
      getVisitedNodes, 
      isDarkMode 
    }) => {
      // 初始化
      setVisitedNodes(getVisitedNodes());
      setDarkMode(isDarkMode());

      // 监听主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
      };
      mediaQuery.addEventListener('change', handleThemeChange);

      // 获取图谱数据
      fetchGraphData()
        .then(data => {
          setGraphData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching graph data:', err);
          setError(err.message);
          setLoading(false);
        });

      // 标记组件准备就绪
      setGraphReady(true);

      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
      };
    });
  }, []);

  useEffect(() => {
    // 当数据加载完成后，自动缩放到合适大小
    if (!loading && graphData.nodes.length > 0 && graphRef.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [loading, graphData]);

  const handleNodeClick = (node: any) => {
    if (typeof window === 'undefined') return;
    
    // 动态导入 saveVisitedNode
    import('../scripts/graph-helpers').then(({ saveVisitedNode, getVisitedNodes }) => {
      const slug = node.slug || node.id;
      saveVisitedNode(slug);
      setVisitedNodes(getVisitedNodes());
      window.location.href = `/articles/${slug}`;
    });
  };

  const handleNodeHover = (node: any) => {
    const highlights = new Set();
    const linkHighlights = new Set();
    
    if (node) {
      highlights.add(node.id);
      
      // 高亮相连的节点和链接
      graphData.links.forEach(link => {
        if (link.source === node.id) {
          highlights.add(link.target);
          linkHighlights.add(`${link.source}-${link.target}`);
        }
        if (link.target === node.id) {
          highlights.add(link.source);
          linkHighlights.add(`${link.source}-${link.target}`);
        }
      });
    }
    
    setHighlightNodes(highlights);
    setHighlightLinks(linkHighlights);
    setHoverNode(node || null);
  };

  if (loading) {
    return (
      <div className="graph">
        <h3>知识图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)'
          }}>
            加载中...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph">
        <h3>知识图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--danger, #db4242)'
          }}>
            加载失败: {error}
          </div>
        </div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="graph">
        <h3>知识图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)',
            gap: '0.5rem'
          }}>
            <p>暂无图谱数据</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
              创建文章并使用 [[双向链接]] 语法来构建知识网络
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 如果 ForceGraph2D 还未加载或组件未准备好，显示加载状态
  if (!ForceGraph2D || !graphReady) {
    return (
      <div className="graph">
        <h3>知识图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)'
          }}>
            初始化图谱组件...
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = darkMode ? '#7b97aa' : '#284b63';
  const secondaryColor = darkMode ? '#646464' : '#b8b8b8';
  const linkColorValue = darkMode ? '#393639' : '#e5e5e5';

  return (
    <div className="graph">
      <h3>知识图谱</h3>
      <div className="graph-outer" style={{ height: `${height}px` }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="title"
          nodeRelSize={6}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.title || node.text || String(node.id);
            const fontSize = 12 / globalScale;
            const isHighlight = highlightNodes.has(node.id);
            const isHover = hoverNode?.id === node.id;
            const isVisited = visitedNodes.has(node.slug || String(node.id));
            
            ctx.font = `${isHover ? 'bold' : 'normal'} ${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth + fontSize * 0.8, fontSize * 1.4];

            // 绘制节点圆圈
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            
            if (isHover) {
              ctx.fillStyle = primaryColor;
            } else if (isHighlight) {
              ctx.fillStyle = primaryColor;
            } else {
              ctx.fillStyle = isVisited ? primaryColor : secondaryColor;
            }
            ctx.fill();
            
            // 显示标签
            if (isHighlight || isHover || globalScale > 1.5) {
              // 绘制标签背景
              ctx.fillStyle = isHover 
                ? `${primaryColor}f0` 
                : isHighlight 
                  ? `${primaryColor}e0` 
                  : `${primaryColor}c0`;
              
              ctx.fillRect(
                node.x - bckgDimensions[0] / 2,
                node.y + 8,
                bckgDimensions[0],
                bckgDimensions[1]
              );

              // 绘制标签文本
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = darkMode ? '#ebebec' : '#faf8f8';
              ctx.fillText(label, node.x, node.y + 8 + bckgDimensions[1] / 2);
            }
          }}
          linkColor={(link: any) => {
            const linkId = `${link.source}-${link.target}`;
            return highlightLinks.has(linkId) ? primaryColor : linkColorValue;
          }}
          linkWidth={(link: any) => {
            const linkId = `${link.source}-${link.target}`;
            return highlightLinks.has(linkId) ? 2 : 1;
          }}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={(link: any) => {
            const linkId = `${link.source}-${link.target}`;
            return highlightLinks.has(linkId) ? primaryColor : linkColorValue;
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          cooldownTicks={100}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      </div>
      
      {showLegend && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          border: '1px solid var(--lightgray)',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--light)',
          fontSize: '0.875rem',
          color: 'var(--darkgray)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: primaryColor }}></div>
                <span>已访问</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: secondaryColor }}></div>
                <span>未访问</span>
              </div>
            </div>
            <div>
              共 <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{graphData.nodes.length}</span> 篇文章，
              <span style={{ fontWeight: 600, color: 'var(--secondary)' }}> {graphData.links.length}</span> 个链接
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '0.75rem', marginBottom: 0 }}>
            💡 提示：点击节点跳转 | 拖拽调整位置 | 滚轮缩放 | 悬停高亮关联
          </p>
        </div>
      )}
    </div>
  );
}
