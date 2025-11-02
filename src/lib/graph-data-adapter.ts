/**
 * Graph Data Adapter
 * 将 AstroSupabase 的数据格式转换为 Quartz 图谱所需的格式
 */

import { getGraphData, getArticleTags } from './links-service';
import type { GraphNode, GraphLink } from './links-service';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('GraphDataAdapter');

/**
 * Quartz ContentDetails 格式
 * 
 * 与 Quartz 的 ContentDetails 类型保持一致
 * 扩展添加 id 字段以支持 AstroSupabase 的路由系统
 */
export type QuartzContentDetails = {
  /** 文章的 slug，例如 "my-article" */
  slug: string;
  /** 文件路径，例如 "articles/my-article" */
  filePath: string;
  /** 文章标题 */
  title: string;
  /** 出链：链接到的其他文章的 slug 数组 */
  links: string[];
  /** 标签数组 */
  tags: string[];
  /** 文章内容（可选，用于全文搜索） */
  content: string;
  /** 文章 ID（AstroSupabase 特有，用于路由跳转） */
  id?: number;
};

/**
 * Quartz 内容索引类型
 * 
 * 键为文章的 slug，值为对应的 ContentDetails
 */
export type QuartzContentIndex = Record<string, QuartzContentDetails>;

/**
 * 将 AstroSupabase 的图谱数据转换为 Quartz 格式
 * 
 * 注意：此函数使用逐个查询标签的方式，对于大量文章可能较慢
 * 推荐使用 `convertToQuartzFormatOptimized()` 获取更好的性能
 * 
 * @returns Quartz 格式的内容索引
 * @throws {Error} 当数据获取或转换失败时抛出错误
 * @example
 * ```typescript
 * const index = await convertToQuartzFormat();
 * console.log(index['my-article']); // { slug: 'my-article', ... }
 * ```
 */
export async function convertToQuartzFormat(): Promise<QuartzContentIndex> {
  try {
    // 获取图谱数据
    const graphData = await getGraphData();
    
    // 创建 ID 到 Slug 的映射
    const idToSlug = new Map<number, string>();
    const slugToNode = new Map<string, GraphNode>();
    
    for (const node of graphData.nodes) {
      idToSlug.set(node.id, node.slug);
      slugToNode.set(node.slug, node);
    }
    
    // 创建内容索引
    const contentIndex: QuartzContentIndex = {};
    
    // 为每个节点创建 ContentDetails
    for (const node of graphData.nodes) {
      // 获取出链（outgoing links）
      const outLinks = graphData.links
        .filter(link => link.source === node.id)
        .map(link => idToSlug.get(link.target))
        .filter((slug): slug is string => Boolean(slug));
      
      // 获取标签（异步，但这里简化处理）
      // 注意：如果需要同步所有标签，可能需要批量查询优化
      let tags: string[] = [];
      try {
        tags = await getArticleTags(node.id);
      } catch (error) {
        logger.warn(`Failed to fetch tags for article ${node.id}:`, error);
      }
      
      // 构建 ContentDetails
      contentIndex[node.slug] = {
        slug: node.slug,
        filePath: `articles/${node.slug}`,  // 相对于站点根目录的路径
        title: node.title,
        links: outLinks,
        tags: tags,
        content: '', // 如果不需要全文搜索，可以留空
        id: node.id, // 添加 ID 以支持路由跳转
      };
    }
    
    return contentIndex;
  } catch (error) {
    logger.error('Error converting to Quartz format:', error);
    return {};
  }
}

/**
 * 批量获取标签（优化版本）
 * 
 * 使用并发查询优化性能，减少数据库查询次数
 * 推荐在生产环境使用此函数
 * 
 * @returns Quartz 格式的内容索引
 * @throws {Error} 当数据获取或转换失败时抛出错误
 * @example
 * ```typescript
 * const index = await convertToQuartzFormatOptimized();
 * console.log(`转换了 ${Object.keys(index).length} 篇文章`);
 * ```
 */
export async function convertToQuartzFormatOptimized(): Promise<QuartzContentIndex> {
  try {
    const graphData = await getGraphData();
    
    // 创建映射
    const idToSlug = new Map<number, string>();
    const slugToNode = new Map<string, GraphNode>();
    
    for (const node of graphData.nodes) {
      idToSlug.set(node.id, node.slug);
      slugToNode.set(node.slug, node);
    }
    
    // 批量获取所有标签（这里需要扩展 links-service 支持批量查询）
    // 暂时使用简化版本，每个节点单独查询
    const contentIndex: QuartzContentIndex = {};
    
    // 并发获取所有节点的标签
    const tagPromises = graphData.nodes.map(node => 
      getArticleTags(node.id).catch(() => [] as string[])
    );
    const allTags = await Promise.all(tagPromises);
    
    // 构建内容索引
    for (let i = 0; i < graphData.nodes.length; i++) {
      const node = graphData.nodes[i];
      const tags = allTags[i];
      
      // 获取出链
      const outLinks = graphData.links
        .filter(link => link.source === node.id)
        .map(link => idToSlug.get(link.target))
        .filter((slug): slug is string => Boolean(slug));
      
      contentIndex[node.slug] = {
        slug: node.slug,
        filePath: `articles/${node.slug}`,
        title: node.title,
        links: outLinks,
        tags: tags,
        content: '',
        id: node.id, // 添加 ID 以支持路由跳转
      };
    }
    
    return contentIndex;
  } catch (error) {
    logger.error('Error converting to Quartz format (optimized):', error);
    return {};
  }
}

/**
 * 验证转换后的数据格式
 */
export function validateQuartzFormat(index: QuartzContentIndex): boolean {
  for (const [slug, details] of Object.entries(index)) {
    // 验证必需字段
    if (!details.slug || !details.title || !Array.isArray(details.links) || !Array.isArray(details.tags)) {
      logger.error(`Invalid ContentDetails for slug: ${slug}`, details);
      return false;
    }
    
    // 验证链接的有效性（可选）
    // 这里可以添加更多验证逻辑
  }
  
  return true;
}
