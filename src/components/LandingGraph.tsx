/**
 * Landing Page 图谱组件
 * 显示全局知识图谱，点击节点跳转到对应文章
 */

import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  title: string;
  href?: string;
  radius: number;
  group?: string;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function LandingGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载图谱数据
    fetch('/api/graph-data')
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current || graphData.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 清空容器
    d3.select(container).selectAll('*').remove();

    const highlightColor = 'hsl(258, 88%, 66%)';
    const linkColor = '#AAAAB3';
    const labelColor = '#fff';

    const links = graphData.links.map(d => ({ ...d }));
    const nodes = graphData.nodes.map(d => ({ ...d }));

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(50)
          .strength(0.1)
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('collide', d3.forceCollide((d: any) => d.radius + 12))
      .force('radial', d3.forceRadial(300))
      .force('center', d3.forceCenter(0, 0));

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    svg.append('defs').append('filter').attr('id', 'shadow').html(`
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.4"/>
    `);

    svg.append('defs').append('filter').attr('id', 'glow').html(`
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feFlood flood-color="${highlightColor}" flood-opacity="1"/>
      <feComposite in2="coloredBlur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    `);

    const svgContainer = svg.append('g').attr('filter', 'url(#shadow)');

    const zoom = d3.zoom().on('zoom', (event) => {
      svgContainer.attr('transform', event.transform);
      const scale = event.transform.k;
      labels.style('opacity', scale > 0.5 ? 1 : 0);
    });

    svg.call(zoom as any);

    const link = svgContainer
      .append('g')
      .attr('stroke', linkColor)
      .attr('stroke-opacity', 0.15)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1);

    let wasDragged = false;
    const nodeGroup = svgContainer
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(
        d3
          .drag()
          .on('start', function (event: any) {
            wasDragged = false;
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on('drag', function (event) {
            wasDragged = true;
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on('end', function (event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }) as any
      )
      .on('click', (event, d: any) => {
        if (!wasDragged) {
          const href = d.href ?? `/articles/${d.id}`;
          window.location.href = href;
        }
      });

    const neighbors = new Map<string, Set<string>>();

    for (const link of links) {
      const src = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const tgt = typeof link.target === 'object' ? (link.target as any).id : link.target;

      if (!neighbors.has(src)) neighbors.set(src, new Set());
      if (!neighbors.has(tgt)) neighbors.set(tgt, new Set());

      neighbors.get(src)!.add(tgt);
      neighbors.get(tgt)!.add(src);
    }

    nodeGroup
      .on('mouseover', function (event, d: any) {
        const connected = neighbors.get(d.id) ?? new Set();
        connected.add(d.id);

        link
          .transition()
          .duration(150)
          .attr('stroke', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? highlightColor : linkColor
          )
          .attr('stroke-opacity', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 0.9 : 0.05
          );

        nodeGroup
          .selectAll('circle')
          .attr('filter', (n: any) => (n.id === d.id ? 'url(#glow)' : null))
          .attr('fill-opacity', (n: any) => (connected.has(n.id) ? 1 : 0.5))
          .attr('fill', (n: any) => {
            if (n.id === d.id) return highlightColor;
            return linkColor;
          });

        labels.attr('display', (l: any) => (connected.has(l.id) ? 'block' : 'none'));
      })
      .on('mouseout', function () {
        link
          .transition()
          .duration(150)
          .attr('stroke', linkColor)
          .attr('stroke-opacity', 0.15);

        nodeGroup
          .selectAll('circle')
          .attr('fill', linkColor)
          .attr('fill-opacity', 1)
          .attr('filter', null);

        labels.attr('display', 'block');
      });

    const node = nodeGroup
      .append('circle')
      .attr('r', (d: any) => d.radius)
      .attr('cursor', 'pointer')
      .attr('fill-opacity', 1)
      .attr('fill', linkColor);

    node.append('title').text((d: any) => d.title ?? d.id);

    const labels = nodeGroup
      .append('text')
      .text((d: any) => d.title ?? d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => d.radius + 10)
      .style('font-size', '10px')
      .style('fill', labelColor)
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // 预热模拟
    for (let i = 0; i < 300; ++i) simulation.tick();

    // 适配到视图
    fitToGraph();

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function fitToGraph() {
      const bounds = getGraphBounds();
      const dx = bounds.x1 - bounds.x0;
      const dy = bounds.y1 - bounds.y0;
      const cx = (bounds.x0 + bounds.x1) / 2;
      const cy = (bounds.y0 + bounds.y1) / 2;

      const scale = 0.9 / Math.max(dx / width, dy / height);

      const x = -cx * scale;
      const y = -cy * scale;

      svg
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity.scale(scale).translate(x, y));
    }

    function getGraphBounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of nodes as any[]) {
        if (!isNaN(n.x) && !isNaN(n.y)) {
          x0 = Math.min(x0, n.x);
          y0 = Math.min(y0, n.y);
          x1 = Math.max(x1, n.x);
          y1 = Math.max(y1, n.y);
        }
      }
      return { x0, y0, x1, y1 };
    }

    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
    };
  }, [loading, graphData]);

  if (loading) {
    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

