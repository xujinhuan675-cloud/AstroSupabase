/**
 * Quartz Graph 渲染脚本（适配版）
 * 适配 AstroSupabase 的路径和导航系统
 */

import type { ContentDetails } from '../../../types/graph-quartz';
import type { D3Config } from '../../../types/graph-quartz';
import * as d3 from 'd3';
import type {
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3';
import { Text, Graphics, Application, Container, Circle } from 'pixi.js';
import { Group as TweenGroup, Tween as Tweened } from '@tweenjs/tween.js';
import { simplifySlug, resolveRelative } from '../../../lib/quartz-path-utils';

// 工具函数
function removeAllChildren(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

type GraphicsInfo = {
  color: string;
  gfx: Graphics;
  alpha: number;
  active: boolean;
};

type NodeData = {
  id: string;
  text: string;
  tags: string[];
} & d3.SimulationNodeDatum;

type SimpleLinkData = {
  source: string;
  target: string;
};

type LinkData = {
  source: NodeData;
  target: NodeData;
} & d3.SimulationLinkDatum<NodeData>;

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData;
};

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData;
  label: Text;
};

const localStorageKey = 'graph-visited';
function getVisited(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? '[]'));
  } catch {
    return new Set();
  }
}

function addToVisited(slug: string) {
  const visited = getVisited();
  visited.add(slug);
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]));
}

type TweenNode = {
  update: (time: number) => void;
  stop: () => void;
};

/**
 * 从 API 获取内容索引数据
 */
async function fetchContentIndex(): Promise<Record<string, ContentDetails>> {
  try {
    const response = await fetch('/api/content-index.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch content index: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching content index:', error);
    return {};
  }
}

/**
 * 渲染图谱
 * @param graph 容器元素
 * @param fullSlug 当前文章的 slug
 * @returns 清理函数
 */
export async function initGraph(
  graph: HTMLElement,
  fullSlug: string
): Promise<(() => void) | undefined> {
  const slug = simplifySlug(fullSlug);
  const visited = getVisited();
  removeAllChildren(graph);

  // 获取配置
  let config: D3Config;
  try {
    config = JSON.parse(graph.dataset['cfg'] || '{}') as D3Config;
  } catch {
    console.error('Failed to parse graph config');
    return;
  }

  const {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
  } = config;

  // 获取数据
  const contentIndex = await fetchContentIndex();
  const data: Map<string, ContentDetails> = new Map(
    Object.entries<ContentDetails>(contentIndex).map(([k, v]) => [simplifySlug(k), v])
  );

  const links: SimpleLinkData[] = [];
  const tags: string[] = [];
  const validLinks = new Set(data.keys());

  // 构建链接和标签
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? [];

    for (const dest of outgoing) {
      const destSlug = simplifySlug(dest);
      if (validLinks.has(destSlug)) {
        links.push({ source: source, target: destSlug });
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(`tags/${tag}`));

      tags.push(...localTags.filter((tag) => !tags.includes(tag)));

      for (const tag of localTags) {
        links.push({ source: source, target: tag });
      }
    }
  }

  // 计算邻域（按深度过滤）
  const neighbourhood = new Set<string>();
  const wl: (string | '__SENTINEL')[] = [slug, '__SENTINEL'];
  if (depth >= 0) {
    let currentDepth = depth;
    while (currentDepth >= 0 && wl.length > 0) {
      const cur = wl.shift()!;
      if (cur === '__SENTINEL') {
        currentDepth--;
        if (currentDepth >= 0) {
          wl.push('__SENTINEL');
        }
      } else {
        neighbourhood.add(cur);
        const outgoing = links.filter((l) => l.source === cur);
        const incoming = links.filter((l) => l.target === cur);
        wl.push(
          ...outgoing.map((l) => l.target),
          ...incoming.map((l) => l.source)
        );
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id));
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag));
  }

  // 构建节点数据
  const nodes = [...neighbourhood].map((url) => {
    const text = url.startsWith('tags/')
      ? '#' + url.substring(5)
      : data.get(url)?.title ?? url;
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    };
  });

  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  };

  const width = graph.offsetWidth || 800;
  const height = Math.max(graph.offsetHeight, 250);

  // D3 力导向布局
  const simulation = d3.forceSimulation<NodeData>(graphData.nodes)
    .force('charge', d3.forceManyBody().strength(-100 * repelForce))
    .force('center', d3.forceCenter().strength(centerForce))
    .force('link', d3.forceLink(graphData.links).distance(linkDistance))
    // 进一步增强碰撞检测：增加50%的缓冲距离，并增加迭代次数以更好地避免重叠
    .force('collide', d3.forceCollide<NodeData>((n) => nodeRadius(n) * 1.5).iterations(7));

  const radius = (Math.min(width, height) / 2) * 0.8;
  if (enableRadial) {
    simulation.force('radial', d3.forceRadial(radius).strength(0.2));
  }

  // 获取 CSS 变量
  const cssVars = [
    '--secondary',
    '--tertiary',
    '--gray',
    '--light',
    '--lightgray',
    '--dark',
    '--darkgray',
    '--bodyFont',
  ] as const;

  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
      return acc;
    },
    {} as Record<(typeof cssVars)[number], string>
  );

  // 节点颜色计算
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug;
    if (isCurrent) {
      return computedStyleMap['--secondary'] || '#5b8a72';
    } else if (visited.has(d.id) || d.id.startsWith('tags/')) {
      return computedStyleMap['--tertiary'] || '#8b6f56';
    } else {
      return computedStyleMap['--gray'] || '#a8a8a8';
    }
  };

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id
    ).length;
    // 增加基础半径和缩放因子，使节点更明显
    return 4 + Math.sqrt(numLinks) * 1.2;
  }

  let hoveredNodeId: string | null = null;
  let hoveredNeighbours: Set<string> = new Set();
  const linkRenderData: LinkRenderData[] = [];
  const nodeRenderData: NodeRenderData[] = [];

  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId;

    if (newHoveredId === null) {
      hoveredNeighbours = new Set();
      for (const n of nodeRenderData) {
        n.active = false;
      }
      for (const l of linkRenderData) {
        l.active = false;
      }
    } else {
      hoveredNeighbours = new Set();
      for (const l of linkRenderData) {
        const linkData = l.simulationData;
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id);
          hoveredNeighbours.add(linkData.target.id);
        }
        l.active =
          linkData.source.id === newHoveredId || linkData.target.id === newHoveredId;
      }
      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id);
      }
    }
  }

  let dragStartTime = 0;
  let dragging = false;

  // 渲染函数
  function renderLinks() {
    tweens.get('link')?.stop();
    const tweenGroup = new TweenGroup();

    for (const l of linkRenderData) {
      let alpha = 1;
      if (hoveredNodeId) {
        alpha = l.active ? 1 : 0.2;
      }
      l.color = l.active
        ? computedStyleMap['--gray'] || '#999'
        : computedStyleMap['--lightgray'] || '#d4d4d4';
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200));
    }

    tweenGroup.getAll().forEach((tw) => tw.start());
    tweens.set('link', {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop());
      },
    });
  }

  function renderLabels() {
    tweens.get('label')?.stop();
    const tweenGroup = new TweenGroup();

    const defaultScale = 1 / scale;
    const activeScale = defaultScale * 1.1;
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id;
      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100
          )
        );
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100
          )
        );
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start());
    tweens.set('label', {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop());
      },
    });
  }

  function renderNodes() {
    tweens.get('hover')?.stop();
    const tweenGroup = new TweenGroup();
    for (const n of nodeRenderData) {
      let alpha = 1;
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2;
      }
      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200));
    }
    tweenGroup.getAll().forEach((tw) => tw.start());
    tweens.set('hover', {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop());
      },
    });
  }

  function renderPixiFromD3() {
    renderNodes();
    renderLinks();
    renderLabels();
  }

  const tweens = new Map<string, TweenNode>();
  tweens.forEach((tween) => tween.stop());
  tweens.clear();

  // 初始化 PixiJS
  const app = new Application() as any;
  try {
    await app.init({
      width,
      height,
      antialias: true,
      autoStart: false,
      autoDensity: true,
      backgroundAlpha: 0,
      preference: 'webgpu',
      resolution: window.devicePixelRatio,
      eventMode: 'static',
    });
  } catch (error) {
    console.error('Failed to initialize PixiJS:', error);
    return;
  }

  graph.appendChild(app.canvas);

  const stage = app.stage;
  stage.interactive = false;

  const labelsContainer = new Container({ zIndex: 3, isRenderGroup: true } as any);
  const nodesContainer = new Container({ zIndex: 2, isRenderGroup: true } as any);
  const linkContainer = new Container({ zIndex: 1, isRenderGroup: true } as any);
  stage.addChild(nodesContainer, labelsContainer, linkContainer);

  // 创建节点
  for (const n of graphData.nodes) {
    const nodeId = n.id;

    const label = new Text({
      interactive: false,
      eventMode: 'none',
      text: n.text,
      alpha: 0.9, // 设置初始透明度，让标签可见
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 16, // 调整为 16，标签文字大小适中
        fill: computedStyleMap['--dark'] || '#2d2d2d',
        fontFamily: computedStyleMap['--bodyFont'] || 'Sans-Serif',
      },
      resolution: window.devicePixelRatio * 4,
    } as any);
    label.scale.set(1 / scale);

    let oldLabelOpacity = 0;
    const isTagNode = nodeId.startsWith('tags/');
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: 'static',
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: 'pointer',
    } as any);
    
    (gfx as any).circle(0, 0, nodeRadius(n));
    (gfx as any).fill({ color: isTagNode ? computedStyleMap['--light'] || '#f5f5f5' : color(n) });
    
    gfx
      .on('pointerover', (e: any) => {
        updateHoverInfo(e.target.label);
        oldLabelOpacity = label.alpha;
        if (!dragging) {
          renderPixiFromD3();
        }
      })
      .on('pointerleave', () => {
        updateHoverInfo(null);
        label.alpha = oldLabelOpacity;
        if (!dragging) {
          renderPixiFromD3();
        }
      });

    if (isTagNode) {
      (gfx as any).stroke({ width: 2, color: computedStyleMap['--tertiary'] || '#8b6f56' });
    }

    nodesContainer.addChild(gfx);
    labelsContainer.addChild(label);

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    };

    nodeRenderData.push(nodeRenderDatum);
  }

  // 创建链接
  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: 'none' } as any);
    linkContainer.addChild(gfx);

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap['--lightgray'] || '#d4d4d4',
      alpha: 1,
      active: false,
    };

    linkRenderData.push(linkRenderDatum);
  }

  let currentTransform = d3.zoomIdentity;

  // 节点点击处理函数
  const handleNodeClick = (nodeId: string) => {
    if (!nodeId) {
      return;
    }
    
    // 处理标签节点：跳转到标签页
    if (nodeId.startsWith('tags/')) {
      // 提取标签名（去掉 "tags/" 前缀）
      const tagName = nodeId.substring(5); // "tags/技术" -> "技术"
      // 构建标签页URL（需要对标签名进行URL编码）
      const targetUrl = `/tags/${encodeURIComponent(tagName)}`;
      console.log('Navigating to tag page:', targetUrl, 'tag:', tagName);
      window.location.href = targetUrl;
      return;
    }
    
    // 处理文章节点：跳转到文章页
    const nodeSlug = simplifySlug(nodeId);
    
    // 从 contentIndex 中查找对应的节点详情，获取 ID
    const nodeDetails = data.get(nodeSlug);
    if (nodeDetails && nodeDetails.id) {
      // 使用 ID 进行路由跳转（AstroSupabase 使用数字 ID 作为路由参数）
      const targetUrl = `/articles/${nodeDetails.id}`;
      console.log('Navigating to:', targetUrl, 'from node:', nodeId, 'slug:', nodeSlug);
      addToVisited(nodeSlug);
      window.location.href = targetUrl;
    } else {
      // 降级方案：如果找不到 ID，使用原来的 slug 方式
      addToVisited(nodeSlug);
      const targetUrl = resolveRelative(fullSlug, nodeSlug);
      console.warn('Node ID not found, using slug fallback:', targetUrl, 'from node:', nodeId);
      window.location.href = targetUrl;
    }
  };

  // 为所有节点添加点击事件（使用 PixiJS 事件，不依赖 D3）
  for (const node of nodeRenderData) {
    node.gfx.on('pointerdown', () => {
      dragStartTime = Date.now();
    });
    
    node.gfx.on('pointerup', () => {
      // 如果按下和抬起之间的时间很短，认为是点击
      if (Date.now() - dragStartTime < 300) {
        handleNodeClick(node.simulationData.id);
      }
    });
  }

  // 节点拖拽（仅拖拽，不处理点击）
  if (enableDrag) {
    d3.select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      d3.drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on('start', function dragstarted(event) {
          if (!event.subject) return;
          if (!event.active) simulation.alphaTarget(1).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
          (event.subject as any).__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          };
          dragging = true;
        })
        .on('drag', function dragged(event) {
          if (!event.subject) return;
          const initPos = (event.subject as any).__initialDragPos;
          event.subject.fx = initPos.fx + (event.x - initPos.x) / currentTransform.k;
          event.subject.fy = initPos.fy + (event.y - initPos.y) / currentTransform.k;
        })
        .on('end', function dragended(event) {
          if (!event.subject) return;
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
          dragging = false;
        })
    );
  }

  // 缩放
  if (enableZoom) {
    d3.select<HTMLCanvasElement, NodeData>(app.canvas).call(
      d3.zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 4])
        .on('zoom', ({ transform }) => {
          currentTransform = transform;
          stage.scale.set(transform.k, transform.k);
          stage.position.set(transform.x, transform.y);

          const scale = transform.k * opacityScale;
          // 修改透明度计算：在默认缩放级别（1.0）时也显示标签，最小透明度为 0.8
          // 放大时透明度逐渐增加到 1.0，缩小到 0.5 以下时才开始淡出
          let scaleOpacity = Math.min(Math.max((scale - 0.5) / 2.5, 0.8), 1.0);
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label);

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label as any)) {
              (label as any).alpha = scaleOpacity;
            }
          }
        })
    );
  }

  // 初始化标签透明度（确保默认缩放级别下标签可见）
  // 无论是否启用缩放，都要确保标签在初始状态下可见
  const defaultScale = 1.0 * opacityScale;
  const defaultOpacity = enableZoom 
    ? Math.min(Math.max((defaultScale - 0.5) / 2.5, 0.8), 1.0)
    : 0.9; // 未启用缩放时使用固定透明度
  for (const label of labelsContainer.children) {
    (label as any).alpha = defaultOpacity;
  }

  // 动画循环
  let stopAnimation = false;
  function animate(time: number) {
    if (stopAnimation) return;
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData;
      if (!x || !y) continue;
      n.gfx.position.set(x + width / 2, y + height / 2);
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2);
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData;
      l.gfx.clear();
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2);
      l.gfx.lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2);
      (l.gfx as any).stroke({ alpha: l.alpha, width: 1, color: l.color });
    }

    tweens.forEach((t) => t.update(time));
    app.renderer.render(stage);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // 返回清理函数
  return () => {
    stopAnimation = true;
    tweens.forEach((t) => t.stop());
    tweens.clear();
    try {
      app.destroy(true);
    } catch (error) {
      console.error('Error destroying PixiJS app:', error);
    }
  };
}
