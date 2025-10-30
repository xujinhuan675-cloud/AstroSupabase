/**
 * Graph 辅助函数
 * 简化版的 Quartz Graph 功能
 */

export interface GraphNode {
  id: string | number;
  title: string;
  slug: string;
  tags?: string[];
}

export interface GraphLink {
  source: string | number;
  target: string | number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * 获取图谱数据
 */
export async function fetchGraphData(): Promise<GraphData> {
  try {
    const response = await fetch('/api/graph-data');
    if (!response.ok) {
      throw new Error('Failed to fetch graph data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return { nodes: [], links: [] };
  }
}

/**
 * 过滤图谱数据（按深度）
 */
export function filterGraphByDepth(
  data: GraphData,
  centerNodeId: string | number,
  depth: number
): GraphData {
  if (depth < 0) {
    // 显示所有节点
    return data;
  }

  const visited = new Set<string | number>();
  const queue: Array<{ id: string | number; depth: number }> = [
    { id: centerNodeId, depth: 0 }
  ];

  // BFS 查找邻居节点
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.depth > depth) continue;
    if (visited.has(current.id)) continue;
    
    visited.add(current.id);

    if (current.depth < depth) {
      // 查找相邻节点
      const neighbors = data.links
        .filter(link => 
          link.source === current.id || link.target === current.id
        )
        .map(link => 
          link.source === current.id ? link.target : link.source
        );

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, depth: current.depth + 1 });
        }
      }
    }
  }

  return {
    nodes: data.nodes.filter(node => visited.has(node.id)),
    links: data.links.filter(link => 
      visited.has(link.source) && visited.has(link.target)
    )
  };
}

/**
 * 计算节点度数（连接数）
 */
export function getNodeDegree(
  nodeId: string | number,
  links: GraphLink[]
): number {
  return links.filter(link => 
    link.source === nodeId || link.target === nodeId
  ).length;
}

/**
 * 获取节点颜色（基于访问状态或度数）
 */
export function getNodeColor(
  node: GraphNode,
  visitedNodes: Set<string>,
  isDarkMode: boolean = false
): string {
  const visited = visitedNodes.has(node.slug);
  
  if (isDarkMode) {
    return visited ? '#7b97aa' : '#646464';
  } else {
    return visited ? '#284b63' : '#b8b8b8';
  }
}

/**
 * 获取链接颜色
 */
export function getLinkColor(isDarkMode: boolean = false): string {
  return isDarkMode ? '#393639' : '#e5e5e5';
}

/**
 * 保存访问的节点到 localStorage
 */
export function saveVisitedNode(slug: string) {
  const visited = getVisitedNodes();
  visited.add(slug);
  localStorage.setItem('graph-visited', JSON.stringify([...visited]));
}

/**
 * 获取访问过的节点
 */
export function getVisitedNodes(): Set<string> {
  try {
    const data = localStorage.getItem('graph-visited');
    return new Set(data ? JSON.parse(data) : []);
  } catch {
    return new Set();
  }
}

/**
 * 检测是否为暗色模式
 */
export function isDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

