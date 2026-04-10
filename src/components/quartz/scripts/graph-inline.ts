/**
 * Quartz Graph 渲染脚本（适配版）
 * 适配 AstroSupabase 的路径和导航系统
 * 
 * 性能优化：
 * 1. D3 按需导入 - 只导入需要的模块，减少 ~150KB
 * 2. 数据缓存 - 避免重复 fetch
 * 3. 动画优化 - 静止时降低帧率
 * 4. 节点数量限制 - 防止大图谱卡顿
 */

import type { ContentDetails } from '../../../types/graph-quartz';
import type { D3Config } from '../../../types/graph-quartz';

// D3 按需导入 - 只导入需要的模块（减少约 150KB）
import { 
  forceSimulation, 
  forceManyBody, 
  forceCenter, 
  forceLink, 
  forceCollide, 
  forceRadial,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum 
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { drag } from 'd3-drag';

import { Text, Graphics, Application, Container, Circle } from 'pixi.js';
import { Group as TweenGroup, Tween as Tweened } from '@tweenjs/tween.js';
import { simplifySlug, resolveRelative } from '../../../lib/quartz-path-utils';

// 数据缓存 - 避免重复 fetch
let cachedContentIndex: Record<string, ContentDetails> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存
let shouldTryStaticContentIndex = !import.meta.env.DEV;

// 最大节点数限制 - 防止大图谱卡顿
const MAX_NODES = 200;

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
} & SimulationNodeDatum;

type SimpleLinkData = {
  source: string;
  target: string;
};

type LinkData = {
  source: NodeData;
  target: NodeData;
} & SimulationLinkDatum<NodeData>;

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
 * 从静态文件或 API 获取内容索引数据（带缓存）
 * 优先使用构建时生成的静态文件，回退到动态 API
 */
async function fetchContentIndex(): Promise<Record<string, ContentDetails>> {
  // 检查缓存是否有效
  const now = Date.now();
  if (cachedContentIndex && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedContentIndex;
  }

  try {
    // 生产环境优先尝试静态文件；若 404，后续会记忆并直接走 API，避免反复红色请求
    if (shouldTryStaticContentIndex) {
      const staticResponse = await fetch('/content-index.json');
      if (staticResponse.ok) {
        const data = await staticResponse.json();
        cachedContentIndex = data;
        cacheTimestamp = now;
        return data;
      }

      if (staticResponse.status === 404) {
        shouldTryStaticContentIndex = false;
      }
    }
    // 回退到动态 API
    const response = await fetch('/api/content-index.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch content index: ${response.status}`);
    }
    const data = await response.json();
    cachedContentIndex = data;
    cacheTimestamp = now;
    return data;
  } catch (error) {
    console.error('Error fetching content index:', error);
    return cachedContentIndex || {};
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

  // 获取配置（提供默认值，防止配置为空导致的问题）
  const defaultConfig: D3Config = {
    drag: true,
    zoom: true,
    depth: 1,
    scale: 1.1,
    repelForce: 1.5,
    centerForce: 0.3,
    linkDistance: 45,
    fontSize: 0.75,
    opacityScale: 1,
    removeTags: [],
    showTags: true,
    defaultLinkOpacity: 0,
    autoCenterCurrentNode: true,
    focusOnHover: false,
    enableRadial: false,
  };

  let config: D3Config;
  try {
    const datasetConfig = graph.dataset['cfg'];
    if (datasetConfig) {
      const parsed = JSON.parse(datasetConfig) as Partial<D3Config>;
      config = { ...defaultConfig, ...parsed };
    } else {
      // 如果 dataset 为空，使用默认配置
      config = defaultConfig;
    }
  } catch (error) {
    console.error('Failed to parse graph config:', error);
    // 使用默认配置而不是直接返回
    config = defaultConfig;
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
    showLabelsOnDesktop,
    labelDisplayMode,
    defaultVisibleLabelCount,
    defaultLinkOpacity,
    autoCenterCurrentNode,
    focusOnHover,
    enableRadial,
  } = config;

  const isDesktopViewport =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches;
  const resolvedLabelDisplayMode =
    labelDisplayMode ?? (showLabelsOnDesktop ? 'all' : 'hover');
  const persistentLabelMode =
    resolvedLabelDisplayMode === 'all'
      ? 'all'
      : isDesktopViewport
        ? resolvedLabelDisplayMode
        : 'hover';
  const baseVisibleLabelCount = Math.max(0, defaultVisibleLabelCount ?? 12);
  const restingLinkOpacity = Math.max(0, Math.min(1, defaultLinkOpacity ?? 0));

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
  const hasCurrentSlug = slug.length > 0 && data.has(slug);
  const currentNodeId = hasCurrentSlug ? slug : null;
  const wl: (string | '__SENTINEL')[] = hasCurrentSlug ? [slug, '__SENTINEL'] : [];

  if (depth >= 0 && hasCurrentSlug) {
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
    // depth < 0 或缺少当前 slug 时，显示全图
    validLinks.forEach((id) => neighbourhood.add(id));
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag));
  }
  
  // 再次确保当前 slug 在邻域中（防止被过滤掉）
  if (currentNodeId && !neighbourhood.has(currentNodeId)) {
    neighbourhood.add(currentNodeId);
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

  // 过滤链接，确保源和目标都在节点列表中
  const filteredLinks = links.filter(
    (l) => neighbourhood.has(l.source) && neighbourhood.has(l.target)
  );

  // 构建链接数据，确保节点存在
  const graphLinks: LinkData[] = filteredLinks
    .map((l) => {
      const sourceNode = nodes.find((n) => n.id === l.source);
      const targetNode = nodes.find((n) => n.id === l.target);
      if (sourceNode && targetNode) {
        return {
          source: sourceNode,
          target: targetNode,
        };
      }
      return null;
    })
    .filter((l): l is LinkData => l !== null);

  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: graphLinks,
  };

  const nodeDegreeMap = new Map<string, number>();
  for (const node of graphData.nodes) {
    nodeDegreeMap.set(node.id, 0);
  }
  for (const link of graphData.links) {
    nodeDegreeMap.set(link.source.id, (nodeDegreeMap.get(link.source.id) ?? 0) + 1);
    nodeDegreeMap.set(link.target.id, (nodeDegreeMap.get(link.target.id) ?? 0) + 1);
  }

  const labelPriorityOrder = [...graphData.nodes]
    .sort((a, b) => {
      const score = (node: NodeData) => {
        const degree = nodeDegreeMap.get(node.id) ?? 0;
        const visitedBoost = visited.has(node.id) ? 10 : 0;
        const currentBoost = currentNodeId !== null && node.id === currentNodeId ? 100 : 0;
        const tagPenalty = node.id.startsWith('tags/') ? 8 : 0;
        const longTitlePenalty = Math.max(node.text.length - 10, 0) * 0.2;
        return currentBoost + degree * 12 + visitedBoost - tagPenalty - longTitlePenalty;
      };

      return score(b) - score(a);
    })
    .map((node) => node.id);
  const labelPriorityRank = new Map(
    labelPriorityOrder.map((nodeId, index) => [nodeId, index] as const)
  );
  const emphasizedLabelCount = Math.max(4, Math.ceil(baseVisibleLabelCount / 2));

  function getPriorityVisibleLabelCount(zoomLevel: number) {
    const zoomBoost = Math.max(0, zoomLevel - 1);
    const extraLabels = Math.floor(zoomBoost * 12);
    return Math.min(labelPriorityOrder.length, baseVisibleLabelCount + extraLabels);
  }

  function getPersistentLabelIds(zoomLevel: number) {
    if (persistentLabelMode === 'all') {
      return new Set(graphData.nodes.map((node) => node.id));
    }

    if (persistentLabelMode === 'priority') {
      return new Set(labelPriorityOrder.slice(0, getPriorityVisibleLabelCount(zoomLevel)));
    }

    return new Set<string>();
  }

  // 验证图谱数据
  if (nodes.length === 0) {
    console.warn('Graph has no nodes to display. Content index might be empty or slug not found.');
    // 至少显示当前节点（如果数据中存在）
    if (currentNodeId && data.has(currentNodeId)) {
      const currentNodeData = data.get(currentNodeId)!;
      graphData.nodes = [{
        id: currentNodeId,
        text: currentNodeData.title || currentNodeId,
        tags: currentNodeData.tags ?? [],
      }];
      graphData.links = [];
    }
  }

  const width = graph.offsetWidth || 800;
  const height = Math.max(graph.offsetHeight, 250);

  // 节点数量限制 - 防止大图谱卡顿
  if (graphData.nodes.length > MAX_NODES) {
    console.warn(`Graph has ${graphData.nodes.length} nodes, limiting to ${MAX_NODES}`);
    const connectedNodeIds = new Set<string>();
    if (currentNodeId) {
      graphData.links.forEach(l => {
        if (l.source.id === currentNodeId || l.target.id === currentNodeId) {
          connectedNodeIds.add(l.source.id);
          connectedNodeIds.add(l.target.id);
        }
      });
    }

    // 优先保留当前节点及其直连节点
    const priorityNodeIds = new Set<string>();
    if (currentNodeId) {
      priorityNodeIds.add(currentNodeId);
      connectedNodeIds.forEach((id) => priorityNodeIds.add(id));
    }

    const priorityNodes = graphData.nodes.filter(n => priorityNodeIds.has(n.id));
    const otherNodes = graphData.nodes.filter(n => !priorityNodeIds.has(n.id))
      .slice(0, MAX_NODES - priorityNodes.length);
    
    graphData.nodes = [...priorityNodes, ...otherNodes];
    
    // 重新过滤链接
    const nodeIds = new Set(graphData.nodes.map(n => n.id));
    graphData.links = graphData.links.filter(l => 
      nodeIds.has(l.source.id) && nodeIds.has(l.target.id)
    );
  }

  // D3 力导向布局 - 使用按需导入的函数
  const simulation = forceSimulation<NodeData>(graphData.nodes)
    .force('charge', forceManyBody().strength(-100 * repelForce))
    .force('center', forceCenter().strength(centerForce))
    .force('link', forceLink(graphData.links).distance(linkDistance))
    // 进一步增强碰撞检测：增加50%的缓冲距离，并增加迭代次数以更好地避免重叠
    .force('collide', forceCollide<NodeData>((n) => nodeRadius(n) * 1.5).iterations(7));

  const radius = (Math.min(width, height) / 2) * 0.8;
  if (enableRadial) {
    simulation.force('radial', forceRadial(radius).strength(0.2));
  }

  // 动画优化：监听模拟结束事件
  let isSimulationActive = true;
  let shouldCenterOnSimulationEnd = false;
  simulation.on('end', () => {
    isSimulationActive = false;
    shouldCenterOnSimulationEnd = autoCenterCurrentNode;
  });

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
  const useLightGraphTheme = graph.closest('.landing-container') !== null;
  const labelFillColor = useLightGraphTheme
    ? '#f8fafc'
    : computedStyleMap['--dark'] || '#1f2937';
  const defaultLinkColor = useLightGraphTheme
    ? '#cbd5e1'
    : computedStyleMap['--gray'] || '#94a3b8';
  const activeLinkColor = useLightGraphTheme
    ? '#ffffff'
    : computedStyleMap['--secondary'] || '#a855f7';

  // 节点颜色计算
  const color = (d: NodeData) => {
    const isCurrent = currentNodeId !== null && d.id === currentNodeId;
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

  function isCurrentNode(nodeId: string) {
    return currentNodeId !== null && nodeId === currentNodeId;
  }

  function formatLabelText(text: string, isTagNode: boolean) {
    const maxLength = isTagNode ? 12 : 18;
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trim()}…`;
  }

  function getRestingLabelScale(nodeId: string) {
    const rank = labelPriorityRank.get(nodeId);
    const defaultScale = 1 / scale;

    if (rank !== undefined && rank < emphasizedLabelCount) {
      return defaultScale * 1.05;
    }

    return defaultScale;
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
      let alpha = 0; // 默认隐藏
      if (hoveredNodeId && l.active) {
        alpha = 1; // 悬浮时显示相关连线
      }
      l.color = l.active
        ? '#ffffff' // 白色连线
        : computedStyleMap['--lightgray'] || '#d4d4d4';
      alpha = hoveredNodeId
        ? l.active
          ? 1
          : focusOnHover
            ? Math.min(restingLinkOpacity, 0.12)
            : restingLinkOpacity
        : restingLinkOpacity;
      l.color = l.active ? activeLinkColor : defaultLinkColor;
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

    const persistentLabelIds = getPersistentLabelIds(currentTransform.k || 1);
    const persistentAlpha = persistentLabelMode === 'priority' ? 0.86 : 0.92;
    const mutedPersistentAlpha = focusOnHover ? 0.16 : persistentAlpha;
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id;
      const isHoveredNode = hoveredNodeId === nodeId;
      const isRelatedNode = hoveredNodeId !== null && n.active;
      const isPersistentLabel = persistentLabelIds.has(nodeId);
      const restingScale = getRestingLabelScale(nodeId);
      const hoverScale = restingScale * 1.08;
      let targetAlpha = 0;
      let targetScale = restingScale;

      if (isHoveredNode) {
        targetAlpha = 1;
        targetScale = hoverScale;
      } else if (isRelatedNode) {
        targetAlpha = 0.96;
      } else if (isPersistentLabel) {
        targetAlpha = hoveredNodeId !== null ? mutedPersistentAlpha : persistentAlpha;
      }

      tweenGroup.add(
        new Tweened<Text>(n.label).to(
          {
            alpha: targetAlpha,
            scale: { x: targetScale, y: targetScale },
          },
          120
        )
      );

      /*
      if (isHoveredNode) {
        // 悬浮节点的标签：放大显示
        targetAlpha = 1;
        targetScale = hoverScale;
      } else if (isRelatedNode) {
        // 默认显示或相关节点的标签：正常大小显示
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 0.96,
              scale: { x: restingScale, y: restingScale },
            },
            100
          )
        );
      } else {
        // 其他标签隐藏
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 0,
              scale: { x: defaultScale, y: defaultScale },
            },
            100
          )
        );
      }
      */
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
      const nodeId = n.simulationData.id;
      
      // 清除之前的绘制
      n.gfx.clear();
      
      if (hoveredNodeId === nodeId) {
        // 悬浮节点：实心紫色
        (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
        (n.gfx as any).fill({ color: 0xa855f7, alpha: 1 }); // 紫色 #a855f7
        tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha: 1 }, 200));
      } else if (isCurrentNode(nodeId)) {
        (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
        (n.gfx as any).fill({ color: 0xa855f7, alpha: 1 });
        tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha: 1 }, 200));
      } else if (hoveredNodeId !== null && n.active) {
        // 相关节点：空心紫色
        (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
        (n.gfx as any).stroke({ width: 2, color: 0xa855f7, alpha: 1 }); // 紫色边框
        tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha: 1 }, 200));
      } else {
        // 默认状态：半透明灰色（闪烁效果由动画循环处理）
        const passiveAlpha =
          hoveredNodeId !== null && focusOnHover
            ? Math.min(n.alpha, 0.12)
            : n.alpha;
        (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
        (n.gfx as any).fill({ color: 0x808080, alpha: passiveAlpha });
        tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha: passiveAlpha }, 200));
      }
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

  // 初始化 PixiJS（带 WebGL 降级支持）
  const app = new Application() as any;
  try {
    await app.init({
      width,
      height,
      antialias: true,
      autoStart: false,
      autoDensity: true,
      backgroundAlpha: 0,
      preference: 'webgpu', // 优先使用 WebGPU
      fallback: 'webgl', // 降级到 WebGL
      resolution: window.devicePixelRatio,
      eventMode: 'static',
    });
  } catch (error) {
    console.error('Failed to initialize PixiJS with WebGPU, trying WebGL:', error);
    try {
      // 如果 WebGPU 失败，尝试 WebGL
      await app.init({
        width,
        height,
        antialias: true,
        autoStart: false,
        autoDensity: true,
        backgroundAlpha: 0,
        preference: 'webgl',
        resolution: window.devicePixelRatio,
        eventMode: 'static',
      });
    } catch (fallbackError) {
      console.error('Failed to initialize PixiJS with WebGL:', fallbackError);
      return;
    }
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
    const isTagNode = nodeId.startsWith('tags/');
    const priorityRank = labelPriorityRank.get(nodeId) ?? Number.POSITIVE_INFINITY;
    const labelSizeBoost =
      priorityRank < 4 ? 1.12 : priorityRank < baseVisibleLabelCount ? 1.04 : 1;

    const label = new Text({
      interactive: false,
      eventMode: 'none',
      text: formatLabelText(n.text, isTagNode),
      alpha: 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        /*
        fontSize: fontSize * 16, // 调整为 16，标签文字大小适中
        fill: '#ffffff', // 白色标签
        */
        fontSize: fontSize * 16 * labelSizeBoost,
        fill: labelFillColor,
        fontFamily: computedStyleMap['--bodyFont'] || 'Sans-Serif',
      },
      resolution: window.devicePixelRatio * 4,
    } as any);
    label.scale.set(getRestingLabelScale(nodeId));

    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: 'static',
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: 'pointer',
    } as any);
    
    // 默认状态：绘制半透明的圆点（用于闪烁效果）
    (gfx as any).circle(0, 0, nodeRadius(n));
    (gfx as any).fill({ color: 0x808080, alpha: 0.3 }); // 深灰色，低透明度
    
    gfx
      .on('pointerover', (e: any) => {
        updateHoverInfo(e.target.label);
        if (!dragging) {
          renderPixiFromD3();
        }
      })
      .on('pointerleave', () => {
        updateHoverInfo(null);
        if (!dragging) {
          renderPixiFromD3();
        }
      });

    nodesContainer.addChild(gfx);
    labelsContainer.addChild(label);

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 0.3, // 默认低透明度
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
      alpha: 0, // 默认隐藏连线
      active: false,
    };

    linkRenderDatum.color = defaultLinkColor;
    linkRenderDatum.alpha = restingLinkOpacity;
    linkRenderData.push(linkRenderDatum);
  }

  let currentTransform = zoomIdentity;
  let hasUserInteracted = false;
  let hasCenteredCurrentNode = false;
  let zoomBehavior: ZoomBehavior<HTMLCanvasElement, NodeData> | null = null;

  const applyViewportTransform = (transform: ZoomTransform) => {
    currentTransform = transform;
    stage.scale.set(transform.k, transform.k);
    stage.position.set(transform.x, transform.y);
  };

  const buildCenterTransformForCurrentNode = (k: number): ZoomTransform | null => {
    if (!currentNodeId) return null;
    const currentNode = graphData.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return null;
    if (currentNode.x == null || currentNode.y == null) return null;

    const nodeX = currentNode.x + width / 2;
    const nodeY = currentNode.y + height / 2;

    return zoomIdentity
      .translate(width / 2 - nodeX * k, height / 2 - nodeY * k)
      .scale(k);
  };

  const centerCurrentNodeInView = (): boolean => {
    const targetScale = currentTransform.k || 1;
    const targetTransform = buildCenterTransformForCurrentNode(targetScale);
    if (!targetTransform) return false;

    if (enableZoom && zoomBehavior) {
      select<HTMLCanvasElement, NodeData>(app.canvas).call(
        zoomBehavior.transform,
        targetTransform
      );
    } else {
      applyViewportTransform(targetTransform);
    }
    return true;
  };

  renderPixiFromD3();

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

  // 节点拖拽（仅拖拽，不处理点击）- 使用按需导入的函数
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on('start', function dragstarted(event) {
          if (!event.subject) return;
          hasUserInteracted = true;
          if (!event.active) simulation.alphaTarget(1).restart();
          isSimulationActive = true; // 拖拽时重新激活动画
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

  // 缩放 - 使用按需导入的函数
  if (enableZoom) {
    zoomBehavior = zoom<HTMLCanvasElement, NodeData>()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        if (event.sourceEvent) {
          hasUserInteracted = true;
        }

        const { transform } = event;
        applyViewportTransform(transform);

        if (!dragging) {
          renderLabels();
        }
        
        // 缩放时保持默认标签可见，或在悬浮时仅显示相关标签
        /*
        for (const n of nodeRenderData) {
          const nodeId = n.simulationData.id;
          if (shouldShowLabelsByDefault) {
            n.label.alpha = 1;
          } else if (hoveredNodeId !== null) {
            n.label.alpha = (nodeId === hoveredNodeId || n.active) ? 1 : 0;
          } else {
            n.label.alpha = 0;
          }
        }
        */
      });

    select<HTMLCanvasElement, NodeData>(app.canvas).call(zoomBehavior);
  }

  if (autoCenterCurrentNode && !hasCenteredCurrentNode) {
    hasCenteredCurrentNode = centerCurrentNodeInView();
  }
  /*

  // 初始化标签透明度：桌面首页默认显示，其余场景保留悬浮显示
  const defaultOpacity = shouldShowLabelsByDefault ? 1 : 0;
  /*
  for (const label of labelsContainer.children) {
    (label as any).alpha = defaultOpacity;
  }
  */

  // 动画循环 - 优化：静止时降低帧率
  let stopAnimation = false;
  let lastRenderTime = 0;
  const IDLE_FRAME_INTERVAL = 100; // 静止时每 100ms 渲染一次
  
  // 闪烁动画参数
  const TWINKLE_SPEED = 0.002; // 闪烁速度
  const TWINKLE_MIN_ALPHA = 0.2; // 最小透明度
  const TWINKLE_MAX_ALPHA = 0.6; // 最大透明度
  
  function animate(time: number) {
    if (stopAnimation) return;

    if (autoCenterCurrentNode && !hasUserInteracted && !hasCenteredCurrentNode) {
      hasCenteredCurrentNode = centerCurrentNodeInView();
    }

    if (autoCenterCurrentNode && !hasUserInteracted && shouldCenterOnSimulationEnd) {
      shouldCenterOnSimulationEnd = false;
      hasCenteredCurrentNode = centerCurrentNodeInView() || hasCenteredCurrentNode;
    }
    
    // 静止时降低帧率以节省 CPU
    if (!isSimulationActive && !dragging && !hoveredNodeId) {
      if (time - lastRenderTime < IDLE_FRAME_INTERVAL) {
        requestAnimationFrame(animate);
        return;
      }
    }
    lastRenderTime = time;
    
    // 更新节点位置
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData;
      if (x == null || y == null) continue;
      n.gfx.position.set(x + width / 2, y + height / 2);
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2);
      }
      
      // 闪烁动画：只在默认状态下（没有悬浮）应用
      if (!hoveredNodeId) {
        if (isCurrentNode(n.simulationData.id)) {
          n.alpha = 1;
          n.gfx.clear();
          (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
          (n.gfx as any).fill({ color: 0xa855f7, alpha: 1 });
          continue;
        }

        // 使用正弦波产生平滑的闪烁效果，每个节点有不同的相位偏移
        const nodeIndex = nodeRenderData.indexOf(n);
        const phase = nodeIndex * 0.5; // 相位偏移，避免所有节点同步闪烁
        const twinkleAlpha = TWINKLE_MIN_ALPHA + 
          (TWINKLE_MAX_ALPHA - TWINKLE_MIN_ALPHA) * 
          (0.5 + 0.5 * Math.sin(time * TWINKLE_SPEED + phase));
        n.alpha = twinkleAlpha;
        
        // 重新绘制节点以应用新的透明度
        n.gfx.clear();
        (n.gfx as any).circle(0, 0, nodeRadius(n.simulationData));
        (n.gfx as any).fill({ color: 0x808080, alpha: twinkleAlpha });
      }
    }

    // 更新连线位置
    for (const l of linkRenderData) {
      const linkData = l.simulationData;
      l.gfx.clear();
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2);
      l.gfx.lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2);
      const lineWidth = hoveredNodeId && l.active ? 1.7 : restingLinkOpacity > 0 ? 1.35 : 1;
      (l.gfx as any).stroke({ alpha: l.alpha, width: lineWidth, color: l.color });
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
