/**
 * 局部知识图谱组件
 * 显示当前文章及其直接相关的文章节点（深度为1或2）
 * 适合放在文章详情页的右侧栏
 */

import React, { useEffect, useState, useRef } from 'react';
import type { GraphData } from '../scripts/graph-helpers';
import '../styles/quartz/graph.css';

// 动态导入 ForceGraph2D，避免 SSR 时访问 window
let ForceGraph2D: any = null;
if (typeof window !== 'undefined') {
  import('react-force-graph-2d').then((mod) => {
    ForceGraph2D = mod.default;
  });
}

interface LocalGraphProps {
  articleId: number;
  height?: number;
  depth?: number; // 显示多少层关系，默认 1
}

export default function LocalGraph({
  articleId,
  height = 250,
  depth = 1,
}: LocalGraphProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [graphReady, setGraphReady] = useState(false);
  const graphRef = useRef<any>();
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 动态加载依赖
    Promise.all([
      import('../scripts/graph-helpers'),
      import('react-force-graph-2d')
    ]).then(([helpers, forceGraphModule]) => {
      ForceGraph2D = forceGraphModule.default;
      
      const { fetchGraphData, filterGraphByDepth, isDarkMode } = helpers;
      
      // 初始化
      setDarkMode(isDarkMode());

      // 监听主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
      };
      mediaQuery.addEventListener('change', handleThemeChange);

      // 获取完整图谱数据并过滤
      fetchGraphData()
        .then(data => {
          // 过滤出当前文章相关的节点
          const filteredData = filterGraphByDepth(data, articleId, depth);
          setGraphData(filteredData);
          setLoading(false);
          setGraphReady(true);
        })
        .catch(err => {
          console.error('Error fetching local graph data:', err);
          setError(err.message);
          setLoading(false);
        });

      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
      };
    });
  }, [articleId, depth]);

  useEffect(() => {
    // 当数据加载完成后，自动缩放到合适大小
    if (!loading && graphData.nodes.length > 0 && graphRef.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 20);
      }, 500);
    }
  }, [loading, graphData]);

  const handleNodeClick = (node: any) => {
    if (typeof window === 'undefined') return;
    const slug = node.slug || node.id;
    window.location.href = `/articles/${slug}`;
  };

  const handleNodeHover = (node: any) => {
    const highlights = new Set();
    const linkHighlights = new Set();
    
    if (node) {
      highlights.add(node.id);
      
      // 高亮相连的节点和链接
      graphData.links.forEach(link => {
        if (link.source === node.id || (typeof link.source === 'object' && (link.source as any).id === node.id)) {
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          highlights.add(targetId);
          linkHighlights.add(`${node.id}-${targetId}`);
        }
        if (link.target === node.id || (typeof link.target === 'object' && (link.target as any).id === node.id)) {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          highlights.add(sourceId);
          linkHighlights.add(`${sourceId}-${node.id}`);
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
        <h3>局部图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)',
            fontSize: '0.875rem'
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
        <h3>局部图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)',
            fontSize: '0.875rem',
            padding: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="graph">
        <h3>局部图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)',
            gap: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            <p>暂无相关文章</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              使用 [[双向链接]] 语法链接到其他文章
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!ForceGraph2D || !graphReady) {
    return (
      <div className="graph">
        <h3>局部图谱</h3>
        <div className="graph-outer" style={{ height: `${height}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'var(--gray)',
            fontSize: '0.875rem'
          }}>
            初始化...
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = darkMode ? '#7b97aa' : '#284b63';
  const secondaryColor = darkMode ? '#646464' : '#b8b8b8';
  const linkColorValue = darkMode ? '#393639' : '#e5e5e5';
  const currentColor = darkMode ? '#db8b00' : '#f39c12'; // 当前节点高亮色

  return (
    <div className="graph">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <h3 style={{ margin: 0 }}>局部图谱</h3>
        <a 
          href="/graph" 
          style={{ 
            fontSize: '0.75rem', 
            color: 'var(--secondary)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px',
            border: '1px solid var(--lightgray)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--highlight)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          🌐 完整图谱
        </a>
      </div>
      <div className="graph-outer" style={{ height: `${height}px` }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="title"
          nodeRelSize={5}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.title || node.text || String(node.id);
            const fontSize = 10 / globalScale;
            const isHighlight = highlightNodes.has(node.id);
            const isHover = hoverNode?.id === node.id;
            const isCurrent = node.id === articleId;
            
            ctx.font = `${isHover ? 'bold' : 'normal'} ${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth + fontSize * 0.8, fontSize * 1.4];

            // 绘制节点圆圈
            ctx.beginPath();
            const nodeSize = isCurrent ? 6 : 4;
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
            
            // 节点颜色
            if (isCurrent) {
              ctx.fillStyle = currentColor;
            } else if (isHover) {
              ctx.fillStyle = primaryColor;
            } else if (isHighlight) {
              ctx.fillStyle = primaryColor;
            } else {
              ctx.fillStyle = secondaryColor;
            }
            ctx.fill();
            
            // 显示标签（在局部图谱中总是显示）
            if (isHighlight || isHover || isCurrent || globalScale > 0.8) {
              // 绘制标签背景
              ctx.fillStyle = isCurrent
                ? `${currentColor}f0`
                : isHover 
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
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const linkId = `${sourceId}-${targetId}`;
            return highlightLinks.has(linkId) ? primaryColor : linkColorValue;
          }}
          linkWidth={(link: any) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const linkId = `${sourceId}-${targetId}`;
            return highlightLinks.has(linkId) ? 2 : 1;
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={(link: any) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const linkId = `${sourceId}-${targetId}`;
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
      
      <div style={{
        marginTop: '0.5rem',
        fontSize: '0.75rem',
        color: 'var(--gray)',
        textAlign: 'center'
      }}>
        {graphData.nodes.length} 篇文章 · {graphData.links.length} 个链接
      </div>
    </div>
  );
}

